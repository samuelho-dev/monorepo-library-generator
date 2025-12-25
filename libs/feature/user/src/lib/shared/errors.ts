import { Data } from "effect"
import type { UserDomainError } from "@samuelho-dev/contract-user"

/**
 * User Feature Errors
 *
 * Re-exports domain errors from contract and adds service-level errors.

CONTRACT-FIRST ARCHITECTURE:
This file follows the contract-first pattern where:
- Domain errors (NotFound, Validation, etc.) are defined in @@samuelho-dev/contract-user
- Feature layer re-exports these as the single source of truth
- Service-level errors are defined here using Data.TaggedError

ERROR TYPE SELECTION:
- Data.TaggedError: Internal errors (domain, repository, service)
- Schema.TaggedError: ONLY at RPC boundaries (see rpc.ts)

Error Categories:
1. Domain Errors (from contract):
   - UserNotFoundError - Entity not found
   - UserValidationError - Input validation failed
   - UserAlreadyExistsError - Duplicate entity
   - UserPermissionError - Operation not permitted

2. Service Errors (defined here):
   - UserServiceError - Orchestration/dependency failures

@see @samuelho-dev/contract-user/errors for domain error definitions
 *
 * @module @samuelho-dev/feature-user/shared/errors
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
// Service Errors (Feature Specific)
// ============================================================================

// Service errors wrap lower-level errors at the feature boundary.

// Use Data.TaggedError for internal errors (not serializable over RPC).


/**
 * Service-level error for user feature orchestration
 *
 * Error Codes:
 * - DEPENDENCY: Infrastructure error (database, cache, external service)
 * - ORCHESTRATION: Workflow/coordination error
 * - INTERNAL: Unexpected internal error
 *
 * Usage:
 * ```typescript
 * // Map infrastructure errors to service errors
 * yield* Effect.catchTag("UserConnectionError", (error) =>
 *   Effect.fail(UserServiceError.dependency(
 *     "findById",
 *     "Database connection failed",
 *     error
 *   ))
 * );
 * ```
 */
export class UserServiceError extends Data.TaggedError("UserServiceError")<{
    readonly message: string;
    readonly code: UserServiceErrorCode;
    readonly operation: string;
    readonly cause?: unknown;
  }> {
  static dependency(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "DEPENDENCY",
      operation,
      ...(cause !== undefined && { cause }),
    });
  }

  static orchestration(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "ORCHESTRATION",
      operation,
      ...(cause !== undefined && { cause }),
    });
  }

  static internal(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "INTERNAL",
      operation,
      ...(cause !== undefined && { cause }),
    });
  }

}

/**
 * Service error codes for user feature
 *
 * - DEPENDENCY: Infrastructure dependency failed
 * - ORCHESTRATION: Workflow coordination failed
 * - INTERNAL: Unexpected internal error
 */
export type UserServiceErrorCode = "DEPENDENCY" | "ORCHESTRATION" | "INTERNAL"

// ============================================================================
// Infrastructure Error Re-exports
// ============================================================================

// Re-export infrastructure errors from data-access for service layer error mapping


// Re-export infrastructure errors from data-access
// These are used by mapInfraErrors in the service layer
export {
  UserTimeoutError,
  UserConnectionError,
  UserTransactionError,
  type UserInfrastructureError,
} from "@samuelho-dev/data-access-user";

// ============================================================================
// Combined Feature Error Types
// ============================================================================


/**
 * All possible feature-level errors
 *
 * Domain errors pass through unchanged.
 * Service errors wrap infrastructure/orchestration failures.
 */
export type UserFeatureError = UserDomainError | UserServiceError

