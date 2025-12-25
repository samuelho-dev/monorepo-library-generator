import { env } from "@samuelho-dev/env"
import { Context, Effect, Layer, PubSub, Schema } from "effect"
import type { Queue, Scope } from "effect"
import type { ParseError } from "effect/ParseResult"

/**
 * Pubsub Service
 *
 * PubSub infrastructure using Effect.PubSub primitive.

Provides:
- Topic-based publish/subscribe
- Multiple subscribers per topic
- Bounded capacity with overflow strategies
- Scoped subscription lifecycle

Effect.PubSub Features:
- Broadcast to all subscribers
- Automatic subscriber cleanup
- Fiber-safe concurrent access
- Backpressure handling
 *
 * @module @samuelho-dev/infra-pubsub/service
 * @see EFFECT_PATTERNS.md for pubsub patterns
 */

// ============================================================================
// PubSub Service Interface (Effect.PubSub Wrapper)
// ============================================================================

/**
 * Topic handle for publish/subscribe operations
 *
 * @typeParam T - Message type
 * @typeParam E - Error type (ParseError for schema validation)
 */
export interface TopicHandle<T, E> {
  /**
   * Publish a message to all subscribers
   * Validates message against schema before publishing.
   *
   * @returns true if published to at least one subscriber
   */
  readonly publish: (message: T) => Effect.Effect<boolean, E>

  /**
   * Publish multiple messages
   * Validates each message against schema before publishing.
   */
  readonly publishAll: (messages: Iterable<T>) => Effect.Effect<boolean, E>

  /**
   * Subscribe to receive messages
   *
   * Returns a Queue.Dequeue that receives all published messages.
   * The subscription is automatically cleaned up when the scope closes.
   *
   * IMPORTANT: Subscribe BEFORE publishing to guarantee message receipt.
   */
  readonly subscribe: Effect.Effect<Queue.Dequeue<T>, never, Scope.Scope>

  /**
   * Get current subscriber count
   */
  readonly subscriberCount: Effect.Effect<number>
}

/**
 * Topic options
 */
export interface TopicOptions {
  /**
   * Topic name for identification
   */
  readonly name?: string

  /**
   * Maximum capacity for subscriber queues
   * @default 1000
   */
  readonly capacity?: number
}

/**
 * Pubsub Service
 *
 * PubSub infrastructure using Effect.PubSub primitive.
 * Provides topic-based publish/subscribe with Schema-validated type safety.
 *
 * IMPORTANT: Schema must have no context requirements (R = never) because
 * message decoding occurs in synchronous callbacks that cannot provide
 * Effect context. If your schema has dependencies, resolve them first
 * using Schema.to() or Schema.provide().
 */
export class PubsubService extends Context.Tag(
  "@samuelho-dev/infra-pubsub/PubsubService"
)<
  PubsubService,
  {
    /**
     * Create a typed topic for publishing and subscribing
     *
     * Requires a Schema for compile-time and runtime type safety.
     * Each topic is independent - for shared messaging, use Redis layer.
     *
     * @param name - Topic name for identification
     * @param schema - Schema for message type validation (must have R = never)
     * @param options - Topic configuration
     *
     * @example
     * ```typescript
     * // Define message schema
     * const OrderEventSchema = Schema.Union(
     *   Schema.Struct({ type: Schema.Literal("created"), orderId: Schema.String }),
     *   Schema.Struct({ type: Schema.Literal("paid"), orderId: Schema.String, amount: Schema.Number })
     * );
     * type OrderEvent = Schema.Schema.Type<typeof OrderEventSchema>;
     *
     * // Create topic with schema
     * const orderEvents = yield* pubsub.topic("orders", OrderEventSchema);
     *
     * // Type-safe publish (validated by Schema)
     * yield* orderEvents.publish({ type: "created", orderId: "123" });
     *
     * // Type-safe subscribe
     * const subscription = yield* orderEvents.subscribe;
     * const event = yield* Queue.take(subscription);
     * // event is properly typed as OrderEvent
     * ```
     */
    readonly topic: <A, I>(
      name: string,
      schema: Schema.Schema<A, I, never>,
      options?: TopicOptions
    ) => Effect.Effect<TopicHandle<A, ParseError>>

    /**
     * Create an anonymous topic (not shared)
     *
     * Use for local pub/sub within a single scope.
     *
     * @param schema - Schema for message type validation (must have R = never)
     * @param options - Topic configuration
     */
    readonly createTopic: <A, I>(
      schema: Schema.Schema<A, I, never>,
      options?: TopicOptions
    ) => Effect.Effect<TopicHandle<A, ParseError>, never, Scope.Scope>

    /**
     * Health check for monitoring
     */
    readonly healthCheck: () => Effect.Effect<boolean>
  }
