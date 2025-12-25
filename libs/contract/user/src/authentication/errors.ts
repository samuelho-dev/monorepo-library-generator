import { Data } from "effect"

/**
 * User Authentication Errors
 *
 * Domain errors specific to the authentication sub-module.

These errors use Data.TaggedError for proper Effect integration:
- Discriminated unions (_tag property for pattern matching)
- Effect.catchTag support
- Type safety (no instanceof checks needed)

CONTRACT-FIRST ARCHITECTURE:
This file is the SINGLE SOURCE OF TRUTH for authentication errors.
Data-access and feature layers should import and re-export these errors
rather than defining their own.

@see https://effect.website/docs/other/data/tagged-error
 *
 * @module @samuelho-dev/contract-user/authentication/errors
 */



// ============================================================================
// Domain Errors (Data.TaggedError)
// ============================================================================


/**
 * Error thrown when authentication entity is not found
 */
export class AuthenticationNotFoundError extends Data.TaggedError("AuthenticationNotFoundError")<{
    readonly message: string;
    readonly id: string;
  }> {
  static create(id: string) {
    return new AuthenticationNotFoundError({
      message: `Authentication not found: ${id}`,
      id,
    });
  }

}

/**
 * Error thrown when authentication validation fails
 */
export class AuthenticationValidationError extends Data.TaggedError("AuthenticationValidationError")<{
    readonly message: string;
    readonly field: string;
    readonly value?: unknown;
  }> {
  static create(field: string, message: string, value?: unknown) {
    return new AuthenticationValidationError({
      message,
      field,
      ...(value !== undefined && { value }),
    });
  }

  static required(field: string) {
    return new AuthenticationValidationError({
      message: `${field} is required`,
      field,
    });
  }

}

/**
 * Error thrown when authentication operation fails (e.g., database, network)
 */
export class AuthenticationOperationError extends Data.TaggedError("AuthenticationOperationError")<{
    readonly message: string;
    readonly operation: string;
    readonly cause?: unknown;
  }> {
  static create(operation: string, message: string, cause?: unknown) {
    return new AuthenticationOperationError({
      message,
      operation,
      ...(cause !== undefined && { cause }),
    });
  }

}


// ============================================================================
// Error Union Types
// ============================================================================


/**
 * Union of authentication domain errors (business logic)
 */
export type AuthenticationDomainError = 
  | AuthenticationNotFoundError
  | AuthenticationValidationError

/**
 * Union of authentication repository/infrastructure errors
 */
export type AuthenticationRepositoryError = 
  | AuthenticationOperationError

/**
 * All possible authentication errors
 */
export type AuthenticationError = AuthenticationDomainError | AuthenticationRepositoryError


// TODO: Add domain-specific errors here

// Example: AuthenticationInsufficientFundsError, AuthenticationExpiredError, etc.

