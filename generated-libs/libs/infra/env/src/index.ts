/**
 * @custom-repo/infra-env
 *
 * Env infrastructure service
Provides Env functionality for the application.
 *
 * @module @custom-repo/infra-env
 */

// ============================================================================
// Server-Only Mode: Export Everything from Root
// ============================================================================

// Service interface and layers
export { EnvService } from "./lib/service/interface";
export type { EnvConfig } from "./lib/service/config";
export { defaultEnvConfig, getEnvConfigForEnvironment } from "./lib/service/config";

// Primary layers are static members of EnvService:
// - EnvService.Live (production)
// - EnvService.Test (testing)
// Additional layers:
export { EnvServiceDev } from "./lib/layers/server-layers";

// Error types
export {
  EnvError,
  EnvNotFoundError,
  EnvValidationError,
  EnvConflictError,
  EnvConfigError,
  EnvConnectionError,
  EnvTimeoutError,
  EnvInternalError,
} from "./lib/service/errors";
export type { EnvServiceError } from "./lib/service/errors";