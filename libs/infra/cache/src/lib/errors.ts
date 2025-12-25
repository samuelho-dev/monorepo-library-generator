import { Data } from "effect"

/**
 * Cache Errors
 *
 * Error types for Cache infrastructure service.

Uses Data.TaggedError for internal infrastructure errors:
- Discriminated union types (pattern matching with Effect.catchTag)
- Non-serializable (stays within service boundaries)
- Transformed to RPC errors at handler boundaries
 *
 * @module @samuelho-dev/infra-cache/errors
 * @see Effect documentation for Data.TaggedError patterns
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base Cache error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class CacheError extends Data.TaggedError(
  "CacheError"
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
export class CacheInternalError extends Data.TaggedError(
  "CacheInternalError"
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
export class CacheConfigError extends Data.TaggedError(
  "CacheConfigError"
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
export class CacheConnectionError extends Data.TaggedError(
  "CacheConnectionError"
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
export class CacheTimeoutError extends Data.TaggedError(
  "CacheTimeoutError"
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
 * Union of all Cache error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("CacheInternalError", (err) => ...)
 * Effect.catchTag("CacheTimeoutError", (err) => ...)
 * ```
 */
export type CacheServiceError =
  | CacheError
  | CacheInternalError
  | CacheConfigError
  | CacheConnectionError
  | CacheTimeoutError
