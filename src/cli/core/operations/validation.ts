/**
 * Validation Operations
 *
 * Validation functions for user input.
 *
 * @module monorepo-library-generator/cli/core/operations/validation
 */

import type { ValidationResult } from "../types"

/**
 * Validation patterns and error messages
 */
export const VALIDATION_PATTERNS = {
  name: {
    pattern: /^[a-z][a-z0-9-]*$/,
    requiredError: "Name is required",
    formatError:
      "Name must start with lowercase letter, contain only lowercase letters, numbers, and hyphens"
  },
  externalService: {
    pattern: /^[a-zA-Z][a-zA-Z0-9-]*$/,
    requiredError: "External service name is required for provider libraries",
    formatError:
      "External service name must start with a letter, contain only letters, numbers, and hyphens"
  }
} as const

/**
 * Validate a library name
 */
export function validateName(name: string): ValidationResult {
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
export function validateExternalService(name: string): ValidationResult {
  const trimmed = name.trim()
  if (!trimmed) {
    return { isValid: false, error: VALIDATION_PATTERNS.externalService.requiredError }
  }
  if (!VALIDATION_PATTERNS.externalService.pattern.test(trimmed)) {
    return { isValid: false, error: VALIDATION_PATTERNS.externalService.formatError }
  }
  return { isValid: true, error: null }
}

/**
 * Validate comma-separated list of sub-module names
 */
export function validateSubModules(subModules: string): ValidationResult {
  const trimmed = subModules.trim()
  if (!trimmed) {
    return { isValid: true, error: null } // Empty is valid (optional)
  }

  const names = trimmed.split(",").map((n) => n.trim())
  for (const name of names) {
    if (!VALIDATION_PATTERNS.name.pattern.test(name)) {
      return {
        isValid: false,
        error: `Invalid sub-module name "${name}": ${VALIDATION_PATTERNS.name.formatError}`
      }
    }
  }

  return { isValid: true, error: null }
}
