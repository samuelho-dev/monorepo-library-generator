import { Redis } from "@samuelho-dev/provider-redis"
import { Chunk, Effect, Layer, Option, Schema } from "effect"
import { QueueService } from "./service"
import type { BoundedQueueHandle, QueueOptions, UnboundedQueueHandle } from "./service"

/**
 * Queue Redis Layer
 *
 * Redis-backed distributed queue layer using provider-redis.

Architecture:
- Uses Redis Lists for queue storage (LPUSH/BRPOP) via provider-redis
- Supports blocking operations for efficient polling
- Distributed across multiple instances
- Persisted to Redis for durability

Use Cases:
- Job queues across microservices
- Task distribution
- Event processing pipelines
 *
 * @module @samuelho-dev/infra-queue/layers/redis
 * @see EFFECT_PATTERNS.md for queue patterns
 * @see @samuelho-dev/provider-redis for Redis provider
 */
// ============================================================================
// Redis Queue Layer
// ============================================================================
/**
 * Redis-backed distributed queue layer
 *
 * Uses Redis Lists for distributed queue operations (via provider-redis).
 * Supports blocking BRPOP for efficient consumption.
 *
 * Dependencies:
 * - Requires Redis layer from provider-redis
 *
 * @example
 * ```typescript
 * const JobSchema = Schema.Struct({
 *   type: Schema.String,
 *   data: Schema.Unknown
 * })
 *
 * const program = Effect.gen(function*() {
 *   const queue = yield* QueueService;
 *   const jobQueue = yield* queue.bounded(1000, JobSchema, { name: "jobs" })
 *
 *   // Producer (can be on different instance)
 *   yield* jobQueue.offer({ type: "process", data: "..." })
 *
 *   // Consumer (can be on different instance)
 *   const job = yield* jobQueue.take;
 *   yield* processJob(job)
 * }).pipe(
 *   Effect.provide(QueueRedisLayer),
 *   Effect.provide(Redis.Live) // or Redis.Test for testing
 * )
 * ```
 */
