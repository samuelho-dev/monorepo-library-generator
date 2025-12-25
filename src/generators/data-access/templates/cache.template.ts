/**
 * Data Access Cache Template
 *
 * Generates cache/cache.ts file for data-access libraries.
 * Provides read-through caching with automatic invalidation.
 *
 * @module monorepo-library-generator/data-access/cache-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate cache/cache.ts file for data-access library
 *
 * Creates a cache layer with:
 * - Read-through caching for findById
 * - List result caching with pagination keys
 * - Automatic invalidation on write operations
 * - Integration with CacheService from infra-cache
 */
export function generateCacheFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Cache`,
    description: `Read-through cache for ${name} repository operations.

Features:
- Automatic cache population on miss
- TTL-based expiration
- Write-through invalidation
- Configurable capacity

Usage:
- Use ${className}Cache instead of ${className}Repository for cached reads
- Write operations automatically invalidate relevant cache entries`,
    module: `${scope}/data-access-${fileName}/cache`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context", "Option", "Duration"] },
    { from: `${scope}/infra-cache`, imports: ["CacheService"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseError"], isTypeOnly: true },
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] },
    { from: "./repository", imports: [`${className}Repository`] },
    { from: "./shared/errors", imports: [`${className}TimeoutError`], isTypeOnly: true },
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}Id`],
      isTypeOnly: true
    },
    {
      from: `${scope}/types-database`,
      imports: [`${className}Select as ${className}`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Cache Configuration")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Cache configuration options
 */
export interface ${className}CacheConfig {
  /**
   * Maximum number of entries in the cache
   * @default 10_000
   */
  readonly capacity?: number;

  /**
   * Time-to-live for cache entries
   * @default 5 minutes
   */
  readonly ttl?: Duration.Duration;

  /**
   * Time-to-live for list cache entries (shorter due to staleness)
   * @default 1 minute
   */
  readonly listTtl?: Duration.Duration;
}

const DEFAULT_CONFIG: Required<${className}CacheConfig> = {
  capacity: 10_000,
  ttl: Duration.minutes(5),
  listTtl: Duration.minutes(1),
};
`)

  builder.addSectionComment("Cache Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Cache lookup error type (from repository)
 *
 * Matches the actual error types returned by repository operations.
 * This is a transparent passthrough of repository errors.
 */
export type ${className}CacheLookupError = ${className}TimeoutError | DatabaseError;

/**
 * ${className} Cache Interface
 *
 * Provides cached access to ${name} data with automatic invalidation.
 * The getById method may fail with repository lookup errors.
 */
export interface ${className}CacheInterface {
  /**
   * Get ${name} by ID with caching
   * Automatically fetches from repository on cache miss
   * May fail with repository errors on cache miss
   */
  readonly getById: (id: ${className}Id) => Effect.Effect<Option.Option<${className}>, ${className}CacheLookupError>;

  /**
   * Invalidate a specific ${name} from cache
   * Called automatically after update/delete operations
   */
  readonly invalidate: (id: ${className}Id) => Effect.Effect<void>;

  /**
   * Invalidate all ${name} cache entries
   * Called after create operations (affects list queries)
   */
  readonly invalidateAll: () => Effect.Effect<void>;

  /**
   * Get current cache size
   */
  readonly size: Effect.Effect<number>;

  /**
   * Get cache statistics
   */
  readonly stats: Effect.Effect<{
    readonly size: number;
    readonly capacity: number;
    readonly ttlMs: number;
  }>;
}
`)

  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Cache Context Tag
 *
 * Provides cached access to ${name} repository.
 *
 * @example
 * \`\`\`typescript
 * // Use cache instead of repository for reads
 * const program = Effect.gen(function*() {
 *   const cache = yield* ${className}Cache;
 *   const entity = yield* cache.getById("id-123");
 *   return entity;
 * });
 *
 * // Provide cache layer
 * program.pipe(Effect.provide(${className}Cache.Live));
 * \`\`\`
 */
export class ${className}Cache extends Context.Tag("${className}Cache")<
  ${className}Cache,
  ${className}CacheInterface
>() {
  /**
   * Live cache layer with CacheService dependency
   */
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      const cacheService = yield* CacheService;
      const repo = yield* ${className}Repository;
      const logger = yield* LoggingService;
      const metrics = yield* MetricsService;

      const config = DEFAULT_CONFIG;

      // Create cache for entity by ID
      // Type inference handles error/requirements from repo.findById
      const entityCache = yield* cacheService.make({
        lookup: (id: ${className}Id) =>
          repo.findById(id).pipe(
            Effect.tap((result) =>
              Option.isSome(result)
                ? logger.debug("${className}Cache miss, fetched from repository", { id })
                : logger.debug("${className}Cache miss, not found in repository", { id })
            ),
            Effect.withSpan("${className}Cache.lookup")
          ),
        capacity: config.capacity,
        ttl: config.ttl,
      });

      // Track cache metrics
      const hitCounter = yield* metrics.counter("${name.toLowerCase()}_cache_hits_total");
      const missCounter = yield* metrics.counter("${name.toLowerCase()}_cache_misses_total");
      const invalidationCounter = yield* metrics.counter("${name.toLowerCase()}_cache_invalidations_total");

      return {
        getById: (id) =>
          Effect.gen(function*() {
            const sizeBefore = yield* entityCache.size;
            const result = yield* entityCache.get(id);
            const sizeAfter = yield* entityCache.size;

            // If size increased, it was a miss
            if (sizeAfter > sizeBefore) {
              yield* missCounter.increment;
            } else {
              yield* hitCounter.increment;
            }

            return result;
          }).pipe(Effect.withSpan("${className}Cache.getById", { attributes: { id } })),

        invalidate: (id) =>
          Effect.gen(function*() {
            yield* entityCache.invalidate(id);
            yield* invalidationCounter.increment;
            yield* logger.debug("${className}Cache invalidated", { id });
          }).pipe(Effect.withSpan("${className}Cache.invalidate")),

        invalidateAll: () =>
          Effect.gen(function*() {
            yield* entityCache.invalidateAll;
            yield* invalidationCounter.increment;
            yield* logger.debug("${className}Cache invalidated all");
          }).pipe(Effect.withSpan("${className}Cache.invalidateAll")),

        size: entityCache.size,

        stats: Effect.gen(function*() {
          const size = yield* entityCache.size;
          return {
            size,
            capacity: config.capacity,
            ttlMs: Duration.toMillis(config.ttl),
          };
        }),
      };
    })
  );

  /**
   * Test layer with in-memory cache
   */
  static readonly Test = this.Live;

  /**
   * Create cache layer with custom configuration
   */
  static makeLayer(config: ${className}CacheConfig) {
    return Layer.scoped(
      this,
      Effect.gen(function*() {
        const cacheService = yield* CacheService;
        const repo = yield* ${className}Repository;
        const logger = yield* LoggingService;
        const metrics = yield* MetricsService;

        const finalConfig = {
          capacity: config.capacity ?? DEFAULT_CONFIG.capacity,
          ttl: config.ttl ?? DEFAULT_CONFIG.ttl,
          listTtl: config.listTtl ?? DEFAULT_CONFIG.listTtl,
        };

        // Type inference handles error/requirements from repo.findById
        const entityCache = yield* cacheService.make({
          lookup: (id: ${className}Id) =>
            repo.findById(id).pipe(
              Effect.tap((result) =>
                Option.isSome(result)
                  ? logger.debug("${className}Cache miss, fetched from repository", { id })
                  : logger.debug("${className}Cache miss, not found in repository", { id })
              )
            ),
          capacity: finalConfig.capacity,
          ttl: finalConfig.ttl,
        });

        const hitCounter = yield* metrics.counter("${name.toLowerCase()}_cache_hits_total");
        const missCounter = yield* metrics.counter("${name.toLowerCase()}_cache_misses_total");
        const invalidationCounter = yield* metrics.counter("${name.toLowerCase()}_cache_invalidations_total");

        return {
          getById: (id) =>
            Effect.gen(function*() {
              const sizeBefore = yield* entityCache.size;
              const result = yield* entityCache.get(id);
              const sizeAfter = yield* entityCache.size;

              if (sizeAfter > sizeBefore) {
                yield* missCounter.increment;
              } else {
                yield* hitCounter.increment;
              }

              return result;
            }),

          invalidate: (id) =>
            Effect.gen(function*() {
              yield* entityCache.invalidate(id);
              yield* invalidationCounter.increment;
              yield* logger.debug("${className}Cache invalidated", { id });
            }),

          invalidateAll: () =>
            Effect.gen(function*() {
              yield* entityCache.invalidateAll;
              yield* invalidationCounter.increment;
              yield* logger.debug("${className}Cache invalidated all");
            }),

          size: entityCache.size,

          stats: Effect.gen(function*() {
            const size = yield* entityCache.size;
            return {
              size,
              capacity: finalConfig.capacity,
              ttlMs: Duration.toMillis(finalConfig.ttl),
            };
          }),
        };
      })
    );
  }
}
`)

  builder.addSectionComment("Cache-Aware Repository")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create a cache-aware repository wrapper
 *
 * Wraps the repository to:
 * - Use cache for read operations
 * - Invalidate cache on write operations
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const repo = yield* ${className}Repository;
 *   const cache = yield* ${className}Cache;
 *
 *   const cachedRepo = createCachedRepository(repo, cache);
 *
 *   // Reads go through cache
 *   const entity = yield* cachedRepo.findById("id-123");
 *
 *   // Writes invalidate cache
 *   yield* cachedRepo.update("id-123", { name: "updated" });
 * });
 * \`\`\`
 */
export function createCachedRepository(
  repo: Context.Tag.Service<typeof ${className}Repository>,
  cache: ${className}CacheInterface
) {
  return {
    // Read operations use cache
    findById: (id: ${className}Id) => cache.getById(id),

    // Passthrough operations (could be cached with more complex logic)
    findAll: repo.findAll,
    count: repo.count,
    exists: repo.exists,

    // Write operations invalidate cache
    create: (input: Parameters<typeof repo.create>[0]) =>
      repo.create(input).pipe(
        Effect.tap(() => cache.invalidateAll()) // New entity affects lists
      ),

    update: (id: ${className}Id, input: Parameters<typeof repo.update>[1]) =>
      repo.update(id, input).pipe(
        Effect.tap(() => cache.invalidate(id))
      ),

    delete: (id: ${className}Id) =>
      repo.delete(id).pipe(
        Effect.tap(() => cache.invalidate(id))
      ),
  };
}
`)

  return builder.toString()
}
