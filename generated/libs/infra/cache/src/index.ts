/**
 * @myorg/infra-cache
 *
 * Cache infrastructure service

Provides Cache functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-cache
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  CacheService,
  type CacheHandle,
  type SimpleCacheHandle
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  CacheServiceError,
  CacheInternalError,
  CacheConfigError,
  CacheConnectionError,
  CacheTimeoutError,
  type CacheError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// Redis-backed distributed layer
export {
  CacheRedisLayer,
  RedisClientTag,
  type RedisClient
} from "./lib/layers/redis-layer"
