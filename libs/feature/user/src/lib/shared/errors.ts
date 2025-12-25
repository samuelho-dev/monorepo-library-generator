import type { UserDomainError } from "@samuelho-dev/contract-user"
import type { UserInfrastructureError } from "@samuelho-dev/data-access-user"
import { Data } from "effect"

/**
 * User Feature Service Errors
 *
 * Service-level errors for feature layer operations.

CONTRACT-FIRST ARCHITECTURE:
Domain errors are defined in @samuelho-dev/contract-user - import directly from there.
This file only contains service-level errors specific to feature operations.

For domain errors, import from contract:
  import { UserNotFoundError, UserValidationError } from "@samuelho-dev/contract-user";

For infrastructure errors, import from data-access:
  import { UserTimeoutError, UserConnectionError } from "@samuelho-dev/data-access-user";

Service Errors (defined here):
  - UserServiceError - Orchestration/dependency failures

@see @samuelho-dev/contract-user for domain error definitions
@see @samuelho-dev/data-access-user for infrastructure error definitions
 *
 * @module @samuelho-dev/feature-user/shared/errors
 */


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
  readonly message: string
  readonly code: UserServiceErrorCode
  readonly operation: string
  readonly cause?: unknown
}> {
  static dependency(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "DEPENDENCY",
      operation,
      ...(cause !== undefined && { cause })
    })
  }
  static orchestration(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "ORCHESTRATION",
      operation,
      ...(cause !== undefined && { cause })
    })
  }
  static internal(operation: string, message: string, cause?: unknown) {
    return new UserServiceError({
      message,
      code: "INTERNAL",
      operation,
      ...(cause !== undefined && { cause })
    })
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
// Combined Feature Error Types
// ============================================================================
// For infrastructure errors, import directly from data-access:
//   import { UserTimeoutError } from "@samuelho-dev/data-access-user";

/**
 * All possible feature-level errors
 *
 * Domain errors - import from @samuelho-dev/contract-user
 * Infrastructure errors - import from @samuelho-dev/data-access-user
 * Service errors - defined in this file
 */
export type UserFeatureError = UserDomainError | UserServiceError | UserInfrastructureError
