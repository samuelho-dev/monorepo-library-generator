import { Schema } from "effect"

/**
 * Auth Contract Errors
 *
 * Authentication error types for RPC boundaries.

Uses Schema.TaggedError for serialization across RPC boundaries.
These errors can be safely transmitted between client and server.

Error Categories:
- AuthError: User authentication failures (invalid token, expired, etc.)
- ServiceAuthError: Service-to-service authentication failures
 *
 * @module @samuelho-dev/contract-auth/errors
 */

// ============================================================================
// User Authentication Errors
// ============================================================================

/**
 * Authentication error codes
 */
export const AuthErrorCodeSchema = Schema.Union(
  Schema.Literal("UNAUTHENTICATED"),
  Schema.Literal("TOKEN_EXPIRED"),
  Schema.Literal("TOKEN_INVALID"),
  Schema.Literal("TOKEN_MISSING"),
  Schema.Literal("SESSION_EXPIRED"),
  Schema.Literal("INSUFFICIENT_PERMISSIONS"),
  Schema.Literal("ACCOUNT_DISABLED"),
  Schema.Literal("ACCOUNT_LOCKED")
)
export type AuthErrorCode = Schema.Schema.Type<typeof AuthErrorCodeSchema>

/**
 * User authentication error
 *
 * Schema.TaggedError for RPC serialization.
 * Thrown when user authentication fails.
 */
export class AuthError extends Schema.TaggedError<AuthError>()(
  "AuthError",
  {
    /** Error message */
    message: Schema.String,

    /** Error code for programmatic handling */
    code: AuthErrorCodeSchema,

    /** HTTP status code hint */
    statusCode: Schema.optionalWith(Schema.Number, { default: () => 401 })
  }
) {
  static unauthenticated(message = "Authentication required") {
    return new AuthError({
      message,
      code: "UNAUTHENTICATED",
      statusCode: 401
    })
  }

  static tokenExpired(message = "Token has expired") {
    return new AuthError({
      message,
      code: "TOKEN_EXPIRED",
      statusCode: 401
    })
  }

  static tokenInvalid(message = "Invalid token") {
    return new AuthError({
      message,
      code: "TOKEN_INVALID",
      statusCode: 401
    })
  }

  static tokenMissing(message = "Authorization token required") {
    return new AuthError({
      message,
      code: "TOKEN_MISSING",
      statusCode: 401
    })
  }

  static insufficientPermissions(message = "Insufficient permissions") {
    return new AuthError({
      message,
      code: "INSUFFICIENT_PERMISSIONS",
      statusCode: 403
    })
  }
}

// ============================================================================
// Service-to-Service Authentication Errors
// ============================================================================

/**
 * Service authentication error codes
 */
export const ServiceAuthErrorCodeSchema = Schema.Union(
  Schema.Literal("SERVICE_UNAUTHENTICATED"),
  Schema.Literal("SERVICE_TOKEN_INVALID"),
  Schema.Literal("SERVICE_TOKEN_EXPIRED"),
  Schema.Literal("SERVICE_UNKNOWN"),
  Schema.Literal("SERVICE_PERMISSION_DENIED")
)
export type ServiceAuthErrorCode = Schema.Schema.Type<typeof ServiceAuthErrorCodeSchema>

/**
 * Service-to-service authentication error
 *
 * Schema.TaggedError for RPC serialization.
 * Thrown when service authentication fails.
 */
export class ServiceAuthError extends Schema.TaggedError<ServiceAuthError>()(
  "ServiceAuthError",
  {
    /** Error message */
    message: Schema.String,

    /** Error code for programmatic handling */
    code: ServiceAuthErrorCodeSchema,

    /** Service that attempted authentication */
    serviceName: Schema.optional(Schema.String),

    /** HTTP status code hint */
    statusCode: Schema.optionalWith(Schema.Number, { default: () => 401 })
  }
) {
  static unauthenticated(serviceName?: string) {
    return new ServiceAuthError({
      message: serviceName
        ? `Service '${serviceName}' authentication required`
        : "Service authentication required",
      code: "SERVICE_UNAUTHENTICATED",
      ...(serviceName && { serviceName }),
      statusCode: 401
    })
  }

  static tokenInvalid(serviceName?: string) {
    return new ServiceAuthError({
      message: "Invalid service token",
      code: "SERVICE_TOKEN_INVALID",
      ...(serviceName && { serviceName }),
      statusCode: 401
    })
  }

  static unknownService(serviceName: string) {
    return new ServiceAuthError({
      message: `Unknown service: ${serviceName}`,
      code: "SERVICE_UNKNOWN",
      serviceName,
      statusCode: 403
    })
  }

  static permissionDenied(serviceName: string, operation: string) {
    return new ServiceAuthError({
      message: `Service '${serviceName}' not permitted to perform '${operation}'`,
      code: "SERVICE_PERMISSION_DENIED",
      serviceName,
      statusCode: 403
    })
  }
}

// ============================================================================
// Combined Error Types
// ============================================================================

/**
 * All auth-related errors
 */
export type AuthContractError = AuthError | ServiceAuthError
