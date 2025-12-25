import { Data } from "effect"

/**
 * Database Errors
 *
 * Error types for Database infrastructure service.

Uses Data.TaggedError for internal infrastructure errors:
- Discriminated union types (pattern matching with Effect.catchTag)
- Non-serializable (stays within service boundaries)
- Transformed to RPC errors at handler boundaries
 *
 * @module @samuelho-dev/infra-database/errors
 * @see Effect documentation for Data.TaggedError patterns
 */
// ============================================================================
// Error Types
// ============================================================================
/**
 * Base Database error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class DatabaseError extends Data.TaggedError(
  "DatabaseError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Optional underlying cause */
  readonly cause?: unknown
}> {}

/**
 * Internal error
 *
 * Raised when unexpected internal error occurs.
 */
export class DatabaseInternalError extends Data.TaggedError(
  "DatabaseInternalError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Underlying error cause */
  readonly cause: unknown
}> {}

/**
 * Configuration error
 *
 * Raised when service is misconfigured.
 */
export class DatabaseConfigError extends Data.TaggedError(
  "DatabaseConfigError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Configuration property that is invalid */
  readonly property: string
}> {}

/**
 * Connection error
 *
 * Raised when connection to external service fails.
 */
export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Connection target (service name, host, etc.) */
  readonly target: string
  /** Underlying connection error */
  readonly cause: unknown
}> {}

/**
 * Timeout error
 *
 * Raised when operation exceeds timeout.
 */
export class DatabaseTimeoutError extends Data.TaggedError(
  "DatabaseTimeoutError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Timeout duration in milliseconds */
  readonly timeoutMs: number
  /** Operation that timed out */
  readonly operation: string
}> {}

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
export type DatabaseServiceError =
  | DatabaseError
  | DatabaseInternalError
  | DatabaseConfigError
  | DatabaseConnectionError
  | DatabaseTimeoutError
