import type { Fiber } from "effect";
import { Context, Effect, Layer, PubSub, Schema } from "effect";
import type { TopicHandle, TopicOptions } from "../service/service";
import { PubsubService } from "../service/service";

/**
 * Pubsub Redis Layer
 *
 * Redis-backed distributed pub/sub layer.

Architecture:
- Uses Redis Pub/Sub for cross-instance messaging
- Local Effect.PubSub for per-instance fan-out
- Automatic reconnection handling
- Message serialization/deserialization

Use Cases:
- Real-time notifications across services
- Cache invalidation events
- Distributed event broadcasting
 *
 * @module @myorg/infra-pubsub/layers/redis
 * @see EFFECT_PATTERNS.md for pubsub patterns
 */

// ============================================================================
// Redis PubSub Client Context Tag
// ============================================================================

/**
 * Redis pub/sub client interface
 *
 * Note: Redis pub/sub requires separate connections for publish and subscribe.
 */
export interface RedisPubSubClient {
  /**
   * Publish message to channel
   */
  readonly publish: (channel: string, message: string) => Effect.Effect<number>;

  /**
   * Subscribe to channel
   * Calls handler for each message received
   */
  readonly subscribe: (channel: string, handler: (message: string) => void) => Effect.Effect<void>;

  /**
   * Unsubscribe from channel
   */
  readonly unsubscribe: (channel: string) => Effect.Effect<void>;

  /**
   * Ping for health check
   */
  readonly ping: () => Effect.Effect<string>;
}

/**
 * Redis PubSub Client Context Tag
 */
export class RedisPubSubClientTag extends Context.Tag("RedisPubSubClient")<
  RedisPubSubClientTag,
  RedisPubSubClient
>() {}

// ============================================================================
// Redis PubSub Layer
// ============================================================================

/**
 * Redis-backed distributed pub/sub layer
 *
 * Uses Redis Pub/Sub for cross-instance messaging.
 * Each topic creates a local Effect.PubSub that bridges to Redis.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const pubsub = yield* PubsubService;
 *
 *   // On Instance A
 *   const events = yield* pubsub.topic<UserEvent>("user-events");
 *   yield* events.publish({ type: "login", userId: "123" });
 *
 *   // On Instance B (different process)
 *   const events = yield* pubsub.topic<UserEvent>("user-events");
 *   const sub = yield* events.subscribe;
 *   const event = yield* Queue.take(sub); // Receives event from Instance A
 * }).pipe(
 *   Effect.provide(PubsubRedisLayer),
 *   Effect.provide(myRedisPubSubClientLayer)
 * );
 * ```
 */
