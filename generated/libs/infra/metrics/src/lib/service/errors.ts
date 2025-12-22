import { Schema } from "effect";

/**
 * Metrics Errors
 *
 * Error types for Metrics infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation
 *
 * @module @myorg/infra-metrics/errors
 * @see Effect documentation for Schema.TaggedError patterns
 */

// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base error class for Metrics service
 *
 * All Metrics errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class MetricsServiceError extends Schema.TaggedError<MetricsServiceError>()(
  "MetricsServiceError",
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
export class MetricsInternalError extends Schema.TaggedError<MetricsInternalError>()(
  "MetricsInternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class MetricsConfigError extends Schema.TaggedError<MetricsConfigError>()(
  "MetricsConfigError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  },
) {}

/**
 * Connection error - failure to connect to backing service
 */
export class MetricsConnectionError extends Schema.TaggedError<MetricsConnectionError>()(
  "MetricsConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class MetricsTimeoutError extends Schema.TaggedError<MetricsTimeoutError>()(
  "MetricsTimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number),
  },
) {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Metrics error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("MetricsInternalError", (err) => ...)
 * Effect.catchTag("MetricsTimeoutError", (err) => ...)
 * ```
 */
export type MetricsError =
  | MetricsServiceError
  | MetricsInternalError
  | MetricsConfigError
  | MetricsConnectionError
  | MetricsTimeoutError;
