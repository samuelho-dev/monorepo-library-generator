import { Schema } from "effect";

/**
 * Auth Infrastructure Errors
 *
 * Schema.TaggedError-based error types for auth operations.

These errors use Schema.TaggedError because they need to cross RPC boundaries
and be serializable. The AuthError is used in Schema.Union with feature RPC errors.
 *
 * @module @myorg/infra-auth/errors
 */

// ============================================================================
// Error Types (Schema.TaggedError for RPC Serialization)
// ============================================================================

/**
 * Base auth error - used in RPC error unions
 *
 * This is the primary error type imported by feature RPC definitions
 * for protected routes. Must be Schema.TaggedError for serialization.
 */
export class AuthError extends Schema.TaggedError<AuthError>()("AuthError", {
  message: Schema.String,
  code: Schema.optional(Schema.String),
}) {}

/**
 * Unauthorized error - user is not authenticated
 */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    message: Schema.String,
  },
) {}

/**
 * Forbidden error - user lacks required permissions
 */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()("ForbiddenError", {
  message: Schema.String,
  requiredRole: Schema.optional(Schema.String),
  userRole: Schema.optional(Schema.String),
}) {}

/**
 * Invalid token error - token is malformed or expired
 */
export class InvalidTokenError extends Schema.TaggedError<InvalidTokenError>()(
  "InvalidTokenError",
  {
    message: Schema.String,
    tokenType: Schema.Literal("access", "refresh", "api-key"),
  },
) {}

/**
 * Session expired error
 */
export class SessionExpiredError extends Schema.TaggedError<SessionExpiredError>()(
  "SessionExpiredError",
  {
    message: Schema.String,
  },
) {}

/**
 * API key validation error
 */
export class InvalidApiKeyError extends Schema.TaggedError<InvalidApiKeyError>()(
  "InvalidApiKeyError",
  {
    message: Schema.String,
  },
) {}

// ============================================================================
// Error Union Type
// ============================================================================

/**
 * Union of all auth errors
 */
export type AuthInfraError =
  | AuthError
  | UnauthorizedError
  | ForbiddenError
  | InvalidTokenError
  | SessionExpiredError
  | InvalidApiKeyError;
