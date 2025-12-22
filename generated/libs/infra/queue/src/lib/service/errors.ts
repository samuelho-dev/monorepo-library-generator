import { Schema } from "effect";

/**
 * Queue Errors
 *
 * Error types for Queue infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-queue/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Queue service
 *
 * All Queue errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class QueueServiceError extends Schema.TaggedError<QueueServiceError>()(
  "QueueServiceError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Internal error - unexpected failures
 *
 * Use for errors that indicate bugs or unexpected conditions.
 */
export class QueueInternalError extends Schema.TaggedError<QueueInternalError>()(
  "QueueInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class QueueConfigError extends Schema.TaggedError<QueueConfigError>()("QueueConfigError", {
  message: Schema.String,
  field: Schema.optional(Schema.String),
}) {}

/**
 * Connection error - failure to connect to backing service
 */
export class QueueConnectionError extends Schema.TaggedError<QueueConnectionError>()(
  "QueueConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class QueueTimeoutError extends Schema.TaggedError<QueueTimeoutError>()(
  "QueueTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number),
  },
) {}

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
export type QueueError =
  | QueueServiceError
  | QueueInternalError
  | QueueConfigError
  | QueueConnectionError
  | QueueTimeoutError;
