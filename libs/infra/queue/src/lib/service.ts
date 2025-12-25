import { env } from "@samuelho-dev/env"
import { Context, Effect, Layer, Queue } from "effect"
import type { Chunk, Option, Scope } from "effect"

/**
 * Queue Service
 *
 * Queue infrastructure using Effect.Queue primitive.

Provides:
- Bounded queues with backpressure
- Unbounded queues for unlimited capacity
- Dropping/Sliding strategies for overflow handling
- Scoped lifecycle management

Effect.Queue Features:
- Fiber-safe concurrent access
- Automatic backpressure
- Graceful shutdown support
- Type-safe message handling
 *
 * @module @samuelho-dev/infra-queue/service
 * @see EFFECT_PATTERNS.md for queue patterns
 */

// ============================================================================
// Queue Service Interface (Effect.Queue Wrapper)
// ============================================================================

/**
 * Queue handle for bounded queue operations
 */
export interface BoundedQueueHandle<T> {
  /**
   * Offer an item to the queue
   * Suspends if queue is full (backpressure)
   *
   * @returns true if offered successfully
   */
  readonly offer: (item: T) => Effect.Effect<boolean>

  /**
   * Take an item from the queue
   * Suspends if queue is empty
   */
  readonly take: Effect.Effect<T>

  /**
   * Take up to N items from the queue
   * Returns immediately with available items (may be less than N)
   */
  readonly takeUpTo: (n: number) => Effect.Effect<Chunk.Chunk<T>>

  /**
   * Take all available items from the queue
   * Returns immediately
   */
  readonly takeAll: Effect.Effect<Chunk.Chunk<T>>

  /**
   * Poll for an item without blocking
   * Returns None if queue is empty
   */
  readonly poll: Effect.Effect<Option.Option<T>>

  /**
   * Get current queue size
   */
  readonly size: Effect.Effect<number>

  /**
   * Shutdown the queue
   * Interrupts all pending offers and takes
   */
  readonly shutdown: Effect.Effect<void>

  /**
   * Check if queue is shutdown
   */
  readonly isShutdown: Effect.Effect<boolean>
}

/**
 * Queue handle for unbounded queue operations
 */
export interface UnboundedQueueHandle<T> {
  /**
   * Offer an item to the queue
   * Never blocks (unbounded capacity)
   */
  readonly offer: (item: T) => Effect.Effect<boolean>

  /**
   * Take an item from the queue
   * Suspends if queue is empty
   */
  readonly take: Effect.Effect<T>

  /**
   * Take up to N items from the queue
   */
  readonly takeUpTo: (n: number) => Effect.Effect<Chunk.Chunk<T>>

  /**
   * Take all available items from the queue
   */
  readonly takeAll: Effect.Effect<Chunk.Chunk<T>>

  /**
   * Get current queue size
   */
  readonly size: Effect.Effect<number>

  /**
   * Shutdown the queue
   */
  readonly shutdown: Effect.Effect<void>
}

/**
 * Queue options
 */
export interface QueueOptions {
  /**
   * Queue name for identification
   */
  readonly name?: string
}

/**
 * Queue Service
 *
 * Queue infrastructure using Effect.Queue primitive.
 * Provides bounded and unbounded queues with various overflow strategies.
 */
