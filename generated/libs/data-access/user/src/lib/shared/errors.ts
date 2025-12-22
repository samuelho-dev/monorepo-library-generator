import { Data } from "effect"

/**
 * User Domain Error Types
 *
 * Defines domain-specific error types using Effect's Data.TaggedError pattern.
These errors are thrown by repository operations and should be caught
at the service/feature layer for proper error handling and user feedback.

ARCHITECTURE: All errors use Data.TaggedError for:
- Discriminated unions (_tag property for pattern matching)
- Effect integration (Effect.catchTag support)
- Type safety (no instanceof checks needed)
- Proper error channel composition

TODO: Customize this file:
1. Add domain-specific error types beyond the base set
2. Document error conditions and recovery strategies
3. Add structured error data properties
4. Add custom factory methods for error creation

@see https://effect.website/docs/guides/error-management/error-channel-operations for patterns
@see https://effect.website/docs/other/data/tagged-error for Data.TaggedError
 *
 * @module @myorg/data-access-user/server
 */



// ============================================================================
// Base Error Type
// ============================================================================


/**
 * Base error type for all User domain errors
 *
 * All User-specific errors should extend this type.
 * This allows for centralized error handling at higher layers.
 *
 * @example
 * ```typescript
 * // Catch all User errors
 * const result = yield* operation.pipe(
 *   Effect.catchTag("UserError", (error) => {
 *     console.error(`User error: ${error.message}`, { cause: error.cause });
 *     return Effect.fail(new ServiceError("Operation failed"));
 *   })
 * );
 * ```
 */
export class UserError extends Data.TaggedError(
  "UserError"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Domain-Specific Error Types
// ============================================================================


/**
 * Error thrown when a User entity is not found
 *
 * Client error (404). Occurs during lookup operations (findById, findOne).
 *
 * @example
 * ```typescript
 * if (Option.isNone(result)) {
 *   return yield* Effect.fail(UserNotFoundError.create(id));
 * }
 * ```
 */
export class UserNotFoundError extends Data.TaggedError(
  "UserNotFoundError"
)<{
  readonly message: string;
  readonly id: string;
}> {
  static create(id: string) {
    return new UserNotFoundError({
      message: `User not found: ${id}`,
      id,
    });
  }
}

/**
 * Error thrown when input validation fails
 *
 * Client error (400). Occurs when provided data doesn't meet domain requirements.
 *
 * @example
 * ```typescript
 * if (!isValidEmail(email)) {
 *   return yield* Effect.fail(
 *     UserValidationError.create(["Invalid email format"])
 *   );
 * }
 * ```
 */
export class UserValidationError extends Data.TaggedError(
  "UserValidationError"
)<{
  readonly message: string;
  readonly errors: readonly string[];
}> {
  static create(errors: readonly string[]) {
    return new UserValidationError({
      message: "Validation failed",
      errors,
    });
  }
}

/**
 * Error thrown when operation violates unique constraints
 *
 * Client error (409 Conflict). Occurs when trying to create/update an entity
 * with duplicate values that violate unique constraints.
 *
 * @example
 * ```typescript
 * if (existingEmail) {
 *   return yield* Effect.fail(
 *     UserConflictError.create("Email already registered")
 *   );
 * }
 * ```
 */
export class UserConflictError extends Data.TaggedError(
  "UserConflictError"
)<{
  readonly message: string;
  readonly conflictingId?: string;
}> {
  static create(conflictingId?: string) {
    return new UserConflictError({
      message: conflictingId
        ? `Resource already exists: ${conflictingId}`
        : "Resource already exists",
      ...(conflictingId !== undefined && { conflictingId }),
    });
  }
}

/**
 * Error thrown for configuration issues
 *
 * Configuration error. Occurs when service is misconfigured or required
 * configuration is missing.
 */
export class UserConfigError extends Data.TaggedError(
  "UserConfigError"
)<{
  readonly message: string;
  readonly property: string;
}> {
  static create(property: string, reason: string) {
    return new UserConfigError({
      message: `Invalid configuration for ${property}: ${reason}`,
      property,
    });
  }
}

/**
 * Error thrown when connection to external service fails
 *
 * Server error (503). Occurs when unable to connect to database or other services.
 */
export class UserConnectionError extends Data.TaggedError(
  "UserConnectionError"
)<{
  readonly message: string;
  readonly target: string;
  readonly cause: unknown;
}> {
  static create(target: string, cause: unknown) {
    return new UserConnectionError({
      message: `Failed to connect to ${target}`,
      target,
      cause,
    });
  }
}

/**
 * Error thrown when operation exceeds timeout
 *
 * Server error (504). Occurs when database query or external call takes too long.
 */
export class UserTimeoutError extends Data.TaggedError(
  "UserTimeoutError"
)<{
  readonly message: string;
  readonly operation: string;
  readonly timeoutMs: number;
}> {
  static create(operation: string, timeoutMs: number) {
    return new UserTimeoutError({
      message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
      operation,
      timeoutMs,
    });
  }
}

/**
 * Error thrown when an internal system error occurs
 *
 * Server error (500). Occurs for database errors, network issues, or unexpected failures.
 * This is a catch-all for errors that should not happen in normal operation.
 *
 * @example
 * ```typescript
 * try {
 *   // database operation
 * } catch (error) {
 *   return yield* Effect.fail(
 *     UserInternalError.create("Failed to save User", error)
 *   );
 * }
 * ```
 */
export class UserInternalError extends Data.TaggedError(
  "UserInternalError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {
  static create(reason: string, cause: unknown) {
    return new UserInternalError({
      message: `Internal error: ${reason}`,
      cause,
    });
  }
}

// ============================================================================
// Error Type Union
// ============================================================================


/**
 * Union of all User repository errors

Use this type for repository method signatures:

@example
```typescript
export interface UserRepository {
  readonly findById: (id: string) => Effect.Effect<
    Option.Option<User>,
    UserRepositoryError
  >;
}
```
 */
export type UserRepositoryError =
  | UserError
  | UserNotFoundError
  | UserValidationError
  | UserConflictError
  | UserConfigError
  | UserConnectionError
  | UserTimeoutError
  | UserInternalError;

// ============================================================================
// Type Guards (using _tag property)
// ============================================================================


export function isUserNotFoundError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserNotFoundError"
  );
}

export function isUserValidationError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserValidationError"
  );
}

export function isUserConflictError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserConflictError"
  );
}

export function isUserConfigError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserConfigError"
  );
}

export function isUserConnectionError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserConnectionError"
  );
}

export function isUserTimeoutError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserTimeoutError"
  );
}

export function isUserInternalError(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "UserInternalError"
  );
}

// TODO: Add domain-specific error types here
// Example:
//
// export class UserBusinessRuleError extends Data.TaggedError(
//   "UserBusinessRuleError"
// )<{
//   readonly message: string;
//   readonly rule: string;
// }> {
//   static create(rule: string): UserBusinessRuleError {
//     return new UserBusinessRuleError({
//       message: `Business rule violated: ${rule}`,
//       rule,
//     });
//   }
// }