>() {
  // ===========================================================================
  // Static Memory Layer (In-Memory Effect.PubSub)
  // ===========================================================================

  /**
   * Memory Layer - Pure Effect.PubSub implementation
   *
   * Uses Effect's built-in PubSub for in-memory messaging.
   * Each topic() call creates a fresh PubSub - for shared messaging use Redis.
   * Schema validation is performed on publish operations.
   */
  static readonly Memory = Layer.scoped(
    this,
    Effect.gen(function*() {
      const makeTopicHandle = <A, E>(
        pubsub: PubSub.PubSub<A>,
        validate: (message: A) => Effect.Effect<A, E>,
        topicName: string
      ) => ({
        publish: (message: A) =>
          validate(message).pipe(
            Effect.flatMap((validated) => PubSub.publish(pubsub, validated)),
            Effect.withSpan("PubSub.publish", { attributes: { topic: topicName } })
          ),
        publishAll: (messages: Iterable<A>) =>
          Effect.forEach([...messages], validate).pipe(
            Effect.flatMap((validated) => PubSub.publishAll(pubsub, validated)),
            Effect.withSpan("PubSub.publishAll", { attributes: { topic: topicName } })
          ),
        subscribe: PubSub.subscribe(pubsub),
        subscriberCount: Effect.sync(() => 0) // PubSub doesn't expose this directly
      })

      return {
        topic: <A, I>(
          name: string,
          schema: Schema.Schema<A, I, never>,
          options?: TopicOptions
        ) =>
          Effect.gen(function*() {
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* PubSub.bounded<A>(capacity)
            const validate = Schema.validate(schema)
            return makeTopicHandle<A, ParseError>(pubsub, validate, name)
          }),

        createTopic: <A, I>(
          schema: Schema.Schema<A, I, never>,
          options?: TopicOptions
        ) =>
          Effect.gen(function*() {
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* PubSub.bounded<A>(capacity)
            const validate = Schema.validate(schema)
            return makeTopicHandle<A, ParseError>(pubsub, validate, "anonymous")
          }),

        healthCheck: () => Effect.succeed(true)
      }
    })
  )

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Same as Memory for testing
   */
  static readonly Test = PubsubService.Memory

  // ===========================================================================
  // Alias: Live = Memory (default)
  // ===========================================================================

  /**
   * Live Layer - Defaults to Memory layer
   *
   * For Redis-backed distributed pub/sub, use RedisPubSub layer from layers/
   */
  static readonly Live = PubsubService.Memory

  // ===========================================================================
  // Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Memory with debug logging and schema validation
   */
  static readonly Dev = Layer.scoped(
    this,
    Effect.gen(function*() {
      yield* Effect.logDebug("[PubsubService] [DEV] Initializing pubsub service")

      const makeTopicHandle = <A, E>(
        pubsub: PubSub.PubSub<A>,
        validate: (message: A) => Effect.Effect<A, E>,
        topicName: string
      ) => ({
        publish: (message: A) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[PubsubService] [DEV] publish", { topic: topicName })
            const validated = yield* validate(message)
            return yield* PubSub.publish(pubsub, validated)
          }),
        publishAll: (messages: Iterable<A>) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[PubsubService] [DEV] publishAll", { topic: topicName })
            const validated = yield* Effect.forEach([...messages], validate)
            return yield* PubSub.publishAll(pubsub, validated)
          }),
        subscribe: Effect.gen(function*() {
          yield* Effect.logDebug("[PubsubService] [DEV] subscribe", { topic: topicName })
          return yield* PubSub.subscribe(pubsub)
        }),
        subscriberCount: Effect.sync(() => 0)
      })

      return {
        topic: <A, I>(
          name: string,
          schema: Schema.Schema<A, I, never>,
          options?: TopicOptions
        ) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[PubsubService] [DEV] Creating topic", { name })
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* PubSub.bounded<A>(capacity)
            const validate = Schema.validate(schema)
            return makeTopicHandle<A, ParseError>(pubsub, validate, name)
          }),

        createTopic: <A, I>(
          schema: Schema.Schema<A, I, never>,
          options?: TopicOptions
        ) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[PubsubService] [DEV] Creating anonymous topic")
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* PubSub.bounded<A>(capacity)
            const validate = Schema.validate(schema)
            return makeTopicHandle<A, ParseError>(pubsub, validate, "anonymous")
          }),

        healthCheck: () => Effect.succeed(true)
      }
    })
  )

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
        return PubsubService.Live
      case "test":
        return PubsubService.Test
      default:
        return PubsubService.Dev
    }
  })
}

// ============================================================================
// Common PubSub Patterns
// ============================================================================

/**
 * Helper: Create an event bus for domain events
 *
 * @example
 * ```typescript
 * // Define event schema for type safety
 * const OrderEventSchema = Schema.Union(
 *   Schema.Struct({
 *     type: Schema.Literal("created"),
 *     orderId: Schema.String,
 *     userId: Schema.String
 *   }),
 *   Schema.Struct({
 *     type: Schema.Literal("paid"),
 *     orderId: Schema.String,
 *     amount: Schema.Number
 *   }),
 *   Schema.Struct({
 *     type: Schema.Literal("shipped"),
 *     orderId: Schema.String,
 *     trackingNumber: Schema.String
 *   })
 * );
 * type OrderEvent = Schema.Schema.Type<typeof OrderEventSchema>;
 *
 * const program = Effect.gen(function*() {
 *   const pubsub = yield* PubsubService;
 *   // Pass schema for type-safe messaging
 *   const orderEvents = yield* pubsub.topic("order-events", OrderEventSchema);
 *
 *   // Start event processor
 *   yield* Effect.forkScoped(
 *     Effect.gen(function*() {
 *       const subscription = yield* orderEvents.subscribe;
 *
 *       yield* Queue.take(subscription).pipe(
 *         Effect.tap((event) => {
 *           switch (event.type) {
 *             case "created":
 *               return sendWelcomeEmail(event.userId);
 *             case "paid":
 *               return startFulfillment(event.orderId);
 *             case "shipped":
 *               return sendTrackingEmail(event.orderId, event.trackingNumber);
 *           }
 *         }),
 *         Effect.forever
 *       );
 *     })
 *   );
 *
 *   // Type-safe publish (Schema validates at compile time)
 *   yield* orderEvents.publish({ type: "created", orderId: "123", userId: "456" });
 * });
 * ```
 */