export const QueueRedisLayer = Layer.effect(
  QueueService,
  Effect.gen(function*() {
    const redis = yield* Redis
    const queueClient = redis.queue

    // Serialization helpers using Effect Schema
    // Schema.parseJson handles JSON parsing + validation in one step
    // Errors flow through Effect's error channel (typed ParseError)
    const serialize = <T, I>(value: T, schema: Schema.Schema<T, I, never>) =>
      Schema.encode(Schema.parseJson(schema))(value)

    const deserialize = <T, I>(data: string, schema: Schema.Schema<T, I, never>) =>
      Schema.decode(Schema.parseJson(schema))(data)

    const makeQueueKey = (name?: string) => name ? `queue:${name}` : `queue:${crypto.randomUUID()}`

    return {
      bounded: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
        Effect.gen(function*() {
          yield* Effect.void
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          // Capacity enforcement for bounded queue
          // Redis errors are converted to defects (orDie) since they indicate infrastructure failure
          const enforceCapacity: Effect.Effect<number> = Effect.gen(function*() {
            const size = yield* queueClient.llen(key).pipe(Effect.orDie)
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
                const serialized = yield* serialize(item, schema)
                yield* queueClient.lpush(key, serialized).pipe(Effect.orDie)
                return true
              }),

            take: Effect.gen(function*() {
              if (isShutdownFlag) {
                return yield* Effect.die("Queue is shutdown")
              }
              const result = yield* queueClient.brpop(key, 0).pipe(Effect.orDie) // Block indefinitely
              if (!result) {
                return yield* Effect.die("Queue closed unexpectedly")
              }
              return yield* deserialize(result[1], schema)
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: T[] = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
                  if (!item) break
                  items.push(yield* deserialize(item, schema))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll: Effect.gen(function*() {
              const items = yield* queueClient.lrange(key, 0, -1).pipe(Effect.orDie)
              yield* queueClient.del(key).pipe(Effect.orDie)
              const deserialized: T[] = []
              for (const item of items) {
                deserialized.push(yield* deserialize(item, schema))
              }
              return Chunk.fromIterable(deserialized.reverse())
            }),

            poll: Effect.gen(function*() {
              const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
              if (!item) return Option.none()
              const value = yield* deserialize(item, schema)
              return Option.some(value)
            }),

            size: queueClient.llen(key).pipe(Effect.orDie),

            shutdown: Effect.sync(() => {
              isShutdownFlag = true
            }),

            isShutdown: Effect.sync(() => isShutdownFlag)
          }
        }),

      unbounded: <T, I = T>(schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
        Effect.gen(function*() {
          yield* Effect.void
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const serialized = yield* serialize(item, schema)
                yield* queueClient.lpush(key, serialized).pipe(Effect.orDie)
                return true
              }),

            take: Effect.gen(function*() {
              if (isShutdownFlag) {
                return yield* Effect.die("Queue is shutdown")
              }
              const result = yield* queueClient.brpop(key, 0).pipe(Effect.orDie)
              if (!result) {
                return yield* Effect.die("Queue closed unexpectedly")
              }
              return yield* deserialize(result[1], schema)
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: T[] = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
                  if (!item) break
                  items.push(yield* deserialize(item, schema))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll: Effect.gen(function*() {
              const items = yield* queueClient.lrange(key, 0, -1).pipe(Effect.orDie)
              yield* queueClient.del(key).pipe(Effect.orDie)
              const deserialized: T[] = []
              for (const item of items) {
                deserialized.push(yield* deserialize(item, schema))
              }
              return Chunk.fromIterable(deserialized.reverse())
            }),

            size: queueClient.llen(key).pipe(Effect.orDie),

            shutdown: Effect.sync(() => {
              isShutdownFlag = true
            })
          }
        }),

      dropping: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
        Effect.gen(function*() {
          yield* Effect.void
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const size = yield* queueClient.llen(key).pipe(Effect.orDie)
                if (size >= capacity) {
                  // Drop the item silently
                  return false
                }
                const serialized = yield* serialize(item, schema)
                yield* queueClient.lpush(key, serialized).pipe(Effect.orDie)
                return true
              }),

            take: Effect.gen(function*() {
              const result = yield* queueClient.brpop(key, 0).pipe(Effect.orDie)
              if (!result) {
                return yield* Effect.die("Queue closed")
              }
              return yield* deserialize(result[1], schema)
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: T[] = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
                  if (!item) break
                  items.push(yield* deserialize(item, schema))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll: Effect.gen(function*() {
              const items = yield* queueClient.lrange(key, 0, -1).pipe(Effect.orDie)
              yield* queueClient.del(key).pipe(Effect.orDie)
              const deserialized: T[] = []
              for (const item of items) {
                deserialized.push(yield* deserialize(item, schema))
              }
              return Chunk.fromIterable(deserialized.reverse())
            }),

            poll: Effect.gen(function*() {
              const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
              if (!item) return Option.none()
              const value = yield* deserialize(item, schema)
              return Option.some(value)
            }),

            size: queueClient.llen(key).pipe(Effect.orDie),
            shutdown: Effect.sync(() => {
              isShutdownFlag = true
            }),
            isShutdown: Effect.sync(() => isShutdownFlag)
          }
        }),

      sliding: <T, I = T>(capacity: number, schema: Schema.Schema<T, I, never>, options?: QueueOptions) =>
        Effect.gen(function*() {
          yield* Effect.void
          const key = makeQueueKey(options?.name)
          let isShutdownFlag = false

          return {
            offer: (item: T) =>
              Effect.gen(function*() {
                if (isShutdownFlag) return false
                const serialized = yield* serialize(item, schema)
                yield* queueClient.lpush(key, serialized).pipe(Effect.orDie)
                // Trim to capacity (keep only the newest items)
                yield* queueClient.ltrim(key, 0, capacity - 1).pipe(Effect.orDie)
                return true
              }),

            take: Effect.gen(function*() {
              const result = yield* queueClient.brpop(key, 0).pipe(Effect.orDie)
              if (!result) {
                return yield* Effect.die("Queue closed")
              }
              return yield* deserialize(result[1], schema)
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function*() {
                const items: T[] = []
                for (let i = 0; i < n; i++) {
                  const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
                  if (!item) break
                  items.push(yield* deserialize(item, schema))
                }
                return Chunk.fromIterable(items)
              }),

            takeAll: Effect.gen(function*() {
              const items = yield* queueClient.lrange(key, 0, -1).pipe(Effect.orDie)
              yield* queueClient.del(key).pipe(Effect.orDie)
              const deserialized: T[] = []
              for (const item of items) {
                deserialized.push(yield* deserialize(item, schema))
              }
              return Chunk.fromIterable(deserialized.reverse())
            }),

            poll: Effect.gen(function*() {
              const item = yield* queueClient.rpop(key).pipe(Effect.orDie)
              if (!item) return Option.none()
              const value = yield* deserialize(item, schema)
              return Option.some(value)
            }),

            size: queueClient.llen(key).pipe(Effect.orDie),
            shutdown: Effect.sync(() => {
              isShutdownFlag = true
            }),
            isShutdown: Effect.sync(() => isShutdownFlag)
          }
        }),

      healthCheck: () =>
        queueClient.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("Queue.healthCheck")
        )
    }
  })
)

// ============================================================================
// Job Enqueuing Helper
// ============================================================================
/**
 * Wrap an Effect with job enqueuing
 *
 * Type-safe helper that enqueues a job after successful execution.
 * No dynamic wrapping, no type assertions - fully inferred types.
 *
 * @example
 * ```typescript
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
 *     const queue = yield* QueueService
 *     const emailQueue = yield* queue.bounded(1000, SendEmailJobSchema, { name: "email-jobs" })
 *
 *     return {
 *       create: (input) =>
 *         withJobEnqueuing(
 *           repo.create(input),
 *           (user) => ({
 *             type: "SendEmail",
 *             to: user.email,
 *             subject: "Welcome!",
 *             body: `Hello ${user.name}`
 *           }),
 *           emailQueue
 *         ),
 *
 *       // Read operations don't need jobs
 *       findById: (id) => repo.findById(id),
 *     }
 *   })
 * )
 * ```
 */
export const withJobEnqueuing = <A, E, R, Job>(
  effect: Effect.Effect<A, E, R>,
  buildJob: (result: A) => Job,
  queue: BoundedQueueHandle<Job> | UnboundedQueueHandle<Job>
) =>
  effect.pipe(
    Effect.tap((result) =>
      queue.offer(buildJob(result)).pipe(
        Effect.catchAll((error) => Effect.logWarning("Job enqueuing failed", { error }))
      )
    )
  )
