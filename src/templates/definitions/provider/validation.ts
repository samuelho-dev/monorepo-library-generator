/**
 * Provider Validation Template Definition
 *
 * Declarative template for generating lib/validation.ts in provider libraries.
 * Contains client-safe validation utilities.
 *
 * @module monorepo-library-generator/templates/definitions/provider/validation
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Provider Validation Template Definition
 *
 * Generates a validation.ts file with:
 * - Configuration validation
 * - Input validation
 * - Common validators (email, URL, etc.)
 * - Sanitization utilities
 *
 * All functions are client-safe (no secrets, no server logic).
 */
export const providerValidationTemplate: TemplateDefinition = {
  id: "provider/validation",
  meta: {
    title: "{name} - Validation Utilities",
    description: `Client-safe validation functions (no secrets, no server logic)
Safe to export in client.ts`,
    module: "{scope}/provider-{fileName}/lib/validation"
  },
  imports: [
    {
      from: "./types",
      items: ["{className}Config"],
      isTypeOnly: true
    }
  ],
  sections: [
    // Configuration Validation
    {
      title: "Configuration Validation",
      content: {
        type: "raw",
        value: `/**
 * Validate {className} configuration
 *
 * @param config - Configuration to validate
 * @returns true if configuration is valid
 */
export function validate{className}Config(config: unknown): config is {className}Config {
  if (!config || typeof config !== "object") {
    return false
  }

  const cfg = config as Record<string, unknown>

  // API key is required and must be a non-empty string
  if (!cfg.apiKey || typeof cfg.apiKey !== "string" || cfg.apiKey.length < 10) {
    return false
  }

  // Timeout must be positive if provided
  if (cfg.timeout !== undefined) {
    if (typeof cfg.timeout !== "number" || cfg.timeout <= 0 || cfg.timeout > 300000) {
      return false
    }
  }

  // Base URL must be valid if provided
  if (cfg.baseUrl !== undefined) {
    if (typeof cfg.baseUrl !== "string") {
      return false
    }
    try {
      new URL(cfg.baseUrl)
    } catch {
      return false
    }
  }

  return true
}`
      }
    },
    // Input Validation
    {
      title: "Input Validation",
      content: {
        type: "raw",
        value: `/**
 * Validate {className} input
 *
 * Generic input validation for API calls.
 *
 * @param input - Input to validate
 * @returns true if input is valid
 */
export function validate{className}Input(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false
  }

  // Add specific validation rules based on your API requirements
  return true
}`
      }
    },
    // Common Validators
    {
      title: "Common Validators",
      content: {
        type: "raw",
        value: `/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false
  }

  // TODO: Add {externalService} specific validation
  // Example: Check key prefix, length, format
  return apiKey.length >= 10
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return typeof timeout === "number" && timeout > 0 && timeout <= 300000 // Max 5 minutes
}

/**
 * Validate email format (client-safe)
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false
  }

  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format (client-safe)
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }

  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate required field
 */
export function validateRequired<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== ""
}`
      }
    },
    // Sanitization
    {
      title: "Sanitization Utilities",
      content: {
        type: "raw",
        value: `/**
 * Sanitize string input (client-safe)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input.trim().slice(0, 1000) // Max 1000 chars
}`
      }
    }
  ]
}

export default providerValidationTemplate
