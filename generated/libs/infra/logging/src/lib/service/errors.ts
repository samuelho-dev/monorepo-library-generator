import { Schema } from "effect"

/**
 * Logging Errors
 *
 * Error types for Logging infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-logging/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Logging service
 *
 * All Logging errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class LoggingServiceError extends Schema.TaggedError<LoggingServiceError>()(
  "LoggingServiceError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Internal error - unexpected failures
 *
 * Use for errors that indicate bugs or unexpected conditions.
 */
export class LoggingInternalError extends Schema.TaggedError<LoggingInternalError>()(
  "LoggingInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class LoggingConfigError extends Schema.TaggedError<LoggingConfigError>()(
  "LoggingConfigError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String)
  }
) {}

/**
 * Connection error - failure to connect to backing service
 */
export class LoggingConnectionError extends Schema.TaggedError<LoggingConnectionError>()(
  "LoggingConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class LoggingTimeoutError extends Schema.TaggedError<LoggingTimeoutError>()(
  "LoggingTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number)
  }
) {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Logging error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("LoggingInternalError", (err) => ...)
 * Effect.catchTag("LoggingTimeoutError", (err) => ...)
 * ```
 */
export type LoggingError =
  | LoggingServiceError
  | LoggingInternalError
  | LoggingConfigError
  | LoggingConnectionError
  | LoggingTimeoutError
