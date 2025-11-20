import { Data } from "effect";

/**
 * Env Service Errors
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
 * @module @custom-repo/infra-env/errors
 * @see https://effect.website/docs/api/Data/TaggedError for error patterns
 */

// ============================================================================
// Core Service Errors
// ============================================================================

/**
 * Base Env error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class EnvError extends Data.TaggedError(
  "EnvError"
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
export class EnvNotFoundError extends Data.TaggedError(
  "EnvNotFoundError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Identifier that was not found */
  readonly id: string;
}> {
  static create(id: string): EnvNotFoundError {
    return new EnvNotFoundError({
      message: `Env not found: ${id}`,
      id,
    });
  }
}

/**
 * Validation error
 *
 * Raised when input data fails validation.
 */
export class EnvValidationError extends Data.TaggedError(
  "EnvValidationError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** List of validation errors */
  readonly errors: readonly string[];
}> {
  static create(errors: readonly string[]): EnvValidationError {
    return new EnvValidationError({
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
export class EnvConflictError extends Data.TaggedError(
  "EnvConflictError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Optional identifier of conflicting resource */
  readonly conflictingId?: string;
}> {
  static create(conflictingId?: string): EnvConflictError {
    return new EnvConflictError({
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
export class EnvConfigError extends Data.TaggedError(
  "EnvConfigError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Configuration property that is invalid */
  readonly property: string;
}> {
  static create(property: string, reason: string): EnvConfigError {
    return new EnvConfigError({
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
export class EnvConnectionError extends Data.TaggedError(
  "EnvConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Connection target (service name, host, etc.) */
  readonly target: string;

  /** Underlying connection error */
  readonly cause: unknown;
}> {
  static create(target: string, cause: unknown): EnvConnectionError {
    return new EnvConnectionError({
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
export class EnvTimeoutError extends Data.TaggedError(
  "EnvTimeoutError"
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
  ): EnvTimeoutError {
    return new EnvTimeoutError({
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
export class EnvInternalError extends Data.TaggedError(
  "EnvInternalError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Underlying error cause */
  readonly cause: unknown;
}> {
  static create(reason: string, cause: unknown): EnvInternalError {
    return new EnvInternalError({
      message: `Internal error: ${reason}`,
      cause,
    });
  }
}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Env service errors

Use this type for service method signatures:

@example
```typescript
readonly operation: () => Effect.Effect<Result, EnvServiceError>;
```
 */
export type EnvServiceError =
  | EnvError
  | EnvNotFoundError
  | EnvValidationError
  | EnvConflictError
  | EnvConfigError
  | EnvConnectionError
  | EnvTimeoutError
  | EnvInternalError;

// TODO: Add domain-specific error types here
// Example:
//
// export class EnvBusinessRuleError extends Data.TaggedError(
//   "EnvBusinessRuleError"
// )<{
//   readonly message: string;
//   readonly rule: string;
// }> {
//   static create(rule: string): EnvBusinessRuleError {
//     return new EnvBusinessRuleError({
//       message: `Business rule violated: ${rule}`,
//       rule,
//     });
//   }
// }