import { Data } from "effect"

/**
 * Queue Errors
 *
 * Error types for Queue infrastructure service.

Uses Data.TaggedError for internal infrastructure errors:
- Discriminated union types (pattern matching with Effect.catchTag)
- Non-serializable (stays within service boundaries)
- Transformed to RPC errors at handler boundaries
 *
 * @module @samuelho-dev/infra-queue/errors
 * @see Effect documentation for Data.TaggedError patterns
 */
// ============================================================================
// Error Types
// ============================================================================
/**
 * Base Queue error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class QueueError extends Data.TaggedError(
  "QueueError"
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
export class QueueInternalError extends Data.TaggedError(
  "QueueInternalError"
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
export class QueueConfigError extends Data.TaggedError(
  "QueueConfigError"
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
export class QueueConnectionError extends Data.TaggedError(
  "QueueConnectionError"
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
export class QueueTimeoutError extends Data.TaggedError(
  "QueueTimeoutError"
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
 * Union of all Queue error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("QueueInternalError", (err) => ...)
 * Effect.catchTag("QueueTimeoutError", (err) => ...)
 * ```
 */
export type QueueServiceError =
  | QueueError
  | QueueInternalError
  | QueueConfigError
  | QueueConnectionError
  | QueueTimeoutError
