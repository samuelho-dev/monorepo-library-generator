import { Redis } from "@samuelho-dev/provider-redis"
import { Cache, Duration, Effect, Layer } from "effect"
import { CacheService } from "./service"

/**
 * Cache Redis Layer
 *
 * Redis-backed distributed cache layer using provider-redis.

Architecture:
- Memory Cache: Effect.Cache (in-memory, per-instance)
- Redis Cache: Distributed, shared across instances (via provider-redis)

On cache miss:
1. Check memory cache (Effect.Cache)
2. Check Redis cache
3. Call lookup function
4. Store in both memory and Redis
 *
 * @module @samuelho-dev/infra-cache/layers/redis
 * @see EFFECT_PATTERNS.md for cache patterns
 * @see @samuelho-dev/provider-redis for Redis provider
 */
// ============================================================================
// Redis Cache Layer
// ============================================================================
/**
 * Redis-backed distributed cache layer
 *
 * Two-tier caching:
 * - Memory: Effect.Cache (in-memory, fast)
 * - Redis: Distributed, persistent (via provider-redis)
 *
 * Dependencies:
 * - Requires Redis layer from provider-redis
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const cache = yield* CacheService;
 *   // Use cache operations...
 * }).pipe(
 *   Effect.provide(CacheRedisLayer),
 *   Effect.provide(Redis.Live) // or Redis.Test for testing
 * )
 * ```
 */
export const CacheRedisLayer = Layer.effect(
  CacheService,
  Effect.gen(function*() {
    const redis = yield* Redis
    const cacheClient = redis.cache

    const serialize = <V>(value: V) => JSON.stringify(value)

    const serializeKey = <K>(key: K) => (typeof key === "string" ? key : JSON.stringify(key))

    return {
      make: <K, V, E = never>(options: {
        readonly lookup: (key: K) => Effect.Effect<V, E>
        readonly capacity: number
        readonly ttl: Duration.Duration
      }) =>
        Effect.gen(function*() {
          const ttlSeconds = Math.floor(Duration.toMillis(options.ttl) / 1000)

          // Create memory cache with Redis-aware lookup
          const memoryCache = yield* Cache.make({
            lookup: (key: K) =>
              Effect.gen(function*() {
                const redisKey = serializeKey(key)

                // Check Redis first
                const cached = yield* cacheClient.get(redisKey).pipe(
                  Effect.catchAll(() => Effect.succeed(null))
                )

                if (cached !== null) {
                  // Redis hit - parse JSON and return value
                  // Note: JSON.parse returns unknown, we trust the cache contains valid V
                  // For strict validation, use Schema-based cache with valueSchema option
                  return JSON.parse(cached)
                }

                // Redis miss - call lookup and store in Redis
                const value = yield* options.lookup(key)
                const serialized = serialize(value)
                yield* cacheClient.setex(redisKey, ttlSeconds, serialized).pipe(
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
              Effect.gen(function*() {
                // Invalidate both memory and Redis
                yield* memoryCache.invalidate(key)
                yield* cacheClient.del(serializeKey(key)).pipe(
                  Effect.catchAll(() => Effect.succeed(0))
                )
              }),

            invalidateAll: Effect.gen(function*() {
              // Invalidate memory and flush Redis
              yield* memoryCache.invalidateAll
              // Note: flushdb is aggressive - consider using key patterns instead
              yield* cacheClient.flushdb().pipe(
                Effect.catchAll(() => Effect.void)
              )
            }),

            refresh: (key: K) => memoryCache.refresh(key),

            size: memoryCache.size
            // TS infers CacheHandle<K, V, E> via Context.Tag
          }
        }),

      healthCheck: () =>
        cacheClient.ping().pipe(
          Effect.map((response) => response === "PONG"),
          Effect.catchAll(() => Effect.succeed(false)),
          Effect.withSpan("Cache.healthCheck")
        )
    }
  })
)

// ============================================================================
// Usage Examples
// ============================================================================
/**
 * Example: Using Redis-backed cache with provider-redis
 *
 * @example
 * ```typescript
 * import { CacheService, CacheRedisLayer } from "@samuelho-dev/infra-cache";
 * import { Redis } from "@samuelho-dev/provider-redis";
 * import { Effect, Duration } from "effect";
 *
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * // Create a cached user lookup
 * const program = Effect.gen(function*() {
 *   const cache = yield* CacheService;
 *
 *   // Create a cache with lookup function
 *   const userCache = yield* cache.make<string, User>({
 *     lookup: (userId: string) =>
 *       Effect.succeed({ id: userId, name: "John", email: "john@example.com" }),
 *     capacity: 1000,
 *     ttl: Duration.minutes(5)
 *   })
 *
 *   // Get user from cache (fetches from lookup if not cached)
 *   const user = yield* userCache.get("user-123")
 *   return user;
 * })
 *
 * // Run with Redis layer (production)
 * Effect.runPromise(
 *   program.pipe(
 *     Effect.provide(CacheRedisLayer),
 *     Effect.provide(Redis.Live)
 *   )
 * )
 *
 * // Run with Memory layer (no Redis needed)
 * Effect.runPromise(
 *   program.pipe(
 *     Effect.provide(CacheService.Memory)
 *   )
 * )
 * ```
 */
