/**
 * Shared Error Template Utilities
 *
 * Re-exports common error generators for use by provider and infra templates.
 *
 * @module monorepo-library-generator/shared/errors
 */

export {
  type ErrorGeneratorConfig,
  type ErrorStyle,
  generateBaseError,
  generateCommonErrors,
  generateConfigError,
  generateConflictError,
  generateConnectionError,
  generateErrorUnion,
  generateInternalError,
  generateNotFoundError,
  generateTimeoutError,
  generateValidationError,
  getCommonErrorNames
} from "./base-errors.template"

export {
  generateTracingConfig,
  generateTraceErrorUtility,
  generateTracingModule
} from "./tracing.template"
