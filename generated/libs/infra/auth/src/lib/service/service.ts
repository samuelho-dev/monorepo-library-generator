import { Context, Effect, Layer, Option } from "effect"

/**
 * Auth Infrastructure Service
 *
 * Auth service that orchestrates authentication providers.

Consumes SupabaseAuth from provider-supabase and provides:
- Token verification (for RPC middleware)
- Session management
- User lookup

API key management requires a repository from data-access layer.
This service is used by infra-rpc for auth middleware.
 *
 * @module @myorg/infra-auth/service
 */


import { Headers } from "@effect/platform";
import { SupabaseAuth, type AuthUser } from "@myorg/provider-supabase";
import {
  AuthError,
  UnauthorizedError,
  InvalidTokenError,
} from "./errors";
import type { AuthContext } from "./types";

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
  ) => Effect.Effect<AuthUser, UnauthorizedError | InvalidTokenError>;

  /**
   * Get the current user from session
   *
   * Returns None if not authenticated.
   * Delegates to SupabaseAuth.getUser.
   */
  readonly getCurrentUser: () => Effect.Effect<Option.Option<AuthUser>, AuthError>;

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
  ) => Effect.Effect<Option.Option<AuthContext>, AuthError>;
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
    Effect.gen(function* () {
      const supabaseAuth = yield* SupabaseAuth;

      return {
        verifyToken: (token) =>
          supabaseAuth.verifyToken(token).pipe(
            Effect.mapError((error) => {
              if (error._tag === "SupabaseTokenError") {
                return new InvalidTokenError({
                  message: error.message,
                  tokenType: "access",
                });
              }
              return new UnauthorizedError({
                message: `Token verification failed: ${String(error)}`,
              });
            }),
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
                metadata: user.user_metadata,
              }))
            ),
            Effect.mapError((error) =>
              new AuthError({
                message: `Failed to get current user: ${String(error)}`,
              })
            ),
            Effect.withSpan("AuthService.getCurrentUser")
          ),

        buildAuthContext: (headers) =>
          Effect.gen(function* () {
            const authHeader = Headers.get(headers, "authorization");
            const cookie = Headers.get(headers, "cookie");

            // Priority 1: Bearer Token
            if (Option.isSome(authHeader) && authHeader.value.startsWith("Bearer ")) {
              const token = authHeader.value.slice(7);
              const userResult = yield* supabaseAuth.verifyToken(token).pipe(
                Effect.option
              );

              if (Option.isSome(userResult)) {
                return Option.some<AuthContext>({
                  user: userResult.value,
                  authMethod: "session",
                  sessionToken: token,
                });
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
                    metadata: user.user_metadata,
                  }))
                ),
                Effect.catchAll(() => Effect.succeed(Option.none<AuthUser>()))
              );

              if (Option.isSome(userResult)) {
                return Option.some<AuthContext>({
                  user: userResult.value,
                  authMethod: "session",
                });
              }
            }

            return Option.none();
          }).pipe(Effect.withSpan("AuthService.buildAuthContext")),
      };
    })
  );

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
        role: "authenticated",
      }),

    getCurrentUser: () =>
      Effect.succeed(
        Option.some({
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: "authenticated",
        })
      ),

    buildAuthContext: () =>
      Effect.succeed(
        Option.some<AuthContext>({
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            role: "authenticated",
          },
          authMethod: "session",
        })
      ),
  });

  /**
   * Dev layer with logging
   *
   * Provides mock auth with debug logging.
   */
  static readonly Dev = Layer.effect(
    AuthService,
    Effect.gen(function* () {
      yield* Effect.logDebug("[AuthService] Initializing dev auth service...");

      return {
        verifyToken: (token) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[AuthService] verifyToken", { tokenLength: token.length });
            return {
              id: `dev-user-${token.slice(0, 8)}`,
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated",
            };
          }),

        getCurrentUser: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[AuthService] getCurrentUser");
            return Option.some({
              id: "dev-user-id",
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated",
            });
          }),

        buildAuthContext: (headers) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[AuthService] buildAuthContext", { headers: Object.keys(headers) });
            return Option.some<AuthContext>({
              user: {
                id: "dev-user-id",
                email: "dev@example.com",
                name: "Dev User",
                role: "authenticated",
              },
              authMethod: "session",
            });
          }),
      };
    })
  );
}