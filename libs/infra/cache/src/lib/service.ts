import { env } from "@samuelho-dev/env"
import { Cache, Context, Duration, Effect, Layer } from "effect"
import type { Option } from "effect"

/**
 * Cache Service
 *
 * Cache infrastructure using Effect.Cache primitive.

Provides:
- Memoized cache with automatic TTL management
- Lookup function with cache stampede protection
- Concurrent request deduplication
- Optional Redis L2 backing for distributed caching

Effect.Cache Features:
- Automatic background refresh
- LRU eviction when capacity exceeded
- Type-safe key/value pairs
 *
 * @module @samuelho-dev/infra-cache/service
 * @see EFFECT_PATTERNS.md for cache patterns
 */
// ============================================================================
// Cache Service Interface (Effect.Cache Wrapper)
// ============================================================================
/**
 *
 * Note: The R (requirements) type parameter from the lookup function
 * is captured during cache creation. Methods return Effect without R.
 */
export interface CacheHandle<K, V, E = never> {
  /**
   * Get value from cache, calling lookup on miss
   */
  readonly get: (key: K) => Effect.Effect<V, E>

  /**
   * Invalidate specific key
   */
  readonly invalidate: (key: K) => Effect.Effect<void>

  /**
   * Invalidate all cached entries
   */
  readonly invalidateAll: Effect.Effect<void>

  /**
   * Force refresh of a key (call lookup even if cached)
   */
  readonly refresh: (key: K) => Effect.Effect<void, E>

  /**
   * Get current cache size
   */
  readonly size: Effect.Effect<number>
}

/**
 * Simple cache handle (no lookup function)
 */
export interface SimpleCacheHandle<K, V> {
  /**
   * Get value from cache
   */
  readonly get: (key: K) => Effect.Effect<Option.Option<V>>

  /**
   * Set value in cache
   */
  readonly set: (key: K, value: V) => Effect.Effect<void>

  /**
   * Delete key from cache
   */
  readonly delete: (key: K) => Effect.Effect<void>

  /**
   * Clear all entries
   */
  readonly clear: Effect.Effect<void>
}

/**
 * Cache Service
 *
 * Cache infrastructure using Effect.Cache primitive.
 * Provides memoized caching with TTL, lookup functions, and invalidation.
 */
export class CacheService extends Context.Tag(
  "@samuelho-dev/infra-cache/CacheService"
)<
  CacheService,
  {
    /**
     * Create a typed cache with lookup function
     *
     * The lookup function is called on cache miss. Concurrent requests
     * for the same key share execution (cache stampede protection).
     *
     * @example
     * ```typescript
     * const userCache = yield* service.make({
     *   lookup: (userId: string) => userRepo.findById(userId),
     *   capacity: 1000,
     *   ttl: Duration.minutes(5)
     * })
     *
     * const user = yield* userCache.get("user-123")
     * ```
     */
    readonly make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) => Effect.Effect<CacheHandle<K, V, E>>

    /**
     * Health check for monitoring
     */
    readonly healthCheck: () => Effect.Effect<boolean>
  }
>() {
  // ===========================================================================
  // Static Memory Layer (In-Memory Effect.Cache)
  // ===========================================================================

  /**
   * Memory Layer - Pure Effect.Cache implementation
   *
   * Uses Effect's built-in Cache for in-memory caching.
   * Suitable for single-instance deployments or testing.
   */
  static readonly Memory = Layer.succeed(this, {
    make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function*() {
        const cache = yield* Cache.make({
          lookup: options.lookup,
          capacity: options.capacity,
          timeToLive: options.ttl
        })

        // Return object literal - TS infers CacheHandle<K, V, E> from Context.Tag
        return {
          get: (key: K) => cache.get(key),
          invalidate: (key: K) => cache.invalidate(key),
          invalidateAll: cache.invalidateAll,
          refresh: (key: K) => cache.refresh(key),
          size: cache.size
        }
      }),

    healthCheck: () => Effect.succeed(true)
  })

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Mock implementation for testing
   *
   * Uses Layer.sync for test isolation (fresh cache per test run).
   */
  static readonly Test = Layer.sync(this, () => ({
    make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function*() {
        const cache = yield* Cache.make({
          lookup: options.lookup,
          capacity: options.capacity,
          timeToLive: options.ttl
        })

        // Return object literal - TS infers CacheHandle<K, V, E> from Context.Tag
        return {
          get: (key: K) => cache.get(key),
          invalidate: (key: K) => cache.invalidate(key),
          invalidateAll: cache.invalidateAll,
          refresh: (key: K) => cache.refresh(key),
          size: cache.size
        }
      }),

    healthCheck: () => Effect.succeed(true)
  }))

  // ===========================================================================
  // Alias: Live = Memory (default)
  // ===========================================================================

  /**
   * Live Layer - Defaults to Memory layer
   *
   * For Redis-backed distributed caching, use RedisCache layer from layers/
   */
  static readonly Live = CacheService.Memory

  // ===========================================================================
  // Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Memory with debug logging
   */
  static readonly Dev = Layer.succeed(this, {
    make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function*() {
        yield* Effect.logDebug("[CacheService] [DEV] Creating cache", {
          capacity: options.capacity,
          ttl: Duration.toMillis(options.ttl)
        })
        const cache = yield* Cache.make({
          lookup: (key: K) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[CacheService] [DEV] Cache miss", { key })
              return yield* options.lookup(key)
            }),
          capacity: options.capacity,
          timeToLive: options.ttl
        })

        return {
          get: (key: K) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[CacheService] [DEV] get", { key })
              return yield* cache.get(key)
            }),
          invalidate: (key: K) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[CacheService] [DEV] invalidate", { key })
              return yield* cache.invalidate(key)
            }),
          invalidateAll: Effect.gen(function*() {
            yield* Effect.logDebug("[CacheService] [DEV] invalidateAll")
            return yield* cache.invalidateAll
          }),
          refresh: (key: K) =>
            Effect.gen(function*() {
              yield* Effect.logDebug("[CacheService] [DEV] refresh", { key })
              return yield* cache.refresh(key)
            }),
          size: cache.size
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
   * - "test" → Test
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return CacheService.Live
      case "test":
        return CacheService.Test
      default:
        // "development" and other environments use Dev
        return CacheService.Dev
    }
  })
}
