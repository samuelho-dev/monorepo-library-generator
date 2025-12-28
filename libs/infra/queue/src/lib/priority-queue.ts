import type { Option, Scope } from 'effect'
import { Effect, Option as O, Order, Ref, Schema, STM, TPriorityQueue } from 'effect'
import type { ParseError } from 'effect/ParseResult'

/**
 * Priority Queue
 *
 * In-memory priority queue using Effect's TPriorityQueue (STM-based).
 * Higher priority values are dequeued first.
 *
 * This matches the pattern of QueueService.Memory using Effect.Queue.
 *
 * @module @samuelho-dev/infra-queue/priority-queue
 */

// ============================================================================
// Priority Queue Handle Interface
// ============================================================================

/**
 * Priority queue handle - higher priority values processed first
 *
 * Unified interface for both Memory (TPriorityQueue) and Redis (Sorted Sets) layers.
 * This allows easy layer swapping for testing vs production.
 *
 * @typeParam T - Item type
 * @typeParam E - Error type (typically ParseError for validation)
 */
export interface PriorityQueueHandle<T, E = never> {
  /**
   * Add an item to the queue with a priority
   * Higher priority values are dequeued first
   * @returns true if offered successfully, false if shutdown
   */
  readonly offer: (item: T, priority: number) => Effect.Effect<boolean, E>

  /**
   * Take the highest priority item from the queue
   * Blocks until an item is available
   */
  readonly take: Effect.Effect<T, E>

  /**
   * Peek at the highest priority item without removing it
   * @returns Some(item) if queue is not empty, None otherwise
   */
  readonly peek: Effect.Effect<Option.Option<T>>

  /**
   * Get the current queue size
   */
  readonly size: Effect.Effect<number>

  /**
   * Shutdown the queue
   * After shutdown, offer() returns false and take() dies
   */
  readonly shutdown: Effect.Effect<void>

  /**
   * Check if the queue is shutdown
   */
  readonly isShutdown: Effect.Effect<boolean>
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Wrapper type for items with priority (for TPriorityQueue ordering)
 */
interface PrioritizedItem<T> {
  readonly item: T
  readonly priority: number
}

/**
 * Order for TPriorityQueue - higher priority values come first
 * Uses reverse order so higher numbers are dequeued first
 */
const priorityOrder = <T>(): Order.Order<PrioritizedItem<T>> =>
  Order.mapInput(Order.reverse(Order.number), (p: PrioritizedItem<T>) => p.priority)

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an in-memory priority queue using Effect's TPriorityQueue
 *
 * Uses STM for safe concurrent access. Higher priority values are dequeued first.
 * This matches the pattern of QueueService.Memory using Effect.Queue.
 *
 * Features:
 * - Schema validation on offer
 * - Blocking take with STM retry semantics
 * - Safe concurrent access via STM
 * - Graceful shutdown support
 *
 * @example
 * ```typescript
 * const queue = yield* makePriorityQueue(Schema.String)
 *
 * // Add items with priorities
 * yield* queue.offer('low', 1)
 * yield* queue.offer('high', 10)
 * yield* queue.offer('medium', 5)
 *
 * // Take in priority order (highest first)
 * const first = yield* queue.take  // 'high'
 * const second = yield* queue.take // 'medium'
 * const third = yield* queue.take  // 'low'
 * ```
 */
export const makePriorityQueue = <T, I>(
  schema: Schema.Schema<T, I, never>
): Effect.Effect<PriorityQueueHandle<T, ParseError>, never, Scope.Scope> =>
  Effect.gen(function* () {
    const validate = Schema.validate(schema)
    const queue = yield* TPriorityQueue.empty<PrioritizedItem<T>>(priorityOrder<T>()).pipe(
      STM.commit
    )
    const shutdownFlag = yield* Ref.make(false)

    return {
      offer: (item: T, priority: number) =>
        Effect.gen(function* () {
          const isShutdown = yield* Ref.get(shutdownFlag)
          if (isShutdown) return false

          const validated = yield* validate(item)
          yield* TPriorityQueue.offer(queue, { item: validated, priority }).pipe(STM.commit)
          return true
        }),

      take: Effect.gen(function* () {
        const isShutdown = yield* Ref.get(shutdownFlag)
        if (isShutdown) return yield* Effect.die('Queue is shutdown')

        // TPriorityQueue.take blocks until item available (STM retry semantics)
        const { item } = yield* TPriorityQueue.take(queue).pipe(STM.commit)
        return item
      }),

      peek: TPriorityQueue.peekOption(queue).pipe(
        STM.commit,
        Effect.map((opt) => O.map(opt, ({ item }) => item))
      ),

      size: TPriorityQueue.size(queue).pipe(STM.commit),

      shutdown: Ref.set(shutdownFlag, true),

      isShutdown: Ref.get(shutdownFlag)
    }
  })
