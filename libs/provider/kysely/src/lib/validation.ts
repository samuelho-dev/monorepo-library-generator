import type { KyselyConfig } from "./types"

/**
 * kysely - Validation Utilities
 *
 * Client-safe validation functions (no secrets, no server logic)
 * Safe to export in client.ts
 */

/**
 * Validate Kysely configuration
 *
 * @param config - Configuration to validate
 * @returns true if configuration is valid
 */
export function validateKyselyConfig(config: unknown): config is KyselyConfig {
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
}
/**
 * Validate Kysely input
 *
 * Generic input validation for API calls.
 *
 * @param input - Input to validate
 * @returns true if input is valid
 */
export function validateKyselyInput(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false
  }

  // Add specific validation rules based on your API requirements
  return true
}
/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string) {
  if (!apiKey || typeof apiKey !== "string") {
    return false
  }

  // TODO: Add Kysely specific validation
  // Example: Check key prefix, length, format
  return apiKey.length >= 10
}
/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number) {
  return (
    typeof timeout === "number" && timeout > 0 && timeout <= 300000 // Max 5 minutes
  )
}
/**
 * Validate email format (client-safe)
 */
export function validateEmail(email: string) {
  if (!email || typeof email !== "string") {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
/**
 * Validate URL format (client-safe)
 */
export function validateUrl(url: string) {
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
export function validateRequired<T>(value: T | null | undefined) {
  return value !== null && value !== undefined && value !== ""
}
/**
 * Sanitize string input (client-safe)
 */
export function sanitizeString(input: string) {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input.trim().slice(0, 1000) // Max 1000 chars
}
