/**
 * Cache Service Interface Template
 *
 * Generates proper Effect.Cache wrapper with TTL, lookup, and invalidation.
 * Supports Redis L2 backing for distributed caching.
 *
 * @module monorepo-library-generator/infra-templates/primitives/cache
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate cache service interface using Effect.Cache primitive
 */
export function generateCacheInterfaceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Cache infrastructure using Effect.Cache primitive.

Provides:
- Memoized cache with automatic TTL management
- Lookup function with cache stampede protection
- Concurrent request deduplication
- Optional Redis L2 backing for distributed caching

Effect.Cache Features:
- Automatic background refresh
- LRU eviction when capacity exceeded
- Type-safe key/value pairs`,
    module: `${scope}/infra-${fileName}/service`,
    see: ['EFFECT_PATTERNS.md for cache patterns'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Cache', 'Context', 'Duration', 'Effect', 'Layer', 'Option'],
    },
  ]);

  builder.addSectionComment('Cache Service Interface (Effect.Cache Wrapper)');

  builder.addRaw(`/**
 * Cache handle returned by make/makeSimple
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
 * ${className} Service
 *
 * Cache infrastructure using Effect.Cache primitive.
 * Provides memoized caching with TTL, lookup functions, and invalidation.
 */
export class ${className}Service extends Context.Tag(
  "${scope}/infra-${fileName}/${className}Service"
)<
  ${className}Service,
  {
    /**
     * Create a typed cache with lookup function
     *
     * The lookup function is called on cache miss. Concurrent requests
     * for the same key share execution (cache stampede protection).
     *
     * @example
     * \`\`\`typescript
     * const userCache = yield* service.make({
     *   lookup: (userId: string) => userRepo.findById(userId),
     *   capacity: 1000,
     *   ttl: Duration.minutes(5)
     * });
     *
     * const user = yield* userCache.get("user-123");
     * \`\`\`
     */
    readonly make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) => Effect.Effect<CacheHandle<K, V, E>>

    /**
     * Create a simple key-value cache without lookup function
     *
     * @example
     * \`\`\`typescript
     * const sessionCache = yield* service.makeSimple<string, SessionData>({
     *   capacity: 10000,
     *   ttl: Duration.hours(24)
     * });
     *
     * yield* sessionCache.set("session-abc", sessionData);
     * const session = yield* sessionCache.get("session-abc");
     * \`\`\`
     */
    readonly makeSimple: <K, V>(options: {
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) => Effect.Effect<SimpleCacheHandle<K, V>>

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
      Effect.gen(function* () {
        const cache = yield* Cache.make({
          lookup: options.lookup,
          capacity: options.capacity,
          timeToLive: options.ttl
        })

        return {
          get: (key: K) => cache.get(key),
          invalidate: (key: K) => cache.invalidate(key),
          invalidateAll: cache.invalidateAll,
          refresh: (key: K) => cache.refresh(key),
          size: cache.size
        } satisfies CacheHandle<K, V, E>
      }),

    makeSimple: <K, V>(options: {
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function* () {
        // Use a Map with manual TTL tracking for simple cache
        const store = new Map<K, { value: V; expiresAt: number }>()
        const ttlMs = Duration.toMillis(options.ttl)

        const cleanup = () => {
          const now = Date.now()
          for (const [key, entry] of store) {
            if (entry.expiresAt <= now) {
              store.delete(key)
            }
          }
          // Evict oldest if over capacity
          while (store.size > options.capacity) {
            const oldestKey = store.keys().next().value
            if (oldestKey !== undefined) {
              store.delete(oldestKey)
            }
          }
        }

        return {
          get: (key: K) =>
            Effect.sync(() => {
              const entry = store.get(key)
              if (!entry || entry.expiresAt <= Date.now()) {
                store.delete(key)
                return Option.none<V>()
              }
              return Option.some(entry.value)
            }),
          set: (key: K, value: V) =>
            Effect.sync(() => {
              cleanup()
              store.set(key, { value, expiresAt: Date.now() + ttlMs })
            }),
          delete: (key: K) =>
            Effect.sync(() => {
              store.delete(key)
            }),
          clear: Effect.sync(() => {
            store.clear()
          })
        } satisfies SimpleCacheHandle<K, V>
      }),

    healthCheck: () => Effect.succeed(true)
  })

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Mock implementation for testing
   */
  static readonly Test = Layer.succeed(this, {
    make: <K, V, E = never>(options: {
      readonly lookup: (key: K) => Effect.Effect<V, E>
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function* () {
        const cache = yield* Cache.make({
          lookup: options.lookup,
          capacity: options.capacity,
          timeToLive: options.ttl
        })

        return {
          get: (key: K) => cache.get(key),
          invalidate: (key: K) => cache.invalidate(key),
          invalidateAll: cache.invalidateAll,
          refresh: (key: K) => cache.refresh(key),
          size: cache.size
        } satisfies CacheHandle<K, V, E>
      }),

    makeSimple: <K, V>(_options: {
      readonly capacity: number
      readonly ttl: Duration.Duration
    }) =>
      Effect.gen(function* () {
        const store = new Map<K, V>()

        return {
          get: (key: K) =>
            Effect.sync(() => Option.fromNullable(store.get(key))),
          set: (key: K, value: V) =>
            Effect.sync(() => {
              store.set(key, value)
            }),
          delete: (key: K) =>
            Effect.sync(() => {
              store.delete(key)
            }),
          clear: Effect.sync(() => {
            store.clear()
          })
        } satisfies SimpleCacheHandle<K, V>
      }),

    healthCheck: () => Effect.succeed(true)
  })

  // ===========================================================================
  // Alias: Live = Memory (default)
  // ===========================================================================

  /**
   * Live Layer - Defaults to Memory layer
   *
   * For Redis-backed distributed caching, use RedisCache layer from layers/
   */
  static readonly Live = ${className}Service.Memory
}
`);

  return builder.toString();
}
