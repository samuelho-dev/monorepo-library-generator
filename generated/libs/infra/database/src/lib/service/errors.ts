import { Schema } from "effect"

/**
 * Database Errors
 *
 * Error types for Database infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-database/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Database service
 *
 * All Database errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class DatabaseServiceError extends Schema.TaggedError<DatabaseServiceError>()(
  "DatabaseServiceError",
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
export class DatabaseInternalError extends Schema.TaggedError<DatabaseInternalError>()(
  "DatabaseInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class DatabaseConfigError extends Schema.TaggedError<DatabaseConfigError>()(
  "DatabaseConfigError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String)
  }
) {}

/**
 * Connection error - failure to connect to backing service
 */
export class DatabaseConnectionError extends Schema.TaggedError<DatabaseConnectionError>()(
  "DatabaseConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class DatabaseTimeoutError extends Schema.TaggedError<DatabaseTimeoutError>()(
  "DatabaseTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number)
  }
) {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Database error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("DatabaseInternalError", (err) => ...)
 * Effect.catchTag("DatabaseTimeoutError", (err) => ...)
 * ```
 */
export type DatabaseError =
  | DatabaseServiceError
  | DatabaseInternalError
  | DatabaseConfigError
  | DatabaseConnectionError
  | DatabaseTimeoutError
