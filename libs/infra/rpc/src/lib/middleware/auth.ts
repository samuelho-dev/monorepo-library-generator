import { Headers } from "@effect/platform"
import { RpcMiddleware } from "@effect/rpc"
import { Effect, Layer, Option } from "effect"

/**
 * User Authentication Middleware
 *
 * User authentication for protected RPC routes.

Used for protected routes (RouteTag = "protected") in Contract-First architecture.

IMPORTANT: All types are imported from @samuelho-dev/contract-auth (single source of truth).
This file does NOT define CurrentUserData, AuthError, etc. - it imports them.

Features:
- Bearer token validation (Authorization header)
- API key authentication (x-api-key header)
- CurrentUser provision to handlers
- AuthMiddleware implementation
 *
 * @module @samuelho-dev/infra-rpc/middleware/auth
 * @see @effect/rpc RpcMiddleware.Tag documentation
 * @see @samuelho-dev/contract-auth for type definitions
 */

// ============================================================================
// Contract-Auth Imports (Single Source of Truth)
// ============================================================================

// Import canonical types from contract-auth
import {
  // Schemas
  type CurrentUserData,
  type AuthMethod,

  // Errors
  AuthError,

  // Ports (interface for verification)
  AuthVerifier,

  // Context Tags
  CurrentUser,
  AuthMethodContext,
} from "@samuelho-dev/contract-auth"

// Re-export for convenience (consumers can import from infra-rpc OR contract-auth)
export {
  type CurrentUserData,
  type AuthMethod,
  AuthError,
  AuthVerifier,
  CurrentUser,
  AuthMethodContext
}

// ============================================================================
// Token Extraction Helpers
// ============================================================================
/**
 * Extract authentication from headers (priority: API key > Bearer token)
 *
 * Uses @effect/platform Headers.get() for type-safe header access.
 */
const extractAuth = (headers: Headers.Headers): Option.Option<{ type: AuthMethod; token: string }> => {
  // Priority 1: API Key (x-api-key header)
  const apiKey = Headers.get(headers, "x-api-key")
  if (Option.isSome(apiKey)) {
    return Option.some({ type: "api-key" as const, token: apiKey.value })
  }

  // Priority 2: Bearer Token (JWT)
  const auth = Headers.get(headers, "authorization")
  if (Option.isSome(auth) && auth.value.startsWith("Bearer ")) {
    return Option.some({ type: "jwt" as const, token: auth.value.slice(7) })
  }

  return Option.none()
}

// ============================================================================
// Auth Middleware
// ============================================================================
/**
 * AuthMiddleware using native RpcMiddleware.Tag
 *
 * Apply to protected routes (RouteTag = "protected").
 * Automatically applied based on RouteTag via route-selector middleware.
 *
 * Types come from contract-auth (CurrentUser, AuthError).
 *
 * @example
 * ```typescript
 * // In contract definition:
 * import { RouteTag, RouteType } from "@samuelho-dev/contract-auth";
 *
 * export class GetUser extends Rpc.make("GetUser", {
 *   payload: GetUserRequest,
 *   success: UserResponse,
 *   failure: Schema.Union(UserError, AuthError),
 * }) {
 *   static readonly [RouteTag]: RouteType = "protected";
 * }
 * ```
 */
export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()(
  "@rpc/AuthMiddleware",
  {
    provides: CurrentUser,
    failure: AuthError
  }
) {}

/**
 * AuthMiddleware implementation Layer
 *
 * Uses AuthVerifier interface from contract-auth.
 * AuthVerifier is implemented by infra-auth and provided at application composition time.
 *
 * The middleware inspects:
 * - Authorization header for Bearer tokens (JWT)
 * - x-api-key header for API key authentication
 * - Request headers for audit logging
 */
export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function*() {
    const verifier = yield* AuthVerifier

    return (request) =>
      Effect.gen(function*() {
        const { headers } = request

        // Extract authentication method and token
        const auth = extractAuth(headers)

        if (Option.isNone(auth)) {
          // Log authentication failure for security auditing
          yield* Effect.logWarning("Authentication failed: No credentials provided")
          return yield* Effect.fail(AuthError.tokenMissing())
        }

        const { type: authMethod, token } = auth.value

        // Log authentication attempt (without exposing token)
        yield* Effect.logDebug(`Authentication attempt using ${authMethod}`)

        // Delegate to AuthVerifier (implemented by infra-auth)
        // verifier.verify already returns Effect<CurrentUserData, AuthError>
        const user = yield* verifier.verify(token)

        // Log successful authentication
        yield* Effect.logDebug(`User authenticated: ${user.id} via ${authMethod}`)

        return user
      })
  })
)

// ============================================================================
// Test Utilities
// ============================================================================
/**
 * Test user for development/testing
 */
export const TestUser: CurrentUserData = {
  id: "test-user-id",
  email: "test@example.com",
  roles: ["user"]
}

/**
 * Admin test user for testing admin routes
 */
export const AdminTestUser: CurrentUserData = {
  id: "admin-user-id",
  email: "admin@example.com",
  roles: ["user", "admin"]
}

/**
 * Test AuthMiddleware - always provides TestUser
 *
 * Use in development and testing.
 */
export const AuthMiddlewareTest = Layer.succeed(
  AuthMiddleware,
  () => Effect.succeed(TestUser)
)

/**
 * Admin AuthMiddleware - provides admin user for testing admin routes
 */
export const AuthMiddlewareAdmin = Layer.succeed(
  AuthMiddleware,
  () => Effect.succeed(AdminTestUser)
)
