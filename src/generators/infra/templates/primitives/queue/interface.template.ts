/**
 * Queue Service Interface Template
 *
 * Generates proper Effect.Queue wrapper with bounded/unbounded queues.
 * Supports Redis backing for distributed queuing.
 *
 * @module monorepo-library-generator/infra-templates/primitives/queue
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder'
import type { InfraTemplateOptions } from '../../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config'

/**
 * Generate queue service interface using Effect.Queue
 */
export function generateQueueInterfaceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Queue infrastructure using Effect.Queue primitive.

Provides:
- Bounded queues with backpressure
- Unbounded queues for unlimited capacity
- Dropping/Sliding strategies for overflow handling
- Scoped lifecycle management

Effect.Queue Features:
- Fiber-safe concurrent access
- Automatic backpressure
- Graceful shutdown support
- Type-safe message handling`,
    module: `${scope}/infra-${fileName}/service`,
    see: ['EFFECT_PATTERNS.md for queue patterns']
  })

  // Import order: effect first, then external packages
  // Chunk and Option are only used in type annotations, so import as type-only
  builder.addImports([
    {
      from: 'effect',
      imports: ['Context', 'Effect', 'Layer', 'Queue', 'Schema']
    },
    {
      from: 'effect',
      imports: ['Chunk', 'Option', 'Scope'],
      isTypeOnly: true
    },
    {
      from: 'effect/ParseResult',
      imports: ['ParseError'],
      isTypeOnly: true
    }
  ])
  builder.addImports([{ from: `${scope}/env`, imports: ['env'] }])

  builder.addSectionComment('Queue Service Interface (Effect.Queue Wrapper)')

  builder.addRaw(`/**
 * Queue handle for bounded queue operations
 *
 * @typeParam T - Item type
 * @typeParam E - Error type from serialization (ParseError)
 * @typeParam ProviderE - Error type from provider operations (defaults to never for in-memory)
 */
export interface BoundedQueueHandle<T, E = never, ProviderE = never> {
  /**
   * Offer an item to the queue
   * Suspends if queue is full (backpressure)
   *
   * @returns true if offered successfully
   */
  readonly offer: (item: T) => Effect.Effect<boolean, E | ProviderE>

  /**
   * Take an item from the queue
   * Suspends if queue is empty
   */
  readonly take: Effect.Effect<T, E | ProviderE>

  /**
   * Take up to N items from the queue
   * Returns immediately with available items (may be less than N)
   */
  readonly takeUpTo: (n: number) => Effect.Effect<Chunk.Chunk<T>, E | ProviderE>

  /**
   * Take all available items from the queue
   * Returns immediately
   */
  readonly takeAll: Effect.Effect<Chunk.Chunk<T>, E | ProviderE>

  /**
   * Poll for an item without blocking
   * Returns None if queue is empty
   */
  readonly poll: Effect.Effect<Option.Option<T>, E | ProviderE>

  /**
   * Get current queue size
   */
  readonly size: Effect.Effect<number, ProviderE>

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
 *
 * @typeParam T - Item type
 * @typeParam E - Error type from serialization (ParseError)
 * @typeParam ProviderE - Error type from provider operations (defaults to never for in-memory)
 */
export interface UnboundedQueueHandle<T, E = never, ProviderE = never> {
  /**
   * Offer an item to the queue
   * Never blocks (unbounded capacity)
   */
  readonly offer: (item: T) => Effect.Effect<boolean, E | ProviderE>

  /**
   * Take an item from the queue
   * Suspends if queue is empty
   */
  readonly take: Effect.Effect<T, E | ProviderE>

  /**
   * Take up to N items from the queue
   */
  readonly takeUpTo: (n: number) => Effect.Effect<Chunk.Chunk<T>, E | ProviderE>

  /**
   * Take all available items from the queue
   */
  readonly takeAll: Effect.Effect<Chunk.Chunk<T>, E | ProviderE>

