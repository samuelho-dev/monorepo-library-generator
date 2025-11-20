import { Data } from "effect";

/**
 * Cache Service Errors
 *
 * Domain errors using Data.TaggedError for proper Effect integration.
These errors are NOT serializable (use in internal operations).
For RPC/network boundaries, use Schema.TaggedError instead.

TODO: Customize this file for your service:
1. Define domain-specific error types
2. Add error context (ids, values, reasons)
3. Document error recovery strategies
4. Add helper constructors for error creation
 *
 * @module @custom-repo/infra-cache/errors
 * @see https://effect.website/docs/api/Data/TaggedError for error patterns
 */

// ============================================================================
// Core Service Errors
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
  readonly message: string;

  /** Optional underlying cause */
  readonly cause?: unknown;
}> {}

/**
 * Resource not found error
 *
 * Raised when requested resource doesn't exist.
 */
export class CacheNotFoundError extends Data.TaggedError(
  "CacheNotFoundError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Identifier that was not found */
  readonly id: string;
}> {
  static create(id: string): CacheNotFoundError {
    return new CacheNotFoundError({
      message: `Cache not found: ${id}`,
      id,
    });
  }
}

/**
 * Validation error
 *
 * Raised when input data fails validation.
 */
export class CacheValidationError extends Data.TaggedError(
  "CacheValidationError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** List of validation errors */
  readonly errors: readonly string[];
}> {
  static create(errors: readonly string[]): CacheValidationError {
    return new CacheValidationError({
      message: "Validation failed",
      errors,
    });
  }
}

/**
 * Conflict error
 *
 * Raised when operation conflicts with existing state (e.g., duplicate).
 */
export class CacheConflictError extends Data.TaggedError(
  "CacheConflictError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Optional identifier of conflicting resource */
  readonly conflictingId?: string;
}> {
  static create(conflictingId?: string): CacheConflictError {
    return new CacheConflictError({
      message: conflictingId
        ? `Resource already exists: ${conflictingId}`
        : "Resource already exists",
      conflictingId,
    });
  }
}

/**
 * Configuration error
 *
 * Raised when service is misconfigured.
 */
export class CacheConfigError extends Data.TaggedError(
  "CacheConfigError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Configuration property that is invalid */
  readonly property: string;
}> {
  static create(property: string, reason: string): CacheConfigError {
    return new CacheConfigError({
      message: `Invalid configuration for ${property}: ${reason}`,
      property,
    });
  }
}

// ============================================================================
// Operation Errors
// ============================================================================

/**
 * Connection error
 *
 * Raised when connection to external service fails.
 */
export class CacheConnectionError extends Data.TaggedError(
  "CacheConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Connection target (service name, host, etc.) */
  readonly target: string;

  /** Underlying connection error */
  readonly cause: unknown;
}> {
  static create(target: string, cause: unknown): CacheConnectionError {
    return new CacheConnectionError({
      message: `Failed to connect to ${target}`,
      target,
      cause,
    });
  }
}

/**
 * Timeout error
 *
 * Raised when operation exceeds timeout.
 */
export class CacheTimeoutError extends Data.TaggedError(
  "CacheTimeoutError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Timeout duration in milliseconds */
  readonly timeoutMs: number;

  /** Operation that timed out */
  readonly operation: string;
}> {
  static create(
    operation: string,
    timeoutMs: number
  ): CacheTimeoutError {
    return new CacheTimeoutError({
      message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
      timeoutMs,
      operation,
    });
  }
}

/**
 * Internal error
 *
 * Raised when unexpected internal error occurs.
 */
export class CacheInternalError extends Data.TaggedError(
  "CacheInternalError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Underlying error cause */
  readonly cause: unknown;
}> {
  static create(reason: string, cause: unknown): CacheInternalError {
    return new CacheInternalError({
      message: `Internal error: ${reason}`,
      cause,
    });
  }
}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Cache service errors

Use this type for service method signatures:

@example
```typescript
readonly operation: () => Effect.Effect<Result, CacheServiceError>;
```
 */
export type CacheServiceError =
  | CacheError
  | CacheNotFoundError
  | CacheValidationError
  | CacheConflictError
  | CacheConfigError
  | CacheConnectionError
  | CacheTimeoutError
  | CacheInternalError;

// TODO: Add domain-specific error types here
// Example:
//
// export class CacheBusinessRuleError extends Data.TaggedError(
//   "CacheBusinessRuleError"
// )<{
//   readonly message: string;
//   readonly rule: string;
// }> {
//   static create(rule: string): CacheBusinessRuleError {
//     return new CacheBusinessRuleError({
//       message: `Business rule violated: ${rule}`,
//       rule,
//     });
//   }
// }