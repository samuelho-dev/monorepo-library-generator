/**
 * Authentication RPC Errors
 *
 * Schema.TaggedError types for Authentication RPC operations.
 * These are serializable over the network (unlike Data.TaggedError in errors.ts).
 *
 * @module @samuelho-dev/contract-user/authentication/rpc-errors
 */

import { Schema } from "effect";

// ============================================================================
// RPC Errors (Schema.TaggedError for serialization)
// ============================================================================

/**
 * Authentication not found RPC error
 */
export class AuthenticationNotFoundRpcError extends Schema.TaggedError<AuthenticationNotFoundRpcError>()(
  "AuthenticationNotFoundRpcError",
  {
    message: Schema.String,
    authenticationId: Schema.String,
  }
) {
  static create(id: string) {
    return new AuthenticationNotFoundRpcError({
      message: `Authentication not found: ${id}`,
      authenticationId: id,
    });
  }
}

/**
 * Authentication validation RPC error
 */
export class AuthenticationValidationRpcError extends Schema.TaggedError<AuthenticationValidationRpcError>()(
  "AuthenticationValidationRpcError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    constraint: Schema.optional(Schema.String),
  }
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new AuthenticationValidationRpcError(params);
  }
}

/**
 * Authentication permission RPC error
 */
export class AuthenticationPermissionRpcError extends Schema.TaggedError<AuthenticationPermissionRpcError>()(
  "AuthenticationPermissionRpcError",
  {
    message: Schema.String,
    action: Schema.String,
    authenticationId: Schema.optional(Schema.String),
  }
) {
  static create(action: string, authenticationId?: string) {
    return new AuthenticationPermissionRpcError({
      message: `Permission denied: ${action}`,
      action,
      ...(authenticationId ? { authenticationId } : {}),
    });
  }
}

/**
 * Union of all Authentication RPC errors
 */
export type AuthenticationRpcError =
  | AuthenticationNotFoundRpcError
  | AuthenticationValidationRpcError
  | AuthenticationPermissionRpcError;

/**
 * Schema for the RPC error union
 */
export const AuthenticationRpcError = Schema.Union(
  AuthenticationNotFoundRpcError,
  AuthenticationValidationRpcError,
  AuthenticationPermissionRpcError,
);
