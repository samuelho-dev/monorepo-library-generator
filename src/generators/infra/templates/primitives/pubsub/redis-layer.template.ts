/**
 * PubSub Redis Layer Template
 *
 * Generates Redis-backed distributed pub/sub layer.
 * Uses the provider-redis library for Redis connectivity.
 *
 * @module monorepo-library-generator/infra-templates/primitives/pubsub
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate Redis-backed pubsub layer
 */
export function generatePubSubRedisLayerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Redis Layer`,
    description: `Redis-backed distributed pub/sub layer using provider-redis.

Architecture:
- Uses Redis Pub/Sub for cross-instance messaging (via provider-redis)
- Local Effect.PubSub for per-instance fan-out
- Automatic reconnection handling
- Message serialization/deserialization

Use Cases:
- Real-time notifications across services
- Cache invalidation events
- Distributed event broadcasting`,
    module: `${scope}/infra-${fileName}/layers/redis`,
    see: ["EFFECT_PATTERNS.md for pubsub patterns", `${scope}/provider-redis for Redis provider`]
  })

  // Imports - layers.ts is at lib/layers.ts, service at lib/service.ts
  builder.addImports([
    {
      from: "effect",
      imports: ["Effect", "Layer", "PubSub", "Schema"]
    },
    {
      from: "effect",
      imports: ["Fiber"],
      isTypeOnly: true
    },
    { from: `${scope}/provider-redis`, imports: ["Redis"] },
    { from: "./service", imports: [`${className}Service`] },
    {
      from: "./service",
      imports: ["TopicHandle", "TopicOptions"],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("Redis PubSub Layer")

  builder.addRaw(`/**
 * Redis-backed distributed pub/sub layer
 *
 * Uses Redis Pub/Sub for cross-instance messaging (via provider-redis).
 * Each topic creates a local Effect.PubSub that bridges to Redis.
 *
 * Dependencies:
 * - Requires Redis layer from provider-redis
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const pubsub = yield* ${className}Service;
 *
 *   // On Instance A
 *   const events = yield* pubsub.topic<UserEvent>("user-events")
 *   yield* events.publish({ type: "login", userId: "123" })
 *
 *   // On Instance B (different process)
 *   const events = yield* pubsub.topic<UserEvent>("user-events")
 *   const sub = yield* events.subscribe;
 *   const event = yield* Queue.take(sub) // Receives event from Instance A
 * }).pipe(
 *   Effect.provide(${className}RedisLayer),
 *   Effect.provide(Redis.Live) // or Redis.Test for testing
 * )
 * \`\`\`
 */
