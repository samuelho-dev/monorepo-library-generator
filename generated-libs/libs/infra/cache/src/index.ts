/**
 * @custom-repo/infra-cache
 *
 * Cache infrastructure service
Provides Cache functionality for the application.
 *
 * @module @custom-repo/infra-cache
 */

// ============================================================================
// Server-Only Mode: Export Everything from Root
// ============================================================================

// Service interface and layers
export { CacheService } from "./lib/service/interface";
export type { CacheConfig } from "./lib/service/config";
export { defaultCacheConfig, getCacheConfigForEnvironment } from "./lib/service/config";

// Primary layers are static members of CacheService:
// - CacheService.Live (production)
// - CacheService.Test (testing)
// Additional layers:
export { CacheServiceDev } from "./lib/layers/server-layers";

// Error types
export {
  CacheError,
  CacheNotFoundError,
  CacheValidationError,
  CacheConflictError,
  CacheConfigError,
  CacheConnectionError,
  CacheTimeoutError,
  CacheInternalError,
} from "./lib/service/errors";
export type { CacheServiceError } from "./lib/service/errors";