/**
 * Cache Redis Layer Template
 *
 * Generates Redis-backed L2 cache layer for distributed caching.
 *
 * @module monorepo-library-generator/infra-templates/primitives/cache
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate Redis-backed cache layer
 */
export function generateCacheRedisLayerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Redis Layer`,
    description: `Redis-backed distributed cache layer.

Architecture:
- Memory Cache: Effect.Cache (in-memory, per-instance)
- Redis Cache: Distributed, shared across instances

On cache miss:
1. Check memory cache (Effect.Cache)
2. Check Redis cache
3. Call lookup function
4. Store in both memory and Redis`,
    module: `${scope}/infra-${fileName}/layers/redis`,
    see: ['EFFECT_PATTERNS.md for cache patterns'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Cache', 'Context', 'Duration', 'Effect', 'Layer', 'Option', 'Schema'],
    },
    { from: '../service/service', imports: [`${className}Service`] },
    { from: '../service/service', imports: ['CacheHandle', 'SimpleCacheHandle'], isTypeOnly: true },
  ]);

  builder.addSectionComment('Redis Client Context Tag');

  builder.addRaw(`/**
 * Redis client interface
 *
 * Implement this with your preferred Redis client (ioredis, redis, etc.)
 */
export interface RedisClient {
  readonly get: (key: string) => Effect.Effect<string | null>
  readonly set: (key: string, value: string) => Effect.Effect<void>
  readonly setex: (key: string, seconds: number, value: string) => Effect.Effect<void>
  readonly del: (key: string) => Effect.Effect<number>
  readonly flushdb: () => Effect.Effect<void>
  readonly ping: () => Effect.Effect<string>
}

/**
 * Redis Client Context Tag
 *
 * Provide your Redis client implementation when using RedisCache layer.
 */
export class RedisClientTag extends Context.Tag("RedisClient")<
  RedisClientTag,
  RedisClient
>() {}
`);

  builder.addSectionComment('Redis Cache Layer');

  builder.addRaw(`/**
 * Redis-backed distributed cache layer
 *
 * Two-tier caching:
 * - Memory: Effect.Cache (in-memory, fast)
 * - Redis: Distributed, persistent
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function* () {
 *   const cache = yield* ${className}Service;
 *   // Use cache operations...
 * }).pipe(
 *   Effect.provide(${className}RedisLayer),
 *   Effect.provide(myRedisClientLayer)
 * );
 * \`\`\`
 */
