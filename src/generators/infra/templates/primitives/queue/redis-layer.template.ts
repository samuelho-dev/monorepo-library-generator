/**
 * Queue Redis Layer Template
 *
 * Generates Redis-backed distributed queue layer.
 * Uses the provider-redis library for Redis connectivity.
 *
 * @module monorepo-library-generator/infra-templates/primitives/queue
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate Redis-backed queue layer
 */
export function generateQueueRedisLayerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Redis Layer`,
    description: `Redis-backed distributed queue layer using provider-redis.

Architecture:
- Uses Redis Lists for queue storage (LPUSH/BRPOP) via provider-redis
- Supports blocking operations for efficient polling
- Distributed across multiple instances
- Persisted to Redis for durability

Use Cases:
- Job queues across microservices
- Task distribution
- Event processing pipelines`,
    module: `${scope}/infra-${fileName}/layers/redis`,
    see: ["EFFECT_PATTERNS.md for queue patterns", `${scope}/provider-redis for Redis provider`]
  })

  // Imports - layers.ts is at lib/layers.ts, service at lib/service.ts
  builder.addImports([
    {
      from: "effect",
      imports: ["Chunk", "Effect", "Layer", "Option", "Schema"]
    },
    { from: `${scope}/provider-redis`, imports: ["Redis"] },
    { from: "./service", imports: [`${className}Service`] },
    {
      from: "./service",
      imports: ["BoundedQueueHandle", "UnboundedQueueHandle", "QueueOptions"],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("Redis Queue Layer")

  builder.addRaw(`/**
 * Redis-backed distributed queue layer
 *
 * Uses Redis Lists for distributed queue operations (via provider-redis).
 * Supports blocking BRPOP for efficient consumption.
 *
 * Dependencies:
 * - Requires Redis layer from provider-redis
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const queue = yield* ${className}Service;
 *   const jobQueue = yield* queue.bounded<Job>(1000, { name: "jobs" });
 *
 *   // Producer (can be on different instance)
 *   yield* jobQueue.offer({ type: "process", data: "..." });
 *
 *   // Consumer (can be on different instance)
 *   const job = yield* jobQueue.take;
 *   yield* processJob(job);
 * }).pipe(
 *   Effect.provide(${className}RedisLayer),
 *   Effect.provide(Redis.Live) // or Redis.Test for testing
 * );
 * \`\`\`
 */
