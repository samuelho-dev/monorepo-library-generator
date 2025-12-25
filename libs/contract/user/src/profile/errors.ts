import { Data } from "effect"

/**
 * User Profile Errors
 *
 * Domain errors specific to the profile sub-module.

These errors use Data.TaggedError for proper Effect integration:
- Discriminated unions (_tag property for pattern matching)
- Effect.catchTag support
- Type safety (no instanceof checks needed)

CONTRACT-FIRST ARCHITECTURE:
This file is the SINGLE SOURCE OF TRUTH for profile errors.
Data-access and feature layers should import and re-export these errors
rather than defining their own.

@see https://effect.website/docs/other/data/tagged-error
 *
 * @module @samuelho-dev/contract-user/profile/errors
 */
// ============================================================================
// Domain Errors (Data.TaggedError)
// ============================================================================
/**
 * Error thrown when profile entity is not found
 */
export class ProfileNotFoundError extends Data.TaggedError("ProfileNotFoundError")<{
  readonly message: string
  readonly id: string
}> {
  static create(id: string) {
    return new ProfileNotFoundError({
      message: `Profile not found: ${id}`,
      id
    })
  }
}
/**
 * Error thrown when profile validation fails
 */
export class ProfileValidationError extends Data.TaggedError("ProfileValidationError")<{
  readonly message: string
  readonly field: string
  readonly value?: unknown
}> {
  static create(field: string, message: string, value?: unknown) {
    return new ProfileValidationError({
      message,
      field,
      ...(value !== undefined && { value })
    })
  }
  static required(field: string) {
    return new ProfileValidationError({
      message: `${field} is required`,
      field
    })
  }
}
/**
 * Error thrown when profile operation fails (e.g., database, network)
 */
export class ProfileOperationError extends Data.TaggedError("ProfileOperationError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {
  static create(operation: string, message: string, cause?: unknown) {
    return new ProfileOperationError({
      message,
      operation,
      ...(cause !== undefined && { cause })
    })
  }
}
// ============================================================================
// Error Union Types
// ============================================================================
/**
 * Union of profile domain errors (business logic)
 */
export type ProfileDomainError = 
  | ProfileNotFoundError
  | ProfileValidationError
/**
 * Union of profile repository/infrastructure errors
 */
export type ProfileRepositoryError = ProfileOperationError
/**
 * All possible profile errors
 */
export type ProfileError = 
  | ProfileDomainError
  | ProfileRepositoryError
// TODO: Add domain-specific errors here
// Example: ProfileInsufficientFundsError, ProfileExpiredError, etc.