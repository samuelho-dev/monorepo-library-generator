/**
 * Validation Configuration
 *
 * Validation patterns and error messages for the wizard.
 * This is presentation data only - used to provide user feedback.
 *
 * @module monorepo-library-generator/cli/interactive/config/validation
 */

/**
 * Validation result from a validation function
 */
export interface ValidationResult {
  readonly isValid: boolean
  readonly error: string | null
}

/**
 * Validation pattern configuration
 */
export const VALIDATION_PATTERNS = {
  name: {
    pattern: /^[a-z][a-z0-9-]*$/,
    requiredError: 'Name is required',
    formatError:
      'Name must start with lowercase letter, contain only lowercase letters, numbers, and hyphens'
  },
  externalService: {
    pattern: /^[a-zA-Z][a-zA-Z0-9-]*$/,
    requiredError: 'External service name is required for provider libraries',
    formatError:
      'External service name must start with a letter, contain only letters, numbers, and hyphens'
  }
} as const

/**
 * Validate a library name
 */
export function validateName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { isValid: false, error: VALIDATION_PATTERNS.name.requiredError }
  }
  if (!VALIDATION_PATTERNS.name.pattern.test(trimmed)) {
    return { isValid: false, error: VALIDATION_PATTERNS.name.formatError }
  }
  return { isValid: true, error: null }
}

/**
 * Validate an external service name
 */
export function validateExternalService(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { isValid: false, error: VALIDATION_PATTERNS.externalService.requiredError }
  }
  if (!VALIDATION_PATTERNS.externalService.pattern.test(trimmed)) {
    return { isValid: false, error: VALIDATION_PATTERNS.externalService.formatError }
  }
  return { isValid: true, error: null }
}
