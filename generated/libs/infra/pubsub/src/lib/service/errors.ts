import { Schema } from "effect";

/**
 * Pubsub Errors
 *
 * Error types for Pubsub infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-pubsub/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Pubsub service
 *
 * All Pubsub errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class PubsubServiceError extends Schema.TaggedError<PubsubServiceError>()(
  "PubsubServiceError",
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
export class PubsubInternalError extends Schema.TaggedError<PubsubInternalError>()(
  "PubsubInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class PubsubConfigError extends Schema.TaggedError<PubsubConfigError>()(
  "PubsubConfigError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  },
) {}

/**
 * Connection error - failure to connect to backing service
 */
export class PubsubConnectionError extends Schema.TaggedError<PubsubConnectionError>()(
  "PubsubConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class PubsubTimeoutError extends Schema.TaggedError<PubsubTimeoutError>()(
  "PubsubTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number),
  },
) {}

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
export type PubsubError =
  | PubsubServiceError
  | PubsubInternalError
  | PubsubConfigError
  | PubsubConnectionError
  | PubsubTimeoutError;
