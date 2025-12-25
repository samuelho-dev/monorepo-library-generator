import { Context, Effect, Layer, Option, Schema } from "effect"

/**
 * Auth Infrastructure Service
 *
 * Auth service that orchestrates authentication providers.

Consumes SupabaseAuth from provider-supabase and provides:
- Token verification (for RPC middleware)
- Session management
- User lookup
- AuthVerifierLive layer for infra-rpc middleware integration

Contract-First Architecture:
- contract-auth defines AuthVerifier interface (single source of truth)
- This module provides AuthVerifierLive that implements it
- Schema.decode validates CurrentUserData at boundaries
- Middleware is consolidated in infra-rpc

Integration:
  import { AuthMiddlewareLive } from '@samuelho-dev/infra-rpc';
  import { AuthVerifierLive } from '@samuelho-dev/infra-auth';

  const middleware = AuthMiddlewareLive.pipe(Layer.provide(AuthVerifierLive));
 *
 * @module @samuelho-dev/infra-auth/service
 */

import { Headers } from "@effect/platform"
import { type AuthUser, SupabaseAuth } from "@samuelho-dev/provider-supabase"

// ============================================================================
// Contract-Auth Imports (Single Source of Truth)
// ============================================================================

// Import canonical types from contract-auth
import {
  // Errors - for RPC middleware
  AuthError as ContractAuthError,
  // Ports - interface to implement
  AuthVerifier,
  type CurrentUserData,
  // Schemas - for validation at boundaries
  CurrentUserDataSchema
} from "@samuelho-dev/contract-auth"

import { AuthError, InvalidTokenError, UnauthorizedError } from "./errors"
import type { AuthContext } from "./types"

// Re-export for convenience (consumers can import from infra-auth OR contract-auth)
export { AuthVerifier, type CurrentUserData }

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Auth Service Interface
 *
 * Provides authentication operations for the application.
 * Delegates to SupabaseAuth for actual auth operations.
 */
export interface AuthServiceInterface {
  /**
   * Verify a Bearer token and return the user
   *
   * Used by RPC middleware for session-based auth.
   * Delegates to SupabaseAuth.verifyToken.
   */
  readonly verifyToken: (
    token: string
  ) => Effect.Effect<AuthUser, UnauthorizedError | InvalidTokenError>

  /**
   * Get the current user from session
   *
   * Returns None if not authenticated.
   * Delegates to SupabaseAuth.getUser.
   */
  readonly getCurrentUser: () => Effect.Effect<Option.Option<AuthUser>, AuthError>

  /**
   * Build auth context for RPC handlers
   *
   * Attempts authentication via:
   * 1. Bearer token (Authorization header)
   * 2. Session cookie
   *
   * For API key auth, use ApiKeyRepository from data-access layer.
   */
  readonly buildAuthContext: (
    headers: Headers.Headers
  ) => Effect.Effect<Option.Option<AuthContext>, AuthError>
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * Auth Service Tag
 *
 * Access via: yield* AuthService
 *
 * Requires: SupabaseAuth (from provider-supabase)
 */
export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  AuthServiceInterface
>() {
  /**
   * Live layer - requires SupabaseAuth
   *
   * Delegates all auth operations to the Supabase provider.
   */
  static readonly Live = Layer.effect(
    AuthService,
    Effect.gen(function*() {
      const supabaseAuth = yield* SupabaseAuth

      return {
        verifyToken: (token) =>
          supabaseAuth.verifyToken(token).pipe(
            Effect.catchTag("SupabaseTokenError", (error) =>
              Effect.fail(
                new InvalidTokenError({
                  message: error.message,
                  tokenType: "access"
                })
              )),
            Effect.catchAll((error) =>
              Effect.fail(
                new UnauthorizedError({
                  message: `Token verification failed: ${error.message}`
                })
              )
            ),
            Effect.withSpan("AuthService.verifyToken")
          ),

        getCurrentUser: () =>
          supabaseAuth.getUser().pipe(
            Effect.map((userOpt) =>
              Option.map(userOpt, (user) => ({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name,
                role: user.role,
                metadata: user.user_metadata
              }))
            ),
            Effect.catchAll((error) =>
              Effect.fail(
                new AuthError({
                  message: `Failed to get current user: ${error.message}`
                })
              )
            ),
            Effect.withSpan("AuthService.getCurrentUser")
          ),

        buildAuthContext: (headers) =>
          Effect.gen(function*() {
            const authHeader = Headers.get(headers, "authorization")
            const cookie = Headers.get(headers, "cookie")

            // Priority 1: Bearer Token
            if (Option.isSome(authHeader) && authHeader.value.startsWith("Bearer ")) {
              const token = authHeader.value.slice(7)
              const userResult = yield* supabaseAuth.verifyToken(token).pipe(
                Effect.option
              )

              if (Option.isSome(userResult)) {
                return Option.some<AuthContext>({
                  user: userResult.value,
                  authMethod: "session",
                  sessionToken: token
                })
              }
            }

            // Priority 2: Session Cookie (handled by Supabase client-side)
            if (Option.isSome(cookie)) {
              const userResult = yield* supabaseAuth.getUser().pipe(
                Effect.map((opt) =>
                  Option.map(opt, (user) => ({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name,
                    role: user.role,
                    metadata: user.user_metadata
                  }))
                ),
                Effect.catchAll(() => Effect.succeed(Option.none<AuthUser>()))
              )

              if (Option.isSome(userResult)) {
                return Option.some<AuthContext>({
                  user: userResult.value,
                  authMethod: "session"
                })
              }
            }

            return Option.none()
          }).pipe(Effect.withSpan("AuthService.buildAuthContext"))
      }
    })
  )

  /**
   * Test layer with mock implementations
   *
   * Returns predictable test users for testing.
   */
  static readonly Test = Layer.succeed(AuthService, {
    verifyToken: (token) =>
      Effect.succeed({
        id: `test-user-${token.slice(0, 8)}`,
        email: "test@example.com",
        name: "Test User",
        role: "authenticated"
      }),

    getCurrentUser: () =>
      Effect.succeed(
        Option.some({
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: "authenticated"
        })
      ),

    buildAuthContext: () =>
      Effect.succeed(
        Option.some<AuthContext>({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            role: "authenticated"
          },
          authMethod: "session"
        })
      )
  })