export const PubsubRedisLayer = Layer.scoped(
  PubsubService,
  Effect.gen(function* () {
    const redis = yield* RedisPubSubClientTag;

    // Track active topics for cleanup
    const activeTopics = new Map<
      string,
      {
        localPubSub: PubSub.PubSub<unknown>;
        subscriberFiber: Fiber.RuntimeFiber<void, never>;
      }
    >();

    // Serialization helpers using Effect Schema
    // Schema.parseJson handles JSON parsing + validation in one step
    // Errors flow through Effect's error channel (no exceptions)
    const JsonValue = Schema.parseJson(Schema.Unknown);
    const encodeJson = Schema.encode(JsonValue);

    const serialize = <T>(value: T): Effect.Effect<string, never, never> =>
      encodeJson(value).pipe(Effect.orDie);

    // Synchronous deserialize for use in callbacks (Redis subscription handlers)
    // Uses Effect.runSync since the Redis handler is synchronous
    const deserializeSync = <T>(data: string): T => {
      const result = Schema.decodeUnknownSync(JsonValue)(data);
      return result as T;
    };

    const makeTopicHandle = <T>(
      localPubSub: PubSub.PubSub<T>,
      channelName: string,
    ): TopicHandle<T> => ({
      publish: (message: T) =>
        Effect.gen(function* () {
          // Publish to Redis (broadcasts to all instances)
          const serialized = yield* serialize(message);
          const count = yield* redis.publish(channelName, serialized);
          return count > 0;
        }),

      publishAll: (messages: Iterable<T>) =>
        Effect.gen(function* () {
          let success = false;
          for (const message of messages) {
            const serialized = yield* serialize(message);
            const count = yield* redis.publish(channelName, serialized);
            if (count > 0) success = true;
          }
          return success;
        }),

      subscribe: PubSub.subscribe(localPubSub),

      subscriberCount: Effect.sync(() => 0), // Would need Redis PUBSUB NUMSUB
    });

    return {
      topic: <T>(name: string, options?: TopicOptions) =>
        Effect.gen(function* () {
          const capacity = options?.capacity ?? 1000;
          // For named topics, return handle without scope requirement
          const existing = activeTopics.get(name);
          if (existing) {
            return makeTopicHandle<T>(existing.localPubSub as PubSub.PubSub<T>, name);
          }

          // Create topic in a detached scope (lives for service lifetime)
          const localPubSub = yield* Effect.sync(() => Effect.runSync(PubSub.bounded<T>(capacity)));

          // Subscribe to Redis in background
          const subscriberFiber = yield* Effect.fork(
            redis.subscribe(name, (message) => {
              const parsed = deserializeSync<T>(message);
              Effect.runFork(PubSub.publish(localPubSub, parsed));
            }),
          );

          activeTopics.set(name, {
            localPubSub: localPubSub as PubSub.PubSub<unknown>,
            subscriberFiber: subscriberFiber as unknown as Fiber.RuntimeFiber<void, never>,
          });

          return makeTopicHandle(localPubSub, name);
        }),

      createTopic: <T>(options?: TopicOptions) =>
        Effect.gen(function* () {
          const capacity = options?.capacity ?? 1000;
          const name = `ephemeral:${crypto.randomUUID()}`;

          const localPubSub = yield* PubSub.bounded<T>(capacity);

          // Subscribe to Redis channel
          yield* Effect.forkScoped(
            redis.subscribe(name, (message) => {
              const parsed = deserializeSync<T>(message);
              Effect.runFork(PubSub.publish(localPubSub, parsed));
            }),
          );

          // Cleanup on scope close
          yield* Effect.addFinalizer(() =>
            redis.unsubscribe(name).pipe(Effect.catchAll(() => Effect.void)),
          );

          return makeTopicHandle(localPubSub, name);
        }),

      healthCheck: () =>
        redis.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("Pubsub.healthCheck"),
        ),
    };
  }),
);

// ============================================================================
// Example: ioredis Integration
// ============================================================================

/**
 * Example: Create Redis PubSub client layer using ioredis
 *
 * @example
 * ```typescript
 * import Redis from "ioredis";
 *
 * const makeRedisPubSubClientLayer = (config: { host: string; port: number }) =>
 *   Layer.scoped(
 *     RedisPubSubClientTag,
 *     Effect.gen(function* () {
 *       // Separate connections for pub and sub (Redis requirement)
 *       const pubClient = yield* Effect.acquireRelease(
 *         Effect.sync(() => new Redis(config)),
 *         (client) => Effect.sync(() => client.disconnect())
 *       );
 *
 *       const subClient = yield* Effect.acquireRelease(
 *         Effect.sync(() => new Redis(config)),
 *         (client) => Effect.sync(() => client.disconnect())
 *       );
 *
 *       return {
 *         publish: (channel: string, message: string) =>
 *           Effect.tryPromise({
 *             try: () => pubClient.publish(channel, message),
 *             catch: (e) => new Error(`Redis PUBLISH failed: ${e}`)
 *           }),
 *
 *         subscribe: (channel: string, handler: (message: string) => void) =>
 *           Effect.gen(function* () {
 *             subClient.on("message", (ch, msg) => {
 *               if (ch === channel) handler(msg);
 *             });
 *             yield* Effect.tryPromise({
 *               try: () => subClient.subscribe(channel),
 *               catch: (e) => new Error(`Redis SUBSCRIBE failed: ${e}`)
 *             });
 *           }),
 *
 *         unsubscribe: (channel: string) =>
 *           Effect.tryPromise({
 *             try: () => subClient.unsubscribe(channel).then(() => {}),
 *             catch: (e) => new Error(`Redis UNSUBSCRIBE failed: ${e}`)
 *           }),
 *
 *         ping: () =>
 *           Effect.tryPromise({
 *             try: () => pubClient.ping(),
 *             catch: (e) => new Error(`Redis PING failed: ${e}`)
 *           })
 *       };
 *     })
 *   );
 *
 * // Usage:
 * const program = myProgram.pipe(
 *   Effect.provide(PubsubRedisLayer),
 *   Effect.provide(makeRedisPubSubClientLayer({ host: "localhost", port: 6379 }))
 * );
 * ```
 */
