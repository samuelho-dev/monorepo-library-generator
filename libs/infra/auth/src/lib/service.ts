import {
  AuthUserData,
  AuthVerifier,
  AuthError as ContractAuthError
} from '@samuelho-dev/contract-auth'
import { env } from '@samuelho-dev/env'
import type { AuthUser } from '@samuelho-dev/provider-supabase'
import { SupabaseAuth } from '@samuelho-dev/provider-supabase'
import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Headers } from 'effect/unstable/http'
import { AuthError, InvalidTokenError, UnauthorizedError } from './errors'
import type { AuthContext } from './types'

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
- Schema.decode validates AuthUserData at boundaries
- Middleware is consolidated in infra-rpc

Integration:
  import { AuthMiddlewareLive } from '@samuelho-dev/infra-rpc';
  import { AuthVerifierLive } from '@samuelho-dev/infra-auth'  const middleware = AuthMiddlewareLive.pipe(Layer.provide(AuthVerifierLive))
 *
 * @module @samuelho-dev/infra-auth/service
 */

// ============================================================================
// Contract-Auth Imports (Single Source of Truth)
// ============================================================================
// Import canonical types from contract-auth

// Re-export for convenience (consumers can import from infra-auth OR contract-auth)
export { type AuthUserData, AuthVerifier }

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
export class AuthService extends Context.Service<AuthService, AuthServiceInterface>()(
  '@samuelho-dev/infra-auth/AuthService'
) {
  /**
   * Live layer - requires SupabaseAuth
   *
   * Delegates all auth operations to the Supabase provider.
   */
  static readonly Live = Layer.effect(
    AuthService,
    Effect.gen(function* () {
      const supabaseAuth = yield* SupabaseAuth

      return {
        verifyToken: (token) =>
          supabaseAuth.verifyToken(token).pipe(
            Effect.catchTags({
              SupabaseTokenError: (error) =>
                Effect.fail(
                  new InvalidTokenError({
                    message: error.message,
                    tokenType: 'access'
                  })
                ),
              SupabaseAuthError: (error) =>
                Effect.fail(
                  new UnauthorizedError({
                    message: `Token verification failed: ${error.message}`
                  })
                ),
              SupabaseConnectionError: (error) =>
                Effect.fail(
                  new UnauthorizedError({
                    message: `Auth connection failed: ${error.message}`
                  })
                )
            }),
            Effect.withSpan('AuthService.verifyToken')
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
            Effect.catchTags({
              SupabaseAuthError: (error) =>
                Effect.fail(
                  new AuthError({
                    message: `Failed to get current user: ${error.message}`
                  })
                ),
              SupabaseConnectionError: (error) =>
                Effect.fail(
                  new AuthError({
                    message: `Auth connection failed: ${error.message}`
                  })
                )
            }),
            Effect.withSpan('AuthService.getCurrentUser')
          ),

        buildAuthContext: Effect.fn('AuthService.buildAuthContext')(function* (headers) {
          const authHeader = Headers.get(headers, 'authorization')
          const cookie = Headers.get(headers, 'cookie')

          // Priority 1: Bearer Token
          if (Option.isSome(authHeader) && authHeader.value.startsWith('Bearer ')) {
            const token = authHeader.value.slice(7)
            const userResult = yield* supabaseAuth.verifyToken(token).pipe(Effect.option)

            if (Option.isSome(userResult)) {
              return Option.some<AuthContext>({
                user: userResult.value,
                authMethod: 'session',
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
              Effect.option,
              Effect.map(Option.flatten)
            )

            if (Option.isSome(userResult)) {
              return Option.some<AuthContext>({
                user: userResult.value,
                authMethod: 'session'
              })
            }
          }

          return Option.none()
        }, Effect.withSpan('AuthService.buildAuthContext'))
      }
    })
  )

  /**
   * Test layer with mock implementations
   *
   * Returns predictable test users for testing.
   */
  static readonly Test = Layer.succeed(AuthService, {
    verifyToken: (_token) =>
      Effect.succeed({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'authenticated'
      }),

    getCurrentUser: () =>
      Effect.succeed(
        Option.some({
          id: '00000000-0000-4000-8000-000000000001',
          email: 'test@example.com',
          name: 'Test User',
          role: 'authenticated'
        })
      ),

    buildAuthContext: () =>
      Effect.succeed(
        Option.some<AuthContext>({
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'test@example.com',
            name: 'Test User',
            role: 'authenticated'
          },
          authMethod: 'session'
        })
      )
  })

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "test" → Test (in-memory mock)
   * - else → Live (requires SupabaseAuth)
   */
  static readonly Auto = Layer.suspend(() =>
    env.NODE_ENV === 'test' ? AuthService.Test : AuthService.Live
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
 * import { AuthMiddlewareLive } from '@samuelho-dev/infra-rpc'
 * import { AuthVerifierLive, AuthService } from '@samuelho-dev/infra-auth'
 * import { SupabaseAuth } from '@samuelho-dev/provider-supabase'
 *
 * // Compose layers for RPC middleware
 * const RpcAuthLayer = AuthMiddlewareLive.pipe(
 *   Layer.provide(AuthVerifierLive),
 *   Layer.provide(AuthService.Live),
 *   Layer.provide(SupabaseAuth.Live)
 * )
 * ```
 */
export const AuthVerifierLive = Layer.effect(
  AuthVerifier,
  Effect.gen(function* () {
    const authService = yield* AuthService

    const verifyToken = (token: string) =>
      authService.verifyToken(token).pipe(
        // Map infra errors to contract errors using Effect.catchTags
        // Must catch before map/flatMap to handle typed errors
        Effect.catchTags({
          InvalidTokenError: (error) => Effect.fail(ContractAuthError.tokenInvalid(error.message)),
          UnauthorizedError: (error) =>
            Effect.fail(ContractAuthError.unauthenticated(error.message))
        }),
        // Map provider-specific user to AuthUserData shape
        Effect.map((user) => ({
          id: user.id,
          email: user.email ?? '',
          name: user.name,
          metadata: user.metadata
        })),
        // Validate at boundary using Schema.decode
        Effect.flatMap((data) =>
          Schema.decodeEffect(AuthUserData)(data).pipe(
            Effect.mapError((parseError) =>
              ContractAuthError.tokenInvalid(`Invalid user data: ${parseError.message}`)
            )
          )
        ),
        Effect.withSpan('AuthVerifierLive.verify')
      )

    return {
      verify: verifyToken,

      verifyOptional: (token: string | undefined) =>
        token ? verifyToken(token).pipe(Effect.option) : Effect.succeed(Option.none())
    }
  })
)

/**
 * AuthVerifierTest Layer
 *
 * Test implementation that always succeeds with a test user.
 * Use for unit testing RPC handlers.
 */
const testAuthUser = Schema.decodeSync(AuthUserData)({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'test@example.com',
  name: 'Test User'
})

export const AuthVerifierTest = Layer.succeed(AuthVerifier, {
  verify: (_token: string) => Effect.succeed(testAuthUser),

  verifyOptional: (token: string | undefined) =>
    token ? Effect.succeed(Option.some(testAuthUser)) : Effect.succeed(Option.none())
})