  /**
   * Dev layer with logging
   *
   * Provides mock auth with debug logging.
   */
  static readonly Dev = Layer.effect(
    AuthService,
    Effect.gen(function*() {
      yield* Effect.logDebug("[AuthService] Initializing dev auth service...")

      return {
        verifyToken: (token) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[AuthService] verifyToken", { tokenLength: token.length })
            return {
              id: `dev-user-${token.slice(0, 8)}`,
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated"
            }
          }),

        getCurrentUser: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[AuthService] getCurrentUser")
            return Option.some({
              id: "dev-user-id",
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated"
            })
          }),

        buildAuthContext: (headers) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[AuthService] buildAuthContext", { headers: Object.keys(headers) })
            return Option.some<AuthContext>({
              user: {
                id: "dev-user-id",
                email: "dev@example.com",
                name: "Dev User",
                role: "authenticated"
              },
              authMethod: "session"
            })
          })
      }
    })
  )
}

// ============================================================================
// AuthVerifier Implementation (for contract-auth)
// ============================================================================

/**
 * AuthVerifierLive Layer
 *
 * Implements the AuthVerifier interface from contract-auth.
 * This is the bridge between infra-auth and infra-rpc middleware.
 *
 * Contract-First Architecture:
 * - AuthVerifier interface defined in contract-auth (single source of truth)
 * - This layer provides implementation using AuthService
 * - Schema.decode validates CurrentUserData at the boundary
 *
 * @example
 * ```typescript
 * import { AuthMiddlewareLive } from '@samuelho-dev/infra-rpc';
 * import { AuthVerifierLive, AuthService } from '@samuelho-dev/infra-auth';
 * import { SupabaseAuth } from '@samuelho-dev/provider-supabase';
 *
 * // Compose layers for RPC middleware
 * const RpcAuthLayer = AuthMiddlewareLive.pipe(
 *   Layer.provide(AuthVerifierLive),
 *   Layer.provide(AuthService.Live),
 *   Layer.provide(SupabaseAuth.Live),
 * );
 * ```
 */
export const AuthVerifierLive = Layer.effect(
  AuthVerifier,
  Effect.gen(function*() {
    const authService = yield* AuthService

    return {
      verify: (token: string) =>
        authService.verifyToken(token).pipe(
          // Map provider-specific user to CurrentUserData shape
          Effect.map((user) => ({
            id: user.id,
            email: user.email ?? "",
            roles: user.role ? [user.role] : [],
            metadata: user.user_metadata
          })),
          // Validate at boundary using Schema.decode
          Effect.flatMap((data) =>
            Schema.decode(CurrentUserDataSchema)(data).pipe(
              Effect.mapError((parseError) =>
                ContractAuthError.invalidToken(`Invalid user data: ${parseError.message}`)
              )
            )
          ),
          // Map infra errors to contract errors using Effect.catchTags
          Effect.catchTags({
            AuthError: (error) => Effect.fail(error),
            InvalidTokenError: (error) => Effect.fail(ContractAuthError.invalidToken(error.message)),
            UnauthorizedError: (error) => Effect.fail(ContractAuthError.unauthorized(error.message))
          }),
          Effect.catchAll((error) => Effect.fail(ContractAuthError.unauthorized(error.message))),
          Effect.withSpan("AuthVerifierLive.verify")
        )
    }
  })
)

/**
 * AuthVerifierTest Layer
 *
 * Test implementation that always succeeds with a test user.
 * Use for unit testing RPC handlers.
 */
export const AuthVerifierTest = Layer.succeed(AuthVerifier, {
  verify: (_token: string) =>
    Effect.succeed<CurrentUserData>({
      id: "test-user-id",
      email: "test@example.com",
      roles: ["user"]
    })
})