export class QueueService extends Context.Tag(
  "@samuelho-dev/infra-queue/QueueService"
)<
  QueueService,
  {
    /**
     * Create a bounded queue with backpressure
     *
     * When the queue is full, offer() suspends until space is available.
     * Use for controlled concurrency and preventing memory exhaustion.
     *
     * @example
     * ```typescript
     * const jobQueue = yield* queue.bounded<Job>(100);
     *
     * // Producer
     * yield* jobQueue.offer({ type: "send_email", data: emailData });
     *
     * // Consumer
     * const job = yield* jobQueue.take;
     * yield* processJob(job);
     * ```
     */
    readonly bounded: <T>(
      capacity: number,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create an unbounded queue
     *
     * WARNING: No capacity limit. Use with caution to prevent memory exhaustion.
     * Prefer bounded queues for production workloads.
     *
     * @example
     * ```typescript
     * const eventQueue = yield* queue.unbounded<Event>();
     * yield* eventQueue.offer(event);
     * ```
     */
    readonly unbounded: <T>(
      options?: QueueOptions
    ) => Effect.Effect<UnboundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create a dropping queue
     *
     * When the queue is full, new items are silently dropped.
     * Use when it's acceptable to lose messages under load.
     *
     * @example
     * ```typescript
     * const metricsQueue = yield* queue.dropping<Metric>(1000);
     * // If queue is full, metrics are dropped (acceptable for non-critical data)
     * yield* metricsQueue.offer(metric);
     * ```
     */
    readonly dropping: <T>(
      capacity: number,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create a sliding queue
     *
     * When the queue is full, oldest items are removed to make room.
     * Use for "latest N items" patterns.
     *
     * @example
     * ```typescript
     * const recentEvents = yield* queue.sliding<Event>(100);
     * // Always keeps the 100 most recent events
     * yield* recentEvents.offer(event);
     * ```
     */
    readonly sliding: <T>(
      capacity: number,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Health check for monitoring
     */
    readonly healthCheck: () => Effect.Effect<boolean>
  }
>() {
  // ===========================================================================
  // Static Memory Layer (In-Memory Effect.Queue)
  // ===========================================================================

  /**
   * Memory Layer - Pure Effect.Queue implementation
   *
   * Uses Effect's built-in Queue for in-memory queuing.
   * Queues are automatically cleaned up when scope closes.
   */
  static readonly Memory = Layer.succeed(this, {
    bounded: <T>(capacity: number, _options?: QueueOptions) =>
      Effect.gen(function*() {
        const queue = yield* Queue.bounded<T>(capacity)
        // Return object literal - TS infers BoundedQueueHandle<T> from Context.Tag
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    unbounded: <T>(_options?: QueueOptions) =>
      Effect.gen(function*() {
        const queue = yield* Queue.unbounded<T>()
        // Return object literal - TS infers UnboundedQueueHandle<T> from Context.Tag
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T>(capacity: number, _options?: QueueOptions) =>
      Effect.gen(function*() {
        const queue = yield* Queue.dropping<T>(capacity)
        // Return object literal - TS infers BoundedQueueHandle<T> from Context.Tag
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T>(capacity: number, _options?: QueueOptions) =>
      Effect.gen(function*() {
        const queue = yield* Queue.sliding<T>(capacity)
        // Return object literal - TS infers BoundedQueueHandle<T> from Context.Tag
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    healthCheck: () => Effect.succeed(true)
  })

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Same as Memory for testing
   */
  static readonly Test = QueueService.Memory

  // ===========================================================================
  // Alias: Live = Memory (default)
  // ===========================================================================

  /**
   * Live Layer - Defaults to Memory layer
   *
   * For Redis-backed distributed queuing, use RedisQueue layer from layers/
   */
  static readonly Live = QueueService.Memory

  // ===========================================================================
  // Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Memory with debug logging
   */
  static readonly Dev = Layer.succeed(this, {
    bounded: <T>(capacity: number, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating bounded queue", { capacity, name: options?.name })
        const queue = yield* Queue.bounded<T>(capacity)
        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[QueueService] [DEV] bounded.offer")
              return yield* Queue.offer(queue, item)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[QueueService] [DEV] bounded.take")
            return yield* Queue.take(queue)
          }),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    unbounded: <T>(options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating unbounded queue", { name: options?.name })
        const queue = yield* Queue.unbounded<T>()
        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[QueueService] [DEV] unbounded.offer")
              return yield* Queue.offer(queue, item)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[QueueService] [DEV] unbounded.take")
            return yield* Queue.take(queue)
          }),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T>(capacity: number, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating dropping queue", { capacity, name: options?.name })
        const queue = yield* Queue.dropping<T>(capacity)
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T>(capacity: number, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating sliding queue", { capacity, name: options?.name })
        const queue = yield* Queue.sliding<T>(capacity)
        return {
          offer: (item: T) => Queue.offer(queue, item),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    healthCheck: () => Effect.succeed(true)
  })

  // ===========================================================================
  // Auto Layer
  // ===========================================================================

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "production" → Live (Memory)
   * - "development" → Dev (Memory with logging)
   * - "test" → Test (Memory)
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return QueueService.Live
      case "test":
        return QueueService.Test
      default:
        // "development" and other environments use Dev
        return QueueService.Dev
    }
  })
}
