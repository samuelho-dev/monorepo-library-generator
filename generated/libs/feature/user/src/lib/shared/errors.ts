import { Schema } from "effect";

/**
 * User Errors
 *
 * Domain errors using Schema.TaggedError pattern.

Schema.TaggedError is used for all errors because:
- Serializable at RPC boundaries
- Works as internal domain errors
- No error mapping needed between layers
 *
 * @module @myorg/feature-user/shared/errors
 */

/**
 * User Error
 *
 * Primary error type for user operations.
 * Uses Schema.TaggedError for RPC serialization compatibility.
 */
export class UserError extends Schema.TaggedError<UserError>()("UserError", {
  message: Schema.String,
  code: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

/**
 * Error codes for user operations
 *
 * Use these codes with UserError for type-safe error handling:
 * - NOT_FOUND: Entity not found
 * - VALIDATION_ERROR: Invalid input data
 * - CONFLICT: Operation conflicts with existing state
 * - INTERNAL_ERROR: Unexpected internal error
 */
export const UserErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type UserErrorCode = (typeof UserErrorCodes)[keyof typeof UserErrorCodes];