export const ${className}RedisLayer = Layer.effect(
  ${className}Service,
  Effect.gen(function*() {
    const redis = yield* Redis
    const queueClient = redis.queue

    // Serialization helpers using Effect Schema
    // Schema.parseJson handles JSON parsing + validation in one step
    // Errors flow through Effect's error channel (no exceptions)
    const JsonValue = Schema.parseJson(Schema.Unknown)
    const decodeJson = Schema.decode(JsonValue)
    const encodeJson = Schema.encode(JsonValue)

    const serialize = <T>(value: T) =>
      encodeJson(value).pipe(Effect.orDie)

    const deserialize = <T>(data: string) =>
      decodeJson(data).pipe(Effect.map((v) => v as T), Effect.orDie)

    const makeQueueKey = (name?: string) =>
      name ? \`queue:\${name}\` : \`queue:\${crypto.randomUUID()}\`

    return {
      bounded: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function*() {
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          // Capacity enforcement for bounded queue
          const enforceCapacity: Effect.Effect<number> = Effect.gen(function*() {
            const size = yield* queueClient.llen(key)
            if (size >= capacity) {
              // Wait and retry - simple polling for backpressure
              yield* Effect.sleep("100 millis")
              return yield* enforceCapacity
            }
            return size
          })

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                yield* enforceCapacity
                const serialized = yield* serialize(item)
                yield* queueClient.lpush(key, serialized)
                return true
              }),

            take:
              Effect.gen(function*() {
                if (isShutdownFlag) {
                  return yield* Effect.die("Queue is shutdown")
                }
                const result = yield* queueClient.brpop(key, 0) // Block indefinitely
                if (!result) {
                  return yield* Effect.die("Queue closed unexpectedly")
                }
                return yield* deserialize<T>(result[1])
              }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: Array<T> = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key)
                  if (!item) break
                  items.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll:
              Effect.gen(function*() {
                const items = yield* queueClient.lrange(key, 0, -1)
                yield* queueClient.del(key)
                const deserialized: Array<T> = []
                for (const item of items) {
                  deserialized.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(deserialized.reverse())
              }),

            poll:
              Effect.gen(function*() {
                const item = yield* queueClient.rpop(key)
                if (!item) return Option.none()
                const value = yield* deserialize<T>(item)
                return Option.some(value)
              }),

            size: queueClient.llen(key),

            shutdown:
              Effect.sync(() => {
                isShutdownFlag = true
              }),

            isShutdown: Effect.sync(() => isShutdownFlag)
          // TS infers BoundedQueueHandle<T> via Context.Tag
          }
        }),

      unbounded: <T>(options?: QueueOptions) =>
        Effect.gen(function*() {
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const serialized = yield* serialize(item)
                yield* queueClient.lpush(key, serialized)
                return true
              }),

            take:
              Effect.gen(function*() {
                if (isShutdownFlag) {
                  return yield* Effect.die("Queue is shutdown")
                }
                const result = yield* queueClient.brpop(key, 0)
                if (!result) {
                  return yield* Effect.die("Queue closed unexpectedly")
                }
                return yield* deserialize<T>(result[1])
              }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: Array<T> = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key)
                  if (!item) break
                  items.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll:
              Effect.gen(function*() {
                const items = yield* queueClient.lrange(key, 0, -1)
                yield* queueClient.del(key)
                const deserialized: Array<T> = []
                for (const item of items) {
                  deserialized.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(deserialized.reverse())
              }),

            size: queueClient.llen(key),

            shutdown:
              Effect.sync(() => {
                isShutdownFlag = true
              })
          // TS infers UnboundedQueueHandle<T> via Context.Tag
          }
        }),

      dropping: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function*() {
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const size = yield* queueClient.llen(key)
                if (size >= capacity) {
                  // Drop the item silently
                  return false
                }
                const serialized = yield* serialize(item)
                yield* queueClient.lpush(key, serialized)
                return true
              }),

            take:
              Effect.gen(function*() {
                const result = yield* queueClient.brpop(key, 0)
                if (!result) {
                  return yield* Effect.die("Queue closed")
                }
                return yield* deserialize<T>(result[1])
              }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: Array<T> = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key)
                  if (!item) break
                  items.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll:
              Effect.gen(function*() {
                const items = yield* queueClient.lrange(key, 0, -1)
                yield* queueClient.del(key)
                const deserialized: Array<T> = []
                for (const item of items) {
                  deserialized.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(deserialized.reverse())
              }),

            poll:
              Effect.gen(function*() {
                const item = yield* queueClient.rpop(key)
                if (!item) return Option.none()
                const value = yield* deserialize<T>(item)
                return Option.some(value)
              }),

            size: queueClient.llen(key),
            shutdown: Effect.sync(() => { isShutdownFlag = true }),
            isShutdown: Effect.sync(() => isShutdownFlag)
          // TS infers BoundedQueueHandle<T> via Context.Tag
          }
        }),

      sliding: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function*() {
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const serialized = yield* serialize(item)
                yield* queueClient.lpush(key, serialized)
                // Trim to capacity (keep only the newest items)
                yield* queueClient.ltrim(key, 0, capacity - 1)
                return true
              }),

            take:
              Effect.gen(function*() {
                const result = yield* queueClient.brpop(key, 0)
                if (!result) {
                  return yield* Effect.die("Queue closed")
                }
                return yield* deserialize<T>(result[1])
              }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: Array<T> = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key)
                  if (!item) break
                  items.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll:
              Effect.gen(function*() {
                const items = yield* queueClient.lrange(key, 0, -1)
                yield* queueClient.del(key)
                const deserialized: Array<T> = []
                for (const item of items) {
                  deserialized.push(yield* deserialize<T>(item))
                }
                return Chunk.fromIterable(deserialized.reverse())
              }),

            poll:
              Effect.gen(function*() {
                const item = yield* queueClient.rpop(key)
                if (!item) return Option.none()
                const value = yield* deserialize<T>(item)
                return Option.some(value)
              }),

            size: queueClient.llen(key),
            shutdown: Effect.sync(() => { isShutdownFlag = true }),
            isShutdown: Effect.sync(() => isShutdownFlag)
          // TS infers BoundedQueueHandle<T> via Context.Tag
          }
        }),

      healthCheck: () =>
        queueClient.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("${className}.healthCheck")
        )
    }
  })
)
`)

  // ============================================================================
  // Job Enqueuing Helpers
  // ============================================================================

  builder.addSectionComment("Job Enqueuing Helper")

  builder.addRaw(`/**
 * Wrap an Effect with job enqueuing
 *
 * Type-safe helper that enqueues a job after successful execution.
 * No dynamic wrapping, no type assertions - fully inferred types.
 *
 * @example
 * \`\`\`typescript
 * const SendEmailJobSchema = Schema.Struct({
 *   type: Schema.Literal("SendEmail"),
 *   to: Schema.String,
 *   subject: Schema.String,
 *   body: Schema.String
 * })
 *
 * // In your service implementation
 * export const UserServiceLive = Layer.effect(
 *   UserService,
 *   Effect.gen(function*() {
 *     const repo = yield* UserRepository
 *     const queue = yield* ${className}Service
 *     const emailQueue = yield* queue.bounded<Schema.Schema.Type<typeof SendEmailJobSchema>>(1000, { name: "email-jobs" })
 *
 *     return {
 *       create: (input) =>
 *         withJobEnqueuing(
 *           repo.create(input),
 *           (user) => ({
 *             type: "SendEmail",
 *             to: user.email,
 *             subject: "Welcome!",
 *             body: \`Hello \${user.name}\`
 *           }),
 *           emailQueue
 *         ),
 *
 *       // Read operations don't need jobs
 *       findById: (id) => repo.findById(id),
 *     }
 *   })
 * )
 * \`\`\`
 */
export const withJobEnqueuing = <A, E, R, Job>(
  effect: Effect.Effect<A, E, R>,
  buildJob: (result: A) => Job,
  queue: BoundedQueueHandle<Job> | UnboundedQueueHandle<Job>
) =>
  effect.pipe(
    Effect.tap((result) =>
      queue.offer(buildJob(result)).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning("Job enqueuing failed", { error })
        )
      )
    )
  )
`)

  return builder.toString()
}
