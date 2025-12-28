/**
 * @samuelho-dev/infra-cache
 *
 * Cache infrastructure service

Provides Cache functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @samuelho-dev/infra-cache
 */
// ============================================================================
// Service and Types
// ============================================================================
// Service with static layers (Memory, Test, Live)

export type { CacheError, CacheServiceError } from './lib/errors'
// ============================================================================
// Error Types
// ============================================================================
// Error types for error handling
export {
  CacheConfigError,
  CacheConnectionError,
  CacheInternalError,
  CacheTimeoutError
} from './lib/errors'
// ============================================================================
// Additional Layers
// ============================================================================
// Redis-backed distributed layer
export { CacheRedisLayer } from './lib/layers'
export type { CacheHandle, SimpleCacheHandle } from './lib/service'
export { CacheService } from './lib/service'
