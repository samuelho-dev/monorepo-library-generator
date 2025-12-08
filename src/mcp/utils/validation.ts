/**
 * Validation Utilities
 *
 * Effect Schema validation helpers for MCP tool handlers.
 */

import { Effect, ParseResult } from "effect"

/**
 * Validation Error
 */
export class ValidationError extends Error {
  readonly _tag = "ValidationError"

  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

/**
 * Format ParseResult error as human-readable string
 */
export const formatParseError = (error: ParseResult.ParseError) => {
  return Effect.runSync(ParseResult.TreeFormatter.formatError(error))
}

/**
 * Format validation error for MCP response
 */
export const formatValidationError = (error: ValidationError) => {
  return [
    "❌ Validation Error",
    "",
    error.message,
    "",
    "💡 Tips:",
    "  - Check that all required fields are provided",
    "  - Ensure values match the expected format",
    "  - Use --dryRun to preview without validation errors"
  ].join("\n")
}