export const ${className}RedisLayer = Layer.effect(
  ${className}Service,
  Effect.gen(function* () {
    const redis = yield* RedisClientTag

    // Serialization helpers using Effect Schema
    // Schema.parseJson handles JSON parsing + validation in one step
    // Errors flow through Effect's error channel (no exceptions)
    const JsonValue = Schema.parseJson(Schema.Unknown)
    const decodeJson = Schema.decode(JsonValue)
    const encodeJson = Schema.encode(JsonValue)

    const serialize = <V>(value: V): Effect.Effect<string, never, never> =>
      encodeJson(value).pipe(Effect.orDie) // JSON.stringify shouldn't fail for valid objects

    const deserialize = <V>(data: string): Effect.Effect<V, never, never> =>
      decodeJson(data).pipe(Effect.map((v) => v as V), Effect.orDie)

    const serializeKey = <K>(key: K): string =>
      typeof key === "string" ? key : JSON.stringify(key)

    return {
      make: <K, V, E = never>(options: {
        readonly lookup: (key: K) => Effect.Effect<V, E>
        readonly capacity: number
        readonly ttl: Duration.Duration
      }) =>
        Effect.gen(function* () {
          const ttlSeconds = Math.floor(Duration.toMillis(options.ttl) / 1000)

          // Create memory cache with Redis-aware lookup
          const memoryCache = yield* Cache.make({
            lookup: (key: K) =>
              Effect.gen(function* () {
                const redisKey = serializeKey(key)

                // Check Redis first
                const cached = yield* redis.get(redisKey).pipe(
                  Effect.catchAll(() => Effect.succeed(null))
                )

                if (cached !== null) {
                  // Redis hit - return cached value
                  return yield* deserialize<V>(cached)
                }

                // Redis miss - call lookup and store in Redis
                const value = yield* options.lookup(key)
                const serialized = yield* serialize(value)
                yield* redis.setex(redisKey, ttlSeconds, serialized).pipe(
                  Effect.catchAll(() => Effect.void) // Ignore Redis write failures
                )

                return value
              }),
            capacity: options.capacity,
            timeToLive: options.ttl
          })

          return {
            get: (key: K) => memoryCache.get(key),

            invalidate: (key: K) =>
              Effect.gen(function* () {
                // Invalidate both memory and Redis
                yield* memoryCache.invalidate(key)
                yield* redis.del(serializeKey(key)).pipe(
                  Effect.catchAll(() => Effect.succeed(0))
                )
              }),

            invalidateAll:
              Effect.gen(function* () {
                // Invalidate memory and flush Redis
                yield* memoryCache.invalidateAll
                // Note: flushdb is aggressive - consider using key patterns instead
                yield* redis.flushdb().pipe(
                  Effect.catchAll(() => Effect.void)
                )
              }),

            refresh: (key: K) => memoryCache.refresh(key),

            size: memoryCache.size
          } satisfies CacheHandle<K, V, E>
        }),

      makeSimple: <K, V>(options: {
        readonly capacity: number
        readonly ttl: Duration.Duration
      }) =>
        Effect.gen(function* () {
          const ttlSeconds = Math.floor(Duration.toMillis(options.ttl) / 1000)

          // In-memory store for hot data
          const memoryStore = new Map<string, { value: V; expiresAt: number }>()
          const ttlMs = Duration.toMillis(options.ttl)

          return {
            get: (key: K) =>
              Effect.gen(function* () {
                const strKey = serializeKey(key)

                // Check memory first
                const memoryEntry = memoryStore.get(strKey)
                if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
                  return Option.some(memoryEntry.value)
                }
                memoryStore.delete(strKey)

                // Check Redis
                const cached = yield* redis.get(strKey).pipe(
                  Effect.catchAll(() => Effect.succeed(null))
                )

                if (cached !== null) {
                  const value = yield* deserialize<V>(cached)
                  // Populate memory cache
                  memoryStore.set(strKey, { value, expiresAt: Date.now() + ttlMs })
                  return Option.some(value)
                }

                return Option.none<V>()
              }),

            set: (key: K, value: V) =>
              Effect.gen(function* () {
                const strKey = serializeKey(key)

                // Write to both memory and Redis
                memoryStore.set(strKey, { value, expiresAt: Date.now() + ttlMs })
                const serialized = yield* serialize(value)
                yield* redis.setex(strKey, ttlSeconds, serialized).pipe(
                  Effect.catchAll(() => Effect.void)
                )
              }),

            delete: (key: K) =>
              Effect.gen(function* () {
                const strKey = serializeKey(key)

                // Delete from both memory and Redis
                memoryStore.delete(strKey)
                yield* redis.del(strKey).pipe(
                  Effect.catchAll(() => Effect.succeed(0))
                )
              }),

            clear:
              Effect.gen(function* () {
                memoryStore.clear()
                yield* redis.flushdb().pipe(
                  Effect.catchAll(() => Effect.void)
                )
              })
          } satisfies SimpleCacheHandle<K, V>
        }),

      healthCheck: () =>
        redis.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("${className}.healthCheck")
        )
    }
  })
)
`);

  builder.addSectionComment('Example: ioredis Integration');

  builder.addRaw(`/**
 * Example: Create Redis client layer using ioredis
 *
 * @example
 * \`\`\`typescript
 * import Redis from "ioredis";
 *
 * const makeRedisClientLayer = (config: { host: string; port: number }) =>
 *   Layer.scoped(
 *     RedisClientTag,
 *     Effect.gen(function* () {
 *       const client = yield* Effect.acquireRelease(
 *         Effect.sync(() => new Redis(config)),
 *         (client) => Effect.sync(() => client.disconnect())
 *       );
 *
 *       return {
 *         get: (key: string) =>
 *           Effect.tryPromise({
 *             try: () => client.get(key),
 *             catch: (e) => new ${className}InternalError({ message: "Redis GET failed", cause: e })
 *           }),
 *         set: (key: string, value: string) =>
 *           Effect.tryPromise({
 *             try: () => client.set(key, value).then(() => {}),
 *             catch: (e) => new ${className}InternalError({ message: "Redis SET failed", cause: e })
 *           }),
 *         setex: (key: string, seconds: number, value: string) =>
 *           Effect.tryPromise({
 *             try: () => client.setex(key, seconds, value).then(() => {}),
 *             catch: (e) => new ${className}InternalError({ message: "Redis SETEX failed", cause: e })
 *           }),
 *         del: (key: string) =>
 *           Effect.tryPromise({
 *             try: () => client.del(key),
 *             catch: (e) => new ${className}InternalError({ message: "Redis DEL failed", cause: e })
 *           }),
 *         flushdb: () =>
 *           Effect.tryPromise({
 *             try: () => client.flushdb().then(() => {}),
 *             catch: (e) => new ${className}InternalError({ message: "Redis FLUSHDB failed", cause: e })
 *           }),
 *         ping: () =>
 *           Effect.tryPromise({
 *             try: () => client.ping(),
 *             catch: (e) => new ${className}InternalError({ message: "Redis PING failed", cause: e })
 *           })
 *       };
 *     })
 *   );
 *
 * // Usage:
 * const program = myProgram.pipe(
 *   Effect.provide(${className}RedisLayer),
 *   Effect.provide(makeRedisClientLayer({ host: "localhost", port: 6379 }))
 * );
 * \`\`\`
 */
`);

  return builder.toString();
}
