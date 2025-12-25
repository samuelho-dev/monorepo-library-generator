import { Data } from "effect"
import type { UserRepositoryError } from "@samuelho-dev/contract-user"

/**
 * User Data Access Errors
 *
 * Re-exports domain errors from contract and adds infrastructure-specific errors.

CONTRACT-FIRST ARCHITECTURE:
This file follows the contract-first pattern where:
- Domain errors (NotFound, Validation, etc.) are defined in @@samuelho-dev/contract-user
- Data-access layer re-exports these as the single source of truth
- Only infrastructure-specific errors are defined here

Error Categories:
1. Domain Errors (from contract):
   - UserNotFoundError - Entity not found
   - UserValidationError - Input validation failed
   - UserAlreadyExistsError - Duplicate entity
   - UserPermissionError - Operation not permitted

2. Repository Errors (from contract):
   - UserNotFoundRepositoryError - Repository-level not found
   - UserValidationRepositoryError - Repository-level validation
   - UserConflictRepositoryError - Repository-level conflict
   - UserDatabaseRepositoryError - Database operation failure

3. Infrastructure Errors (defined here):
   - UserConnectionError - Database connection failure
   - UserTimeoutError - Operation timeout
   - UserTransactionError - Transaction failure

@see @samuelho-dev/contract-user/errors for domain error definitions
@see https://effect.website/docs/guides/error-management
 *
 * @module @samuelho-dev/data-access-user/errors
 */



// ============================================================================
// Domain Errors (Re-exported from Contract)
// ============================================================================

// Contract library is the SINGLE SOURCE OF TRUTH for domain errors.

// Data-access and feature layers should import from contract.


/**
 * Re-export all domain errors from contract library
 *
 * CONTRACT-FIRST: These errors are defined in @samuelho-dev/contract-user
 * and re-exported here for convenience. The contract library is the
 * single source of truth for all domain error definitions.
 */
export {
  // Domain Errors
  UserNotFoundError,
  UserValidationError,
  UserAlreadyExistsError,
  UserPermissionError,
  type UserDomainError,

  // Repository Errors
  UserNotFoundRepositoryError,
  UserValidationRepositoryError,
  UserConflictRepositoryError,
  UserDatabaseRepositoryError,
  type UserRepositoryError,

  // Combined Error Type
  type UserError,
} from "@samuelho-dev/contract-user";

// ============================================================================
// Infrastructure Errors (Data-Access Specific)
// ============================================================================

// These errors are specific to data-access infrastructure operations.

// They do not exist in the contract layer as they are implementation details.


/**
 * Error thrown when database/service connection fails.

Server error (503). This is an infrastructure error that occurs when
the data layer cannot establish a connection to the underlying database
or external service.
 */
export class UserConnectionError extends Data.TaggedError(
  "UserConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Connection target (service name, host, etc.) */
  readonly target: string;

  /** Underlying connection error */
  readonly cause?: unknown;
}> {
  static create(target: string, cause?: unknown) {
    return new UserConnectionError({
      message: `Failed to connect to ${target}`,
      target,
      ...(cause !== undefined && { cause }),
    });
  }
}

/**
 * Error thrown when database operation exceeds timeout.

Server error (504). This is an infrastructure error that occurs when
a database query or transaction takes longer than the configured timeout.
 */
export class UserTimeoutError extends Data.TaggedError(
  "UserTimeoutError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Operation that timed out */
  readonly operation: string;

  /** Timeout duration in milliseconds */
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
 * Error thrown when database transaction fails.

Server error (500). This is an infrastructure error that occurs when
a database transaction cannot be started, committed, or rolled back.
 */
export class UserTransactionError extends Data.TaggedError(
  "UserTransactionError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Transaction operation that failed */
  readonly operation: string;

  /** Transaction phase that failed */
  readonly phase: "begin" | "commit" | "rollback";

  /** Underlying database error */
  readonly cause?: unknown;
}> {
  static create(operation: string, phase: "begin" | "commit" | "rollback", cause?: unknown) {
    return new UserTransactionError({
      message: `Transaction ${phase} failed during ${operation}`,
      operation,
      phase,
      ...(cause !== undefined && { cause }),
    });
  }
}

// ============================================================================
// Infrastructure Error Union Type
// ============================================================================


/**
 * Union of infrastructure-specific errors
 *
 * These errors are specific to data-access operations and do not
 * appear in the contract layer. They should be caught and mapped
 * to repository errors at the data-access boundary.
 */
export type UserInfrastructureError = 
  | UserConnectionError
  | UserTimeoutError
  | UserTransactionError

// ============================================================================
// Combined Data Access Error Type
// ============================================================================


/**
 * All possible data-access layer errors
 *
 * Use this type for repository method signatures:
 *
 * @example
 * ```typescript
 * export interface UserRepository {
 *   readonly findById: (id: string) => Effect.Effect<
 *     Option.Option<User>,
 *     UserDataAccessError
 *   >;
 * }
 * ```
 */
export type UserDataAccessError = UserRepositoryError | UserInfrastructureError