  /**
   * Get current queue size
   */
  readonly size: Effect.Effect<number, ProviderE>

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
 * ${className} Service
 *
 * Queue infrastructure using Effect.Queue primitive.
 * Provides bounded and unbounded queues with various overflow strategies.
 */
export class ${className}Service extends Context.Tag(
  "${scope}/infra-${fileName}/${className}Service"
)<
  ${className}Service,
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
     * \`\`\`typescript
     * const JobSchema = Schema.Struct({ type: Schema.String, data: Schema.Unknown })
     * const jobQueue = yield* queue.bounded(100, JobSchema)
     *
     * // Producer
     * yield* jobQueue.offer({ type: "send_email", data: emailData })
     *
     * // Consumer
     * const job = yield* jobQueue.take;
     * yield* processJob(job)
     * \`\`\`
     */
    readonly bounded: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I, never>,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T, ParseError>, never, Scope.Scope>

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
     * \`\`\`typescript
     * const EventSchema = Schema.Struct({ type: Schema.String, payload: Schema.Unknown })
     * const eventQueue = yield* queue.unbounded(EventSchema)
     * yield* eventQueue.offer(event)
     * \`\`\`
     */
    readonly unbounded: <T, I = T>(
      schema: Schema.Schema<T, I, never>,
      options?: QueueOptions
    ) => Effect.Effect<UnboundedQueueHandle<T, ParseError>, never, Scope.Scope>

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
     * \`\`\`typescript
     * const MetricSchema = Schema.Struct({ name: Schema.String, value: Schema.Number })
     * const metricsQueue = yield* queue.dropping(1000, MetricSchema)
     * // If queue is full, metrics are dropped (acceptable for non-critical data)
     * yield* metricsQueue.offer(metric)
     * \`\`\`
     */
    readonly dropping: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I, never>,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T, ParseError>, never, Scope.Scope>

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
     * \`\`\`typescript
     * const EventSchema = Schema.Struct({ type: Schema.String, timestamp: Schema.Number })
     * const recentEvents = yield* queue.sliding(100, EventSchema)
     * // Always keeps the 100 most recent events
     * yield* recentEvents.offer(event)
     * \`\`\`
     */
    readonly sliding: <T, I = T>(
      capacity: number,
      schema: Schema.Schema<T, I, never>,
      options?: QueueOptions
    ) => Effect.Effect<BoundedQueueHandle<T, ParseError>, never, Scope.Scope>

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
    bounded: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.bounded<T>(capacity).pipe(Effect.withSpan(\`Queue.bounded(\${queueName})\`))
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    unbounded: <T, I = T>(schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.unbounded<T>().pipe(Effect.withSpan(\`Queue.unbounded(\${queueName})\`))
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.dropping<T>(capacity).pipe(Effect.withSpan(\`Queue.dropping(\${queueName})\`))
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        const queueName = options?.name ?? "anonymous"
        const queue = yield* Queue.sliding<T>(capacity).pipe(Effect.withSpan(\`Queue.sliding(\${queueName})\`))
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
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
  static readonly Test = ${className}Service.Memory

  // ===========================================================================
  // Alias: Live = Memory (default)
  // ===========================================================================

  /**
   * Live Layer - Defaults to Memory layer
   *
   * For Redis-backed distributed queuing, use RedisQueue layer from layers/
   */
  static readonly Live = ${className}Service.Memory

  // ===========================================================================
  // Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Memory with debug logging
   */
  static readonly Dev = Layer.succeed(this, {
    bounded: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[${className}Service] [DEV] Creating bounded queue", { capacity, name: options?.name })
        const queue = yield* Queue.bounded<T>(capacity)
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[${className}Service] [DEV] bounded.offer")
              const validated = yield* validate(item)
              return yield* Queue.offer(queue, validated)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[${className}Service] [DEV] bounded.take")
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

    unbounded: <T, I = T>(schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[${className}Service] [DEV] Creating unbounded queue", { name: options?.name })
        const queue = yield* Queue.unbounded<T>()
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[${className}Service] [DEV] unbounded.offer")
              const validated = yield* validate(item)
              return yield* Queue.offer(queue, validated)
            }),
          take: Effect.gen(function*() {
            yield* Effect.logDebug("[${className}Service] [DEV] unbounded.take")
            return yield* Queue.take(queue)
          }),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue)
        }
      }),

    dropping: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[${className}Service] [DEV] Creating dropping queue", { capacity, name: options?.name })
        const queue = yield* Queue.dropping<T>(capacity)
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
          take: Queue.take(queue),
          takeUpTo: (n: number) => Queue.takeUpTo(queue, n),
          takeAll: Queue.takeAll(queue),
          poll: Queue.poll(queue),
          size: Queue.size(queue),
          shutdown: Queue.shutdown(queue),
          isShutdown: Queue.isShutdown(queue)
        }
      }),

    sliding: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[${className}Service] [DEV] Creating sliding queue", { capacity, name: options?.name })
        const queue = yield* Queue.sliding<T>(capacity)
        const validate = Schema.validate(schema)

        return {
          offer: (item: T) =>
            validate(item).pipe(
              Effect.flatMap((validated) => Queue.offer(queue, validated))
            ),
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
        return ${className}Service.Live
      case "test":
        return ${className}Service.Test
      default:
        // "development" and other environments use Dev
        return ${className}Service.Dev
    }
  })
}
`)

  return builder.toString()
}
