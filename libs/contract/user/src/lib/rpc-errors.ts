import { Schema } from "effect"

/**
 * User RPC Errors
 *
 * Schema.TaggedError types for RPC-serializable errors.
 * These are used at the network boundary for client/server communication.
 *
 * Note: Domain errors use Data.TaggedError (in errors.ts).
 * RPC errors use Schema.TaggedError (this file) for JSON serialization.
 *
 * @module @samuelho-dev/contract-user/rpc-errors
 */

// ============================================================================
// RPC Errors (Schema.TaggedError for serialization)
// ============================================================================

/**
 * RPC error for User not found
 *
 * Uses Schema.TaggedError for network serialization (unlike Data.TaggedError in errors.ts)
 */
export class UserNotFoundRpcError extends Schema.TaggedError<UserNotFoundRpcError>()(
  "UserNotFoundRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable error message"
    }),
    userId: Schema.String.annotations({
      title: "User ID",
      description: "ID of the User that was not found"
    })
  },
  {
    identifier: "UserNotFoundRpcError",
    title: "User Not Found Error",
    description: "RPC error thrown when a User is not found"
  }
) {
  static create(userId: string) {
    return new UserNotFoundRpcError({
      message: `User not found: ${userId}`,
      userId
    })
  }
}

/**
 * RPC error for User validation failures
 */
export class UserValidationRpcError extends Schema.TaggedError<UserValidationRpcError>()(
  "UserValidationRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable validation error message"
    }),
    field: Schema.optional(Schema.String).annotations({
      title: "Field Name",
      description: "Name of the field that failed validation"
    }),
    constraint: Schema.optional(Schema.String).annotations({
      title: "Constraint",
      description: "Validation constraint that was violated"
    })
  },
  {
    identifier: "UserValidationRpcError",
    title: "User Validation Error",
    description: "RPC error thrown when User validation fails"
  }
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new UserValidationRpcError(params)
  }
}

/**
 * RPC error for User permission denied
 */
export class UserPermissionRpcError extends Schema.TaggedError<UserPermissionRpcError>()(
  "UserPermissionRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable permission error message"
    }),
    action: Schema.String.annotations({
      title: "Action",
      description: "The action that was denied"
    }),
    userId: Schema.optional(Schema.String).annotations({
      title: "User ID",
      description: "ID of the User if applicable"
    })
  },
  {
    identifier: "UserPermissionRpcError",
    title: "User Permission Error",
    description: "RPC error thrown when permission is denied for a User operation"
  }
) {
  static create(action: string, userId?: string) {
    return new UserPermissionRpcError({
      message: `Permission denied: ${action}`,
      action,
      ...(userId ? { userId } : {})
    })
  }
}

/**
 * Union of all User RPC errors (serializable)
 */
export type UserRpcError =
  | UserNotFoundRpcError
  | UserValidationRpcError
  | UserPermissionRpcError

/**
 * Schema for the RPC error union (for Rpc.make error type)
 */
export const UserRpcError = Schema.Union(
  UserNotFoundRpcError,
  UserValidationRpcError,
  UserPermissionRpcError
)
