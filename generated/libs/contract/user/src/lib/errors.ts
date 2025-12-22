import { Data } from "effect"

/**
 * User Domain Errors
 *
 * Defines all error types for user domain operations.
 *
 * ERROR TYPE SELECTION GUIDE:
 * ===========================
 *
 * 1. Data.TaggedError - For Domain & Repository Errors (DEFAULT CHOICE)
 *    ✅ Use when: Errors stay within your service boundary (same process)
 *    ✅ Use when: Repository errors, business logic errors, service errors
 *    ✅ Benefits: Lightweight, better performance, simpler API
 *    ✅ Pattern: Used in this template by default
 *    ❌ Cannot: Serialize over network boundaries (RPC, HTTP)
 *
 *    Example:
 *    ```typescript
 *    export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
 *      readonly message: string;
 *      readonly userId: string;
 *    }> {}
 *    ```
 *
 * 2. Schema.TaggedError - For RPC/Network Boundaries (SPECIAL CASES ONLY)
 *    ✅ Use when: Errors cross network boundaries (client ↔ server RPC)
 *    ✅ Use when: Building APIs that expose errors to external clients
 *    ✅ Benefits: Fully serializable, can cross process boundaries
 *    ✅ Example use cases:
 *       - tRPC procedures that return errors to frontend
 *       - Microservice RPC calls between services
 *       - Public API error responses
 *    ⚠️  Caution: More complex API, requires Schema definitions
 *    ⚠️  Overhead: Adds serialization/deserialization cost
 *
 * IMPORTANT DECISION:
 * This template uses Data.TaggedError for ALL errors (domain + repository).
 * This is CORRECT for most use cases because:
 * - Repository errors stay within the same process (data-access → feature)
 * - Service errors stay within the same process (feature → app)
 * - Only when building RPC endpoints (e.g., tRPC) should you use Schema.TaggedError
 *
 * If you need RPC-serializable errors, see /libs/contract/user/src/lib/rpc.ts
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific error types as needed (use Data.TaggedError)
 * 2. Add helper factory methods for common error scenarios
 * 3. Consider adding:
 *    - State transition errors (if domain has state machine)
 *    - Business rule violation errors
 *    - Resource conflict errors
 * 4. ONLY if building RPC APIs: Add Schema.TaggedError variants in rpc.ts
 *
 * @see https://effect.website/docs/guides/error-management for error handling
 * @see libs/contract/user/src/lib/rpc.ts for RPC-serializable errors
 * @module @myorg/contract-user/errors
 */


// ============================================================================
// Domain Errors (Data.TaggedError)
// ============================================================================

// Use Data.TaggedError for domain-level errors that occur in business logic.

// These errors are NOT serializable over RPC by default.


/**
 * Error thrown when user is not found
 */
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
    readonly message: string;
    readonly userId: string;
  }> {
  static create(userId: string) {
    return new UserNotFoundError({
      message: `User not found: ${userId}`,
      userId,
    });
  }

}

/**
 * Error thrown when user validation fails
 */
export class UserValidationError extends Data.TaggedError("UserValidationError")<{
    readonly message: string;
    readonly field?: string;
    readonly constraint?: string;
    readonly value?: unknown;
  }> {
  static create(params: {
    message: string;
    field?: string;
    constraint?: string;
    value?: unknown;
  }) {
    return new UserValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value }),
    });
  }

  static fieldRequired(field: string) {
    return new UserValidationError({
      message: `${field} is required`,
      field,
      constraint: "required",
    });
  }

  static fieldInvalid(field: string, constraint: string, value?: unknown) {
    return new UserValidationError({
      message: `${field} is invalid: ${constraint}`,
      field,
      constraint,
      ...(value !== undefined && { value }),
    });
  }

}

/**
 * Error thrown when user already exists
 */
export class UserAlreadyExistsError extends Data.TaggedError("UserAlreadyExistsError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string) {
    return new UserAlreadyExistsError({
      message: identifier
        ? `User already exists: ${identifier}`
        : "User already exists",
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Error thrown when user operation is not permitted
 */
export class UserPermissionError extends Data.TaggedError("UserPermissionError")<{
    readonly message: string;
    readonly operation: string;
    readonly userId: string;
  }> {
  static create(params: {
    operation: string;
    userId: string;
  }) {
    return new UserPermissionError({
      message: `Operation '${params.operation}' not permitted on user ${params.userId}`,
      operation: params.operation,
      userId: params.userId,
    });
  }

}

// TODO: Add domain-specific errors here

// Example - State transition error (if domain has status/state machine):

// 

// export class UserInvalidStateError extends Data.TaggedError("UserInvalidStateError")<{

//   readonly message: string;

//   readonly currentState: string;

//   readonly targetState: string;

//   readonly userId: string;

// }> {

//   static create(params: {

//     currentState: string;

//     targetState: string;

//     userId: string;

//   }) {

//     return new UserInvalidStateError({

//       message: `Cannot transition user from ${params.currentState} to ${params.targetState}`,

//       ...params,

//     });

//   }

// }


/**
 * Union of all domain errors
 */
export type UserDomainError = 
  | UserNotFoundError
  | UserValidationError
  | UserAlreadyExistsError
  | UserPermissionError

// ============================================================================
// Repository Errors (Data.TaggedError)
// ============================================================================

// Repository errors use Data.TaggedError for domain-level operations.

// These errors do NOT cross RPC boundaries - use rpc.ts for network errors.


/**
 * Repository error for user not found
 */
export class UserNotFoundRepositoryError extends Data.TaggedError("UserNotFoundRepositoryError")<{
    readonly message: string;
    readonly userId: string;
  }> {
  static create(userId: string) {
    return new UserNotFoundRepositoryError({
      message: `User not found: ${userId}`,
      userId,
    });
  }

}

/**
 * Repository error for user validation failures
 */
export class UserValidationRepositoryError extends Data.TaggedError("UserValidationRepositoryError")<{
    readonly message: string;
    readonly field?: string;
    readonly constraint?: string;
  }> {
  static create(params: {
    message: string;
    field?: string;
    constraint?: string;
  }) {
    return new UserValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
    });
  }

}

/**
 * Repository error for user conflicts
 */
export class UserConflictRepositoryError extends Data.TaggedError("UserConflictRepositoryError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string) {
    return new UserConflictRepositoryError({
      message: identifier
        ? `User already exists: ${identifier}`
        : "User already exists",
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Repository error for user database failures
 */
export class UserDatabaseRepositoryError extends Data.TaggedError("UserDatabaseRepositoryError")<{
    readonly message: string;
    readonly operation: string;
    readonly cause?: string;
  }> {
  static create(params: {
    message: string;
    operation: string;
    cause?: string;
  }) {
    return new UserDatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause }),
    });
  }

}

/**
 * Union of all repository errors
 */
export type UserRepositoryError = 
  | UserNotFoundRepositoryError
  | UserValidationRepositoryError
  | UserConflictRepositoryError
  | UserDatabaseRepositoryError

// ============================================================================
// Error Union Types
// ============================================================================


/**
 * All possible user errors
 */
export type UserError = UserDomainError | UserRepositoryError