export const ${className}RedisLayer = Layer.scoped(
  ${className}Service,
  Effect.gen(function*() {
    const redis = yield* Redis
    const pubsubClient = redis.pubsub

    // Track active topic subscriptions for cleanup
    const activeSubscribers = new Map<string, Fiber.Fiber<void, never>>()

    /**
     * Create a typed topic handle with Schema-based serialization
     * Redis subscription broadcasts to all handles on the same channel
     *
     * Schema must have R = never for sync decode in subscription handler
     */
    const createTypedTopicHandle = <A, I>(
      channelName: string,
      schema: Schema.Schema<A, I, never>,
      capacity: number
    ) =>
      Effect.gen(function*() {
        // Create JSON codec from schema for type-safe serialization
        const JsonSchema = Schema.parseJson(schema)
        const encode = Schema.encode(JsonSchema)
        const decode = Schema.decodeSync(JsonSchema)

        // Each handle gets its own properly-typed PubSub
        const localPubSub = yield* PubSub.bounded<A>(capacity)

        // Start Redis subscription if not already active for this channel
        if (!activeSubscribers.has(channelName)) {
          const subscriberFiber = yield* Effect.fork(
            pubsubClient.subscribe(channelName, (message) => {
              // Effect-idiomatic decode with error logging
              Effect.try(() => decode(message)).pipe(
                Effect.flatMap((decoded) => PubSub.publish(localPubSub, decoded)),
                Effect.catchAll((error) =>
                  Effect.logWarning("PubSub decode error", { channelName, error })
                ),
                Effect.runFork
              )
            })
          )
          activeSubscribers.set(channelName, subscriberFiber)
        }

        return {
          publish: (message: A) =>
            Effect.gen(function*() {
              // Type-safe encode using Schema
              const serialized = yield* encode(message).pipe(Effect.orDie)
              const count = yield* pubsubClient.publish(channelName, serialized)
              // Also publish to local PubSub for same-process subscribers
              yield* PubSub.publish(localPubSub, message)
              return count > 0
            }),

          publishAll: (messages: Iterable<A>) =>
            Effect.gen(function*() {
              let success = false
              for (const message of messages) {
                const serialized = yield* encode(message).pipe(Effect.orDie)
                const count = yield* pubsubClient.publish(channelName, serialized)
                yield* PubSub.publish(localPubSub, message)
                if (count > 0) success = true
              }
              return success
            }),

          subscribe: PubSub.subscribe(localPubSub),

          subscriberCount: Effect.sync(() => 0) // Would need Redis PUBSUB NUMSUB
        }
      })

    return {
      topic: <A, I>(
        name: string,
        schema: Schema.Schema<A, I, never>,
        options?: TopicOptions
      ) => createTypedTopicHandle(name, schema, options?.capacity ?? 1000),

      createTopic: <A, I>(
        schema: Schema.Schema<A, I, never>,
        options?: TopicOptions
      ) =>
        Effect.gen(function*() {
          const capacity = options?.capacity ?? 1000
          const name = \`ephemeral:\${crypto.randomUUID()}\`

          // Create JSON codec from schema
          const JsonSchema = Schema.parseJson(schema)
          const encode = Schema.encode(JsonSchema)
          const decode = Schema.decodeSync(JsonSchema)

          const localPubSub = yield* PubSub.bounded<A>(capacity)

          // Subscribe to Redis channel
          yield* Effect.forkScoped(
            pubsubClient.subscribe(name, (message) => {
              // Effect-idiomatic decode with error logging
              Effect.try(() => decode(message)).pipe(
                Effect.flatMap((decoded) => PubSub.publish(localPubSub, decoded)),
                Effect.catchAll((error) =>
                  Effect.logWarning("PubSub decode error", { channel: name, error })
                ),
                Effect.runFork
              )
            })
          )

          // Cleanup on scope close
          yield* Effect.addFinalizer(() =>
            pubsubClient.unsubscribe(name).pipe(
              Effect.catchAll((error) =>
                Effect.logWarning(\`Failed to unsubscribe from \${name}: \${String(error)}\`)
              )
            )
          )

          return {
            publish: (message: A) =>
              Effect.gen(function*() {
                const serialized = yield* encode(message).pipe(Effect.orDie)
                const count = yield* pubsubClient.publish(name, serialized)
                yield* PubSub.publish(localPubSub, message)
                return count > 0
              }),

            publishAll: (messages: Iterable<A>) =>
              Effect.gen(function*() {
                let success = false
                for (const message of messages) {
                  const serialized = yield* encode(message).pipe(Effect.orDie)
                  const count = yield* pubsubClient.publish(name, serialized)
                  yield* PubSub.publish(localPubSub, message)
                  if (count > 0) success = true
                }
                return success
              }),

            subscribe: PubSub.subscribe(localPubSub),

            subscriberCount: Effect.sync(() => 0)
          }
        }),

      healthCheck: () =>
        pubsubClient.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("${className}.healthCheck")
        )
    }
  })
)
`)

  builder.addSectionComment("Usage Examples")

  builder.addRaw(`/**
 * Example: Using Redis-backed pub/sub with provider-redis
 *
 * @example
 * \`\`\`typescript
 * import { ${className}Service, ${className}RedisLayer } from "${scope}/infra-${fileName}";
 * import { Redis } from "${scope}/provider-redis";
 * import { Effect, Schema, Queue } from "effect";
 *
 * // Define event schema
 * const UserEventSchema = Schema.Struct({
 *   type: Schema.Literal("UserCreated", "UserUpdated"),
 *   userId: Schema.String,
 *   timestamp: Schema.DateFromSelf
 * })
 * type UserEvent = Schema.Schema.Type<typeof UserEventSchema>
 *
 * const program = Effect.gen(function*() {
 *   const pubsub = yield* ${className}Service;
 *
 *   // Create a typed topic
 *   const userEvents = yield* pubsub.topic("user-events", UserEventSchema)
 *
 *   // Subscribe to events
 *   const subscription = yield* userEvents.subscribe;
 *
 *   // Publish an event
 *   yield* userEvents.publish({
 *     type: "UserCreated",
 *     userId: "user-123",
 *     timestamp: new Date()
 *   })
 *
 *   // Receive event (in another part of the app or another instance)
 *   const event = yield* Queue.take(subscription)
 *   console.log("Received:", event)
 * })
 *
 * // Run with Redis layer (production)
 * Effect.runPromise(
 *   program.pipe(
 *     Effect.provide(${className}RedisLayer),
 *     Effect.provide(Redis.Live)
 *   )
 * )
 *
 * // Run with test layer (no Redis needed)
 * Effect.runPromise(
 *   program.pipe(
 *     Effect.provide(${className}RedisLayer),
 *     Effect.provide(Redis.Test)
 *   )
 * )
 * \`\`\`
 */
`)

  // ============================================================================
  // Event Publishing Helpers
  // ============================================================================

  builder.addSectionComment("Event Publishing Helper")

  builder.addRaw(`/**
 * Wrap an Effect with event publishing
 *
 * Type-safe helper that publishes an event after successful execution.
 * No dynamic wrapping, no type assertions - fully inferred types.
 *
 * @example
 * \`\`\`typescript
 * const UserEventSchema = Schema.Struct({
 *   type: Schema.Literal("UserCreated"),
 *   userId: Schema.String,
 *   timestamp: Schema.DateFromSelf
 * })
 *
 * // In your service implementation
 * export const UserServiceLive = Layer.effect(
 *   UserService,
 *   Effect.gen(function*() {
 *     const repo = yield* UserRepository
 *     const pubsub = yield* ${className}Service
 *     const userEvents = yield* pubsub.topic("user-events", UserEventSchema)
 *
 *     return {
 *       create: (input) =>
 *         withEventPublishing(
 *           repo.create(input),
 *           (user) => ({ type: "UserCreated", userId: user.id, timestamp: new Date() }),
 *           userEvents
 *         ),
 *
 *       update: (id, input) =>
 *         withEventPublishing(
 *           repo.update(id, input),
 *           (user) => ({ type: "UserUpdated", userId: user.id, timestamp: new Date() }),
 *           userEvents
 *         ),
 *
 *       // Read operations don't need events
 *       findById: (id) => repo.findById(id),
 *     }
 *   })
 * )
 * \`\`\`
 */
export const withEventPublishing = <A, E, R, Event, TopicE>(
  effect: Effect.Effect<A, E, R>,
  buildEvent: (result: A) => Event,
  topic: TopicHandle<Event, TopicE>
) =>
  effect.pipe(
    Effect.tap((result) =>
      topic.publish(buildEvent(result)).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning("Event publishing failed", { error })
        )
      )
    )
  )
`)

  return builder.toString()
}
