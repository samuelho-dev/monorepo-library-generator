/**
 * stripe - Validation Utilities
 *
 * Client-safe validation functions (no secrets, no server logic)
 * Safe to export in client.ts
 */

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // TODO: Add Stripe specific validation
  // Example: Check key prefix, length, format
  return apiKey.length >= 10;
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return (
    typeof timeout === "number" && timeout > 0 && timeout <= 300000 // Max 5 minutes
  );
}

/**
 * Validate email format (client-safe)
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format (client-safe)
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate required field
 */
export function validateRequired<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Sanitize string input (client-safe)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input.trim().slice(0, 1000); // Max 1000 chars
}
