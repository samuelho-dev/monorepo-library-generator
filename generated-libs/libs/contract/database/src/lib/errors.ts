import { Data, Schema } from "effect";

/**
 * Database Domain Errors
 *
 * Defines all error types for database domain operations.
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
 *    export class DatabaseNotFoundError extends Data.TaggedError("DatabaseNotFoundError")<{
 *      readonly message: string;
 *      readonly databaseId: string;
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
 * If you need RPC-serializable errors, see /libs/contract/database/src/lib/rpc.ts
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
 * @see libs/contract/database/src/lib/rpc.ts for RPC-serializable errors
 * @module @custom-repo/contract-database/errors
 */


// ============================================================================
// Domain Errors (Data.TaggedError)
// ============================================================================

// Use Data.TaggedError for domain-level errors that occur in business logic.

// These errors are NOT serializable over RPC by default.


/**
 * Error thrown when database is not found
 */
export class DatabaseNotFoundError extends Data.TaggedError("DatabaseNotFoundError")<{
    readonly message: string;
    readonly databaseId: string;
  }> {
  static create(databaseId: string): DatabaseNotFoundError {
    return new DatabaseNotFoundError({
      message: `Database not found: ${databaseId}`,
      databaseId,
    });
  }

}

/**
 * Error thrown when database validation fails
 */
export class DatabaseValidationError extends Data.TaggedError("DatabaseValidationError")<{
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
  }): DatabaseValidationError {
    return new DatabaseValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value }),
    });
  }

  static fieldRequired(field: string): DatabaseValidationError {
    return new DatabaseValidationError({
      message: `${field} is required`,
      field,
      constraint: "required",
    });
  }

  static fieldInvalid(field: string, constraint: string, value?: unknown): DatabaseValidationError {
    return new DatabaseValidationError({
      message: `${field} is invalid: ${constraint}`,
      field,
      constraint,
      ...(value !== undefined && { value }),
    });
  }

}

/**
 * Error thrown when database already exists
 */
export class DatabaseAlreadyExistsError extends Data.TaggedError("DatabaseAlreadyExistsError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string): DatabaseAlreadyExistsError {
    return new DatabaseAlreadyExistsError({
      message: identifier
        ? `Database already exists: ${identifier}`
        : `Database already exists`,
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Error thrown when database operation is not permitted
 */
export class DatabasePermissionError extends Data.TaggedError("DatabasePermissionError")<{
    readonly message: string;
    readonly operation: string;
    readonly databaseId: string;
    readonly userId?: string;
  }> {
  static create(params: {
    operation: string;
    databaseId: string;
    userId?: string;
  }): DatabasePermissionError {
    return new DatabasePermissionError({
      message: `Operation '${params.operation}' not permitted on database ${params.databaseId}`,
      operation: params.operation,
      databaseId: params.databaseId,
      ...(params.userId !== undefined && { userId: params.userId }),
    });
  }

}

// TODO: Add domain-specific errors here

// Example - State transition error (if domain has status/state machine):

// 

// export class DatabaseInvalidStateError extends Data.TaggedError("DatabaseInvalidStateError")<{

//   readonly message: string;

//   readonly currentState: string;

//   readonly targetState: string;

//   readonly databaseId: string;

// }> {

//   static create(params: {

//     currentState: string;

//     targetState: string;

//     databaseId: string;

//   }) {

//     return new DatabaseInvalidStateError({

//       message: `Cannot transition database from ${params.currentState} to ${params.targetState}`,

//       ...params,

//     });

//   }

// }


/**
 * Union of all domain errors
 */
export type DatabaseDomainError = 
  | DatabaseNotFoundError
  | DatabaseValidationError
  | DatabaseAlreadyExistsError
  | DatabasePermissionError;

// ============================================================================
// Repository Errors (Data.TaggedError)
// ============================================================================

// Repository errors use Data.TaggedError for domain-level operations.

// These errors do NOT cross RPC boundaries - use rpc.ts for network errors.


/**
 * Repository error for database not found
 */
export class DatabaseNotFoundRepositoryError extends Data.TaggedError("DatabaseNotFoundRepositoryError")<{
    readonly message: string;
    readonly databaseId: string;
  }> {
  static create(databaseId: string): DatabaseNotFoundRepositoryError {
    return new DatabaseNotFoundRepositoryError({
      message: `Database not found: ${databaseId}`,
      databaseId,
    });
  }

}

/**
 * Repository error for database validation failures
 */
export class DatabaseValidationRepositoryError extends Data.TaggedError("DatabaseValidationRepositoryError")<{
    readonly message: string;
    readonly field?: string;
    readonly constraint?: string;
  }> {
  static create(params: {
    message: string;
    field?: string;
    constraint?: string;
  }): DatabaseValidationRepositoryError {
    return new DatabaseValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
    });
  }

}

/**
 * Repository error for database conflicts
 */
export class DatabaseConflictRepositoryError extends Data.TaggedError("DatabaseConflictRepositoryError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string): DatabaseConflictRepositoryError {
    return new DatabaseConflictRepositoryError({
      message: identifier
        ? `Database already exists: ${identifier}`
        : `Database already exists`,
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Repository error for database database failures
 */
export class DatabaseDatabaseRepositoryError extends Data.TaggedError("DatabaseDatabaseRepositoryError")<{
    readonly message: string;
    readonly operation: string;
    readonly cause?: string;
  }> {
  static create(params: {
    message: string;
    operation: string;
    cause?: string;
  }): DatabaseDatabaseRepositoryError {
    return new DatabaseDatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause }),
    });
  }

}

/**
 * Union of all repository errors
 */
export type DatabaseRepositoryError = 
  | DatabaseNotFoundRepositoryError
  | DatabaseValidationRepositoryError
  | DatabaseConflictRepositoryError
  | DatabaseDatabaseRepositoryError;

// ============================================================================
// Error Union Types
// ============================================================================


/**
 * All possible database errors
 */
export type DatabaseError = DatabaseDomainError | DatabaseRepositoryError;
