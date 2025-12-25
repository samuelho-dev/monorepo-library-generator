import { Data } from "effect"

/**
 * Pubsub Errors
 *
 * Error types for Pubsub infrastructure service.

Uses Data.TaggedError for internal infrastructure errors:
- Discriminated union types (pattern matching with Effect.catchTag)
- Non-serializable (stays within service boundaries)
- Transformed to RPC errors at handler boundaries
 *
 * @module @samuelho-dev/infra-pubsub/errors
 * @see Effect documentation for Data.TaggedError patterns
 */
// ============================================================================
// Error Types
// ============================================================================
/**
 * Base Pubsub error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class PubsubError extends Data.TaggedError(
  "PubsubError"
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
export class PubsubInternalError extends Data.TaggedError(
  "PubsubInternalError"
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
export class PubsubConfigError extends Data.TaggedError(
  "PubsubConfigError"
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
export class PubsubConnectionError extends Data.TaggedError(
  "PubsubConnectionError"
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
export class PubsubTimeoutError extends Data.TaggedError(
  "PubsubTimeoutError"
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
 * Union of all Pubsub error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("PubsubInternalError", (err) => ...)
 * Effect.catchTag("PubsubTimeoutError", (err) => ...)
 * ```
 */
export type PubsubServiceError =
  | PubsubError
  | PubsubInternalError
  | PubsubConfigError
  | PubsubConnectionError
  | PubsubTimeoutError
