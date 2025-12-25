import { env } from "@samuelho-dev/env"
import { Chunk, Context, Effect, Layer, Option, Queue, Schema } from "effect"
import type { Scope } from "effect"

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
     * @param capacity - Maximum number of items in queue
     * @param schema - Schema for type-safe serialization/deserialization
     * @param options - Optional queue configuration
     *
     * @example
     * ```typescript
     * const JobSchema = Schema.Struct({ type: Schema.String, data: Schema.Unknown })
     * const jobQueue = yield* queue.bounded(100, JobSchema)
     *
     * // Producer
     * yield* jobQueue.offer({ type: "send_email", data: emailData })
     *
     * // Consumer
     * const job = yield* jobQueue.take;
     * yield* processJob(job)
     * ```
     */
    readonly bounded: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I>,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create an unbounded queue
     *
     * WARNING: No capacity limit. Use with caution to prevent memory exhaustion.
     * Prefer bounded queues for production workloads.
     *
     * @param schema - Schema for type-safe serialization/deserialization
     * @param options - Optional queue configuration
     *
     * @example
     * ```typescript
     * const EventSchema = Schema.Struct({ type: Schema.String, payload: Schema.Unknown })
     * const eventQueue = yield* queue.unbounded(EventSchema)
     * yield* eventQueue.offer(event)
     * ```
     */
    readonly unbounded: <T, I = T>(
      schema: Schema.Schema<T, I>,
      options?: QueueOptions
    ) => Effect.Effect<UnboundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create a dropping queue
     *
     * When the queue is full, new items are silently dropped.
     * Use when it's acceptable to lose messages under load.
     *
     * @param capacity - Maximum number of items in queue
     * @param schema - Schema for type-safe serialization/deserialization
     * @param options - Optional queue configuration
     *
     * @example
     * ```typescript
     * const MetricSchema = Schema.Struct({ name: Schema.String, value: Schema.Number })
     * const metricsQueue = yield* queue.dropping(1000, MetricSchema)
     * // If queue is full, metrics are dropped (acceptable for non-critical data)
     * yield* metricsQueue.offer(metric)
     * ```
     */
    readonly dropping: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I>,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T>, never, Scope.Scope>

    /**
     * Create a sliding queue
     *
     * When the queue is full, oldest items are removed to make room.
     * Use for "latest N items" patterns.
     *
     * @param capacity - Maximum number of items in queue
     * @param schema - Schema for type-safe serialization/deserialization
     * @param options - Optional queue configuration
     *
     * @example
     * ```typescript
     * const EventSchema = Schema.Struct({ type: Schema.String, timestamp: Schema.Number })
     * const recentEvents = yield* queue.sliding(100, EventSchema)
     * // Always keeps the 100 most recent events
     * yield* recentEvents.offer(event)
     * ```
     */
    readonly sliding: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I>,
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
    bounded: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.bounded<T>(capacity).pipe(Effect.withSpan(`Queue.bounded(${queueName})`))
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    unbounded: <T, I = T>(schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.unbounded<T>().pipe(Effect.withSpan(`Queue.unbounded(${queueName})`))
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.dropping<T>(capacity).pipe(Effect.withSpan(`Queue.dropping(${queueName})`))
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.sliding<T>(capacity).pipe(Effect.withSpan(`Queue.sliding(${queueName})`))
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
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
    bounded: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating bounded queue", { capacity, name: options?.name })
        const queue = yield* Queue.bounded<T>(capacity)
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[QueueService] [DEV] bounded.offer")
              const validated = yield* encode(item).pipe(Effect.orDie)
              return yield* Queue.offer(queue, validated)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[QueueService] [DEV] bounded.take")
            const item = yield* Queue.take(queue)
            return yield* decode(item).pipe(Effect.orDie)
          }),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    unbounded: <T, I = T>(schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating unbounded queue", { name: options?.name })
        const queue = yield* Queue.unbounded<T>()
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[QueueService] [DEV] unbounded.offer")
              const validated = yield* encode(item).pipe(Effect.orDie)
              return yield* Queue.offer(queue, validated)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[QueueService] [DEV] unbounded.take")
            const item = yield* Queue.take(queue)
            return yield* decode(item).pipe(Effect.orDie)
          }),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating dropping queue", { capacity, name: options?.name })
        const queue = yield* Queue.dropping<T>(capacity)
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T, I = T>(capacity: number, schema: Schema.Schema<T, I>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[QueueService] [DEV] Creating sliding queue", { capacity, name: options?.name })
        const queue = yield* Queue.sliding<T>(capacity)
        const encode = Schema.encode(schema)
        const decode = Schema.decode(schema)

        return {
          offer: (item: T) =>
            encode(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated)),
              Effect.orDie
            ),
          take: Queue.take(queue).pipe(
            Effect.flatMap((item) => decode(item)),
            Effect.orDie
          ),
          takeUpTo: (n: number) =>
            Queue.takeUpTo(queue, n).pipe(
              Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
              Effect.map((arr) => Chunk.fromIterable(arr))
            ),
          takeAll: Queue.takeAll(queue).pipe(
            Effect.flatMap((chunk) => Effect.forEach(chunk, (item) => decode(item).pipe(Effect.orDie))),
            Effect.map((arr) => Chunk.fromIterable(arr))
          ),
          poll: Queue.poll(queue).pipe(
            Effect.flatMap((opt) =>
              Option.match(opt, {
                onNone: () => Effect.succeed(Option.none()),
                onSome: (item) => decode(item).pipe(Effect.map(Option.some), Effect.orDie)
              })
            )
          ),
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
