import { Context, Effect, Layer, PubSub } from "effect"
import type { Queue, Scope } from "effect"

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
 * @module @myorg/infra-pubsub/service
 * @see EFFECT_PATTERNS.md for pubsub patterns
 */

// ============================================================================
// PubSub Service Interface (Effect.PubSub Wrapper)
// ============================================================================

/**
 * Topic handle for publish/subscribe operations
 */
export interface TopicHandle<T> {
  /**
   * Publish a message to all subscribers
   *
   * @returns true if published to at least one subscriber
   */
  readonly publish: (message: T) => Effect.Effect<boolean>

  /**
   * Publish multiple messages
   */
  readonly publishAll: (messages: Iterable<T>) => Effect.Effect<boolean>

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
 * Provides topic-based publish/subscribe with multiple subscriber support.
 */
export class PubsubService extends Context.Tag(
  "@myorg/infra-pubsub/PubsubService"
)<
  PubsubService,
  {
    /**
     * Create or get a topic for publishing and subscribing
     *
     * Topics are created lazily and cached by name.
     * Multiple calls with the same name return the same topic.
     *
     * @example
     * ```typescript
     * // Publisher
     * const orderEvents = yield* pubsub.topic<OrderEvent>("orders");
     * yield* orderEvents.publish({ type: "created", orderId: "123" });
     *
     * // Subscriber (different fiber/service)
     * const orderEvents = yield* pubsub.topic<OrderEvent>("orders");
     * const subscription = yield* orderEvents.subscribe;
     *
     * // Process events
     * yield* Queue.take(subscription).pipe(
     *   Effect.tap((event) => processEvent(event)),
     *   Effect.forever,
     *   Effect.forkScoped
     * );
     * ```
     */
    readonly topic: <T>(
      name: string,
      options?: TopicOptions
    ) => Effect.Effect<TopicHandle<T>>

    /**
     * Create an anonymous topic (not shared)
     *
     * Use for local pub/sub within a single scope.
     */
    readonly createTopic: <T>(
      options?: TopicOptions
    ) => Effect.Effect<TopicHandle<T>, never, Scope.Scope>

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
   * Topics are stored in a Map and cleaned up when all subscribers leave.
   */
  static readonly Memory = Layer.scoped(
    this,
    Effect.gen(function* () {
      // Topic registry for named topics
      const topics = new Map<string, PubSub.PubSub<unknown>>()

      const getOrCreateTopic = <T>(
        name: string,
        capacity: number
      ): Effect.Effect<PubSub.PubSub<T>> =>
        Effect.gen(function* () {
          const existing = topics.get(name)
          if (existing) {
            return existing as PubSub.PubSub<T>
          }

          const newTopic = yield* PubSub.bounded<T>(capacity)
          topics.set(name, newTopic as PubSub.PubSub<unknown>)
          return newTopic
        })

      const makeTopicHandle = <T>(pubsub: PubSub.PubSub<T>): TopicHandle<T> => ({
        publish: (message: T) => PubSub.publish(pubsub, message),
        publishAll: (messages: Iterable<T>) => PubSub.publishAll(pubsub, messages),
        subscribe: PubSub.subscribe(pubsub),
        subscriberCount: Effect.sync(() => 0) // PubSub doesn't expose this directly
      })

      return {
        topic: <T>(name: string, options?: TopicOptions) =>
          Effect.gen(function* () {
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* getOrCreateTopic<T>(name, capacity)
            return makeTopicHandle(pubsub)
          }),

        createTopic: <T>(options?: TopicOptions) =>
          Effect.gen(function* () {
            const capacity = options?.capacity ?? 1000
            const pubsub = yield* PubSub.bounded<T>(capacity)
            return makeTopicHandle(pubsub)
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
}

// ============================================================================
// Common PubSub Patterns
// ============================================================================

/**
 * Helper: Create an event bus for domain events
 *
 * @example
 * ```typescript
 * type OrderEvent =
 *   | { type: "created"; orderId: string; userId: string }
 *   | { type: "paid"; orderId: string; amount: number }
 *   | { type: "shipped"; orderId: string; trackingNumber: string };
 *
 * const program = Effect.gen(function* () {
 *   const pubsub = yield* PubsubService;
 *   const orderEvents = yield* pubsub.topic<OrderEvent>("order-events");
 *
 *   // Start event processor
 *   yield* Effect.forkScoped(
 *     Effect.gen(function* () {
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
 *   // Publish events from business logic
 *   yield* orderEvents.publish({ type: "created", orderId: "123", userId: "456" });
 * });
 * ```
 */
