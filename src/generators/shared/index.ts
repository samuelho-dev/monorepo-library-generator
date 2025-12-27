/**
 * Shared Generator Utilities
 *
 * Common template generators shared between provider and infra templates.
 * Using these ensures consistent patterns across all generated libraries
 * and prevents generator drift.
 *
 * @module monorepo-library-generator/shared
 */

// Error utilities (base error generators)
export {
  type ErrorGeneratorConfig,
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
} from "./errors"
// Factory utilities (takes precedence for ErrorStyle)
export * from "./factories"
// Layer utilities
export * from "./layers"
