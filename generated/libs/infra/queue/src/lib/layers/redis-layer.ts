import { Chunk, Context, Effect, Layer, Option, Schema } from "effect";
import type { BoundedQueueHandle, QueueOptions, UnboundedQueueHandle } from "../service/service";
import { QueueService } from "../service/service";

/**
 * Queue Redis Layer
 *
 * Redis-backed distributed queue layer.

Architecture:
- Uses Redis Lists for queue storage (LPUSH/BRPOP)
- Supports blocking operations for efficient polling
- Distributed across multiple instances
- Persisted to Redis for durability

Use Cases:
- Job queues across microservices
- Task distribution
- Event processing pipelines
 *
 * @module @myorg/infra-queue/layers/redis
 * @see EFFECT_PATTERNS.md for queue patterns
 */

// ============================================================================
// Redis Client Context Tag
// ============================================================================

/**
 * Redis client interface for queue operations
 */
export interface RedisQueueClient {
  /**
   * Push item to left of list (LPUSH)
   */
  readonly lpush: (key: string, value: string) => Effect.Effect<number>;

  /**
   * Pop item from right of list with blocking (BRPOP)
   */
  readonly brpop: (key: string, timeout: number) => Effect.Effect<[string, string] | null>;

  /**
   * Pop item from right of list (RPOP)
   */
  readonly rpop: (key: string) => Effect.Effect<string | null>;

  /**
   * Get list length (LLEN)
   */
  readonly llen: (key: string) => Effect.Effect<number>;

  /**
   * Get range of list items (LRANGE)
   */
  readonly lrange: (key: string, start: number, stop: number) => Effect.Effect<string[]>;

  /**
   * Trim list to specified range (LTRIM)
   */
  readonly ltrim: (key: string, start: number, stop: number) => Effect.Effect<void>;

  /**
   * Delete key (DEL)
   */
  readonly del: (key: string) => Effect.Effect<number>;

  /**
   * Ping for health check
   */
  readonly ping: () => Effect.Effect<string>;
}

/**
 * Redis Queue Client Context Tag
 */
export class RedisQueueClientTag extends Context.Tag("RedisQueueClient")<
  RedisQueueClientTag,
  RedisQueueClient
>() {}

// ============================================================================
// Redis Queue Layer
// ============================================================================

/**
 * Redis-backed distributed queue layer
 *
 * Uses Redis Lists for distributed queue operations.
 * Supports blocking BRPOP for efficient consumption.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const queue = yield* QueueService;
 *   const jobQueue = yield* queue.bounded<Job>(1000, { name: "jobs" });
 *
 *   // Producer (can be on different instance)
 *   yield* jobQueue.offer({ type: "process", data: "..." });
 *
 *   // Consumer (can be on different instance)
 *   const job = yield* jobQueue.take;
 *   yield* processJob(job);
 * }).pipe(
 *   Effect.provide(QueueRedisLayer),
 *   Effect.provide(myRedisClientLayer)
 * );
 * ```
 */
