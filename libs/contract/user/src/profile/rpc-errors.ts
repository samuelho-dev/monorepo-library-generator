/**
 * Profile RPC Errors
 *
 * Schema.TaggedError types for Profile RPC operations.
 * These are serializable over the network (unlike Data.TaggedError in errors.ts).
 *
 * @module @samuelho-dev/contract-user/profile/rpc-errors
 */

import { Schema } from "effect";

// ============================================================================
// RPC Errors (Schema.TaggedError for serialization)
// ============================================================================

/**
 * Profile not found RPC error
 */
export class ProfileNotFoundRpcError extends Schema.TaggedError<ProfileNotFoundRpcError>()(
  "ProfileNotFoundRpcError",
  {
    message: Schema.String,
    profileId: Schema.String,
  }
) {
  static create(id: string) {
    return new ProfileNotFoundRpcError({
      message: `Profile not found: ${id}`,
      profileId: id,
    });
  }
}

/**
 * Profile validation RPC error
 */
export class ProfileValidationRpcError extends Schema.TaggedError<ProfileValidationRpcError>()(
  "ProfileValidationRpcError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    constraint: Schema.optional(Schema.String),
  }
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new ProfileValidationRpcError(params);
  }
}

/**
 * Profile permission RPC error
 */
export class ProfilePermissionRpcError extends Schema.TaggedError<ProfilePermissionRpcError>()(
  "ProfilePermissionRpcError",
  {
    message: Schema.String,
    action: Schema.String,
    profileId: Schema.optional(Schema.String),
  }
) {
  static create(action: string, profileId?: string) {
    return new ProfilePermissionRpcError({
      message: `Permission denied: ${action}`,
      action,
      ...(profileId ? { profileId } : {}),
    });
  }
}

/**
 * Union of all Profile RPC errors
 */
export type ProfileRpcError =
  | ProfileNotFoundRpcError
  | ProfileValidationRpcError
  | ProfilePermissionRpcError;

/**
 * Schema for the RPC error union
 */
export const ProfileRpcError = Schema.Union(
  ProfileNotFoundRpcError,
  ProfileValidationRpcError,
  ProfilePermissionRpcError,
);
