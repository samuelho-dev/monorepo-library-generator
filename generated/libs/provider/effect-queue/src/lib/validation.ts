/**
 * effect-queue - Validation Utilities
 *
 * Client-safe validation functions (no secrets, no server logic)
 * Safe to export in client.ts
 */

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string) {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // TODO: Add Effect.Queue specific validation
  // Example: Check key prefix, length, format
  return apiKey.length >= 10;
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number) {
  return (
    typeof timeout === "number" && timeout > 0 && timeout <= 300000 // Max 5 minutes
  );
}

/**
 * Validate email format (client-safe)
 */
export function validateEmail(email: string) {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format (client-safe)
 */
export function validateUrl(url: string) {
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
export function validateRequired<T>(value: T | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Sanitize string input (client-safe)
 */
export function sanitizeString(input: string) {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input.trim().slice(0, 1000); // Max 1000 chars
}