export const QueueRedisLayer = Layer.effect(
  QueueService,
  Effect.gen(function* () {
    const redis = yield* RedisQueueClientTag;

    // Serialization helpers using Effect Schema
    // Schema.parseJson handles JSON parsing + validation in one step
    // Errors flow through Effect's error channel (no exceptions)
    const JsonValue = Schema.parseJson(Schema.Unknown);
    const decodeJson = Schema.decode(JsonValue);
    const encodeJson = Schema.encode(JsonValue);

    const serialize = <T>(value: T): Effect.Effect<string, never, never> =>
      encodeJson(value).pipe(Effect.orDie);

    const deserialize = <T>(data: string): Effect.Effect<T, never, never> =>
      decodeJson(data).pipe(
        Effect.map((v) => v as T),
        Effect.orDie,
      );

    const makeQueueKey = (name?: string) =>
      name ? `queue:${name}` : `queue:${crypto.randomUUID()}`;

    return {
      bounded: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function* () {
          const key = makeQueueKey(options?.name);
          let isShutdownFlag = false;

          // Capacity enforcement for bounded queue
          const enforceCapacity: Effect.Effect<number> = Effect.gen(function* () {
            const size = yield* redis.llen(key);
            if (size >= capacity) {
              // Wait and retry - simple polling for backpressure
              yield* Effect.sleep("100 millis");
              return yield* enforceCapacity;
            }
            return size;
          });

          return {
            offer: (item: T) =>
              Effect.gen(function* () {
                if (isShutdownFlag) return false;
                yield* enforceCapacity;
                const serialized = yield* serialize(item);
                yield* redis.lpush(key, serialized);
                return true;
              }),

            take: Effect.gen(function* () {
              if (isShutdownFlag) {
                return yield* Effect.die("Queue is shutdown");
              }
              const result = yield* redis.brpop(key, 0); // Block indefinitely
              if (!result) {
                return yield* Effect.die("Queue closed unexpectedly");
              }
              return yield* deserialize<T>(result[1]);
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function* () {
                const items: T[] = [];
                for (let i = 0; i < n; i++) {
                  const item = yield* redis.rpop(key);
                  if (!item) break;
                  items.push(yield* deserialize<T>(item));
                }
                return Chunk.fromIterable(items);
              }),

            takeAll: Effect.gen(function* () {
              const items = yield* redis.lrange(key, 0, -1);
              yield* redis.del(key);
              const deserialized: T[] = [];
              for (const item of items) {
                deserialized.push(yield* deserialize<T>(item));
              }
              return Chunk.fromIterable(deserialized.reverse());
            }),

            poll: Effect.gen(function* () {
              const item = yield* redis.rpop(key);
              if (!item) return Option.none();
              const value = yield* deserialize<T>(item);
              return Option.some(value);
            }),

            size: redis.llen(key),

            shutdown: Effect.sync(() => {
              isShutdownFlag = true;
            }),

            isShutdown: Effect.sync(() => isShutdownFlag),
          } satisfies BoundedQueueHandle<T>;
        }),

      unbounded: <T>(options?: QueueOptions) =>
        Effect.gen(function* () {
          const key = makeQueueKey(options?.name);
          let isShutdownFlag = false;

          return {
            offer: (item: T) =>
              Effect.gen(function* () {
                if (isShutdownFlag) return false;
                const serialized = yield* serialize(item);
                yield* redis.lpush(key, serialized);
                return true;
              }),

            take: Effect.gen(function* () {
              if (isShutdownFlag) {
                return yield* Effect.die("Queue is shutdown");
              }
              const result = yield* redis.brpop(key, 0);
              if (!result) {
                return yield* Effect.die("Queue closed unexpectedly");
              }
              return yield* deserialize<T>(result[1]);
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function* () {
                const items: T[] = [];
                for (let i = 0; i < n; i++) {
                  const item = yield* redis.rpop(key);
                  if (!item) break;
                  items.push(yield* deserialize<T>(item));
                }
                return Chunk.fromIterable(items);
              }),

            takeAll: Effect.gen(function* () {
              const items = yield* redis.lrange(key, 0, -1);
              yield* redis.del(key);
              const deserialized: T[] = [];
              for (const item of items) {
                deserialized.push(yield* deserialize<T>(item));
              }
              return Chunk.fromIterable(deserialized.reverse());
            }),

            size: redis.llen(key),

            shutdown: Effect.sync(() => {
              isShutdownFlag = true;
            }),
          } satisfies UnboundedQueueHandle<T>;
        }),

      dropping: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function* () {
          const key = makeQueueKey(options?.name);
          let isShutdownFlag = false;

          return {
            offer: (item: T) =>
              Effect.gen(function* () {
                if (isShutdownFlag) return false;
                const size = yield* redis.llen(key);
                if (size >= capacity) {
                  // Drop the item silently
                  return false;
                }
                const serialized = yield* serialize(item);
                yield* redis.lpush(key, serialized);
                return true;
              }),

            take: Effect.gen(function* () {
              const result = yield* redis.brpop(key, 0);
              if (!result) {
                return yield* Effect.die("Queue closed");
              }
              return yield* deserialize<T>(result[1]);
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function* () {
                const items: T[] = [];
                for (let i = 0; i < n; i++) {
                  const item = yield* redis.rpop(key);
                  if (!item) break;
                  items.push(yield* deserialize<T>(item));
                }
                return Chunk.fromIterable(items);
              }),

            takeAll: Effect.gen(function* () {
              const items = yield* redis.lrange(key, 0, -1);
              yield* redis.del(key);
              const deserialized: T[] = [];
              for (const item of items) {
                deserialized.push(yield* deserialize<T>(item));
              }
              return Chunk.fromIterable(deserialized.reverse());
            }),

            poll: Effect.gen(function* () {
              const item = yield* redis.rpop(key);
              if (!item) return Option.none();
              const value = yield* deserialize<T>(item);
              return Option.some(value);
            }),

            size: redis.llen(key),
            shutdown: Effect.sync(() => {
              isShutdownFlag = true;
            }),
            isShutdown: Effect.sync(() => isShutdownFlag),
          } satisfies BoundedQueueHandle<T>;
        }),

      sliding: <T>(capacity: number, options?: QueueOptions) =>
        Effect.gen(function* () {
          const key = makeQueueKey(options?.name);
          let isShutdownFlag = false;

          return {
            offer: (item: T) =>
              Effect.gen(function* () {
                if (isShutdownFlag) return false;
                const serialized = yield* serialize(item);
                yield* redis.lpush(key, serialized);
                // Trim to capacity (keep only the newest items)
                yield* redis.ltrim(key, 0, capacity - 1);
                return true;
              }),

            take: Effect.gen(function* () {
              const result = yield* redis.brpop(key, 0);
              if (!result) {
                return yield* Effect.die("Queue closed");
              }
              return yield* deserialize<T>(result[1]);
            }),

            takeUpTo: (n: number) =>
              Effect.gen(function* () {
                const items: T[] = [];
                for (let i = 0; i < n; i++) {
                  const item = yield* redis.rpop(key);
                  if (!item) break;
                  items.push(yield* deserialize<T>(item));
                }
                return Chunk.fromIterable(items);
              }),

            takeAll: Effect.gen(function* () {
              const items = yield* redis.lrange(key, 0, -1);
              yield* redis.del(key);
              const deserialized: T[] = [];
              for (const item of items) {
                deserialized.push(yield* deserialize<T>(item));
              }
              return Chunk.fromIterable(deserialized.reverse());
            }),

            poll: Effect.gen(function* () {
              const item = yield* redis.rpop(key);
              if (!item) return Option.none();
              const value = yield* deserialize<T>(item);
              return Option.some(value);
            }),

            size: redis.llen(key),
            shutdown: Effect.sync(() => {
              isShutdownFlag = true;
            }),
            isShutdown: Effect.sync(() => isShutdownFlag),
          } satisfies BoundedQueueHandle<T>;
        }),

      healthCheck: () =>
        redis.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("Queue.healthCheck"),
        ),
    };
  }),
);
