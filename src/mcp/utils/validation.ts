/**
 * Validation Utilities
 *
 * Effect Schema validation helpers for MCP tool handlers.
 */

import { Data, ParseResult } from 'effect'

/**
 * Validation Error
 *
 * Tagged error for validation failures with structured error information.
 * Preserves the original ParseResult.ParseError for debugging.
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string
  readonly cause?: ParseResult.ParseError
}> {}

/**
 * Format ParseResult error as human-readable string
 *
 * Uses TreeFormatter for properly structured, user-friendly error messages.
 */
export const formatParseError = (error: ParseResult.ParseError) => {
  return ParseResult.TreeFormatter.formatErrorSync(error)
}
