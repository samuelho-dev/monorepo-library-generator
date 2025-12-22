import { Schema } from "effect";

/**
 * Cache Errors
 *
 * Error types for Cache infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-cache/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Cache service
 *
 * All Cache errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class CacheServiceError extends Schema.TaggedError<CacheServiceError>()(
  "CacheServiceError",
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
export class CacheInternalError extends Schema.TaggedError<CacheInternalError>()(
  "CacheInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class CacheConfigError extends Schema.TaggedError<CacheConfigError>()("CacheConfigError", {
  message: Schema.String,
  field: Schema.optional(Schema.String),
}) {}

/**
 * Connection error - failure to connect to backing service
 */
export class CacheConnectionError extends Schema.TaggedError<CacheConnectionError>()(
  "CacheConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class CacheTimeoutError extends Schema.TaggedError<CacheTimeoutError>()(
  "CacheTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number),
  },
) {}

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
export type CacheError =
  | CacheServiceError
  | CacheInternalError
  | CacheConfigError
  | CacheConnectionError
  | CacheTimeoutError;
