/**
 * Supabase Auth Service Template
 *
 * Generates the SupabaseAuth service for authentication operations.
 * Wraps Supabase Auth API with Effect error handling.
 *
 * @module monorepo-library-generator/provider/templates/supabase/auth
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate SupabaseAuth service file
 */
export function generateSupabaseAuthServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'SupabaseAuth Service',
    description: `Supabase authentication provider with Effect integration.

Wraps Supabase Auth API for:
- Email/password authentication
- Token verification (for RPC middleware)
- Session management
- User retrieval

This service is consumed by infra-auth for the auth middleware.`,
    module: `${packageName}/service/auth`,
    see: ['https://supabase.com/docs/reference/javascript/auth-api']
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    {
      from: '@supabase/supabase-js',
      imports: [{ name: 'SupabaseClient', alias: 'SupabaseSDKClient' }],
      isTypeOnly: true
    },
    { from: 'effect', imports: ['Context', 'Effect', 'Layer', 'Option', 'Schema'] },
    { from: './client', imports: ['SupabaseClient'] },
    {
      from: './errors',
      imports: [
        'SupabaseAuthError',
        'SupabaseInvalidCredentialsError',
        'SupabaseSessionExpiredError',
        'SupabaseTokenError'
      ]
    },
    {
      from: './types',
      imports: [
        'AuthResult',
        'AuthUser',
        'SignInCredentials',
        'SignUpCredentials',
        'SupabaseSession',
        'SupabaseUser'
      ],
      isTypeOnly: true
    },
    { from: './types', imports: ['SupabaseSessionSchema', 'SupabaseUserSchema'] }
  ])

  // Service interface
  builder.addSectionComment('Service Interface')
  builder.addBlankLine()

  builder.addRaw(`/**
 * SupabaseAuth Service Interface
 *
 * Provides authentication operations wrapped in Effect.
 */
export interface SupabaseAuthServiceInterface {
  /**
   * Sign in with email and password
   */
  readonly signInWithPassword: (
    credentials: SignInCredentials
  ) => Effect.Effect<AuthResult, SupabaseAuthError | SupabaseInvalidCredentialsError>

  /**
   * Sign up with email and password
   */
  readonly signUp: (
    credentials: SignUpCredentials
  ) => Effect.Effect<AuthResult, SupabaseAuthError>

  /**
   * Sign out the current user
   */
  readonly signOut: () => Effect.Effect<void, SupabaseAuthError>

  /**
   * Verify a JWT token and return the user
   *
   * Used by RPC middleware to validate Bearer tokens.
   */
  readonly verifyToken: (
    token: string
  ) => Effect.Effect<AuthUser, SupabaseAuthError | SupabaseTokenError>

  /**
   * Get the current session
   *
   * Returns None if no active session.
   */
  readonly getSession: () => Effect.Effect<
    Option.Option<SupabaseSession>,
    SupabaseAuthError
  >

  /**
   * Get the current user
   *
   * Returns None if no authenticated user.
   */
  readonly getUser: () => Effect.Effect<Option.Option<SupabaseUser>, SupabaseAuthError>

  /**
   * Refresh the current session
   */
  readonly refreshSession: () => Effect.Effect<
    SupabaseSession,
    SupabaseAuthError | SupabaseSessionExpiredError
  >

  /**
   * Get user from session token (server-side)
   *
   * For server-side verification without cookies.
   * Used by RPC handlers to verify session tokens.
   */
  readonly getUserFromToken: (
    accessToken: string
  ) => Effect.Effect<AuthUser, SupabaseAuthError | SupabaseTokenError>
}`)
  builder.addBlankLine()

  // Helper to map Supabase user to AuthUser
  builder.addSectionComment('Helpers')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Decode SDK user to typed SupabaseUser using Schema
 *
 * Uses Effect Schema for type-safe decoding instead of type assertions.
 */
const decodeUser = Schema.decodeUnknownOption(SupabaseUserSchema)

/**
 * Decode SDK session to typed SupabaseSession using Schema
 */
const decodeSession = Schema.decodeUnknownOption(SupabaseSessionSchema)

/**
 * Map Supabase user to simplified AuthUser
 */
function toAuthUser(user: SupabaseUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name,
    role: user.role,
    metadata: user.user_metadata
  }
}

/**
 * Auth operation type for error typing
 */
type AuthOperation = "signIn" | "signOut" | "signUp" | "verifyToken" | "refreshToken" | "getSession" | "getUser"

/**
 * Validate and decode user from SDK response
 */
function validateUser(user: unknown, operation: AuthOperation) {
  const userOption = decodeUser(user)
  if (Option.isNone(userOption)) {
    return Effect.fail(
      new SupabaseAuthError({
        message: "Invalid user data from Supabase",
        operation
      })
    )
  }
  return Effect.succeed(userOption.value)
}

/**
 * Handle signIn error response
 */
function handleSignInError(error: { message?: string }) {
  if (error.message?.includes("Invalid login credentials")) {
    return Effect.fail(
      new SupabaseInvalidCredentialsError({
        message: "Invalid email or password",
        cause: error
      })
    )
  }
  return Effect.fail(
    new SupabaseAuthError({
      message: error.message || "Sign in failed",
      operation: "signIn",
      cause: error
    })
  )
}

/**
 * Build auth result from user and optional session
 */
function buildAuthResult(user: SupabaseUser, session: unknown) {
  const sessionOption = session ? decodeSession(session) : Option.none()
  return {
    user,
    session: Option.isSome(sessionOption) ? sessionOption.value : null
  }
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment('Context.Tag')
  builder.addBlankLine()

  builder.addRaw(`/**
 * SupabaseAuth Service Tag
 *
 * Access via: yield* SupabaseAuth
 *
 * Requires: SupabaseClient
 *
 * Static layers:
 * - SupabaseAuth.Live - Production layer (requires SupabaseClient.Live)
 * - SupabaseAuth.Test - Test layer with mock implementations
 * - SupabaseAuth.Dev - Development with debug logging
 */
export class SupabaseAuth extends Context.Tag("SupabaseAuth")<
  SupabaseAuth,
  SupabaseAuthServiceInterface
>() {
  /**
   * Create auth service from Supabase client
   */
  private static createService(client: SupabaseSDKClient) {
    return {
      signInWithPassword: (credentials: SignInCredentials) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              }),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Sign in failed",
                operation: "signIn",
                cause: error
              })
          })

          if (error) {
            return yield* handleSignInError(error)
          }

          const user = yield* validateUser(data.user, "signIn")
          return buildAuthResult(user, data.session)
        }).pipe(Effect.withSpan("SupabaseAuth.signInWithPassword")),

      signUp: (credentials: SignUpCredentials) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                ...(credentials.options && { options: credentials.options })
              }),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Sign up failed",
                operation: "signUp",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: error.message || "Sign up failed",
                operation: "signUp",
                cause: error
              })
            )
          }

          const user = yield* validateUser(data.user, "signUp")
          return buildAuthResult(user, data.session)
        }).pipe(Effect.withSpan("SupabaseAuth.signUp")),

      signOut: () =>
        Effect.gen(function*() {
          const { error } = yield* Effect.tryPromise({
            try: () => client.auth.signOut(),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Sign out failed",
                operation: "signOut",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: error.message || "Sign out failed",
                operation: "signOut",
                cause: error
              })
            )
          }
        }).pipe(Effect.withSpan("SupabaseAuth.signOut")),

      verifyToken: (token: string) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(token),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Token verification failed",
                operation: "verifyToken",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: error.message || "Invalid token",
                tokenType: "access",
                cause: error
              })
            )
          }

          if (!data.user) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: "Token is valid but no user found",
                tokenType: "access"
              })
            )
          }

          // Decode using Schema for type safety
          const userOption = decodeUser(data.user)
          if (Option.isNone(userOption)) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: "Invalid user data from token",
                tokenType: "access"
              })
            )
          }

          return toAuthUser(userOption.value)
        }).pipe(Effect.withSpan("SupabaseAuth.verifyToken")),

      getSession: () =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getSession(),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Failed to get session",
                operation: "getSession",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: error.message || "Failed to get session",
                operation: "getSession",
                cause: error
              })
            )
          }

          // Decode using Schema for type safety
          if (!data.session) {
            return Option.none()
          }

          const sessionOption = decodeSession(data.session)
          return sessionOption
        }).pipe(Effect.withSpan("SupabaseAuth.getSession")),

      getUser: () =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Failed to get user",
                operation: "getUser",
                cause: error
              })
          })

          if (error) {
            // Not authenticated is not an error, just no user
            if (error.status === 401) {
              return Option.none()
            }
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: error.message || "Failed to get user",
                operation: "getUser",
                cause: error
              })
            )
          }

          // Decode using Schema for type safety
          if (!data.user) {
            return Option.none()
          }

          const userOption = decodeUser(data.user)
          return userOption
        }).pipe(Effect.withSpan("SupabaseAuth.getUser")),

      refreshSession: () =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.refreshSession(),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Failed to refresh session",
                operation: "refreshToken",
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("expired")) {
              return yield* Effect.fail(
                new SupabaseSessionExpiredError({
                  message: "Session has expired",
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: error.message || "Failed to refresh session",
                operation: "refreshToken",
                cause: error
              })
            )
          }

          if (!data.session) {
            return yield* Effect.fail(
              new SupabaseSessionExpiredError({
                message: "No session to refresh"
              })
            )
          }

          // Decode using Schema for type safety
          const sessionOption = decodeSession(data.session)
          if (Option.isNone(sessionOption)) {
            return yield* Effect.fail(
              new SupabaseAuthError({
                message: "Invalid session data from Supabase",
                operation: "refreshToken"
              })
            )
          }

          return sessionOption.value
        }).pipe(Effect.withSpan("SupabaseAuth.refreshSession")),

      getUserFromToken: (accessToken: string) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(accessToken),
            catch: (error) =>
              new SupabaseAuthError({
                message: "Failed to get user from token",
                operation: "getUser",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: error.message || "Invalid access token",
                tokenType: "access",
                cause: error
              })
            )
          }

          if (!data.user) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: "Token is valid but no user found",
                tokenType: "access"
              })
            )
          }

          // Decode using Schema for type safety
          const userOption = decodeUser(data.user)
          if (Option.isNone(userOption)) {
            return yield* Effect.fail(
              new SupabaseTokenError({
                message: "Invalid user data from token",
                tokenType: "access"
              })
            )
          }

          return toAuthUser(userOption.value)
        }).pipe(Effect.withSpan("SupabaseAuth.getUserFromToken")),
    }
  }

  /**
   * Live layer - requires SupabaseClient
   */
  static readonly Live = Layer.effect(
    SupabaseAuth,
    Effect.gen(function*() {
      const supabaseClient = yield* SupabaseClient;
      const client = yield* supabaseClient.getClient()
      return SupabaseAuth.createService(client)
    })
  )

  /**
   * Test layer with mock implementations
   */
  static readonly Test = Layer.succeed(SupabaseAuth, {
    signInWithPassword: () =>
      Effect.succeed({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: new Date().toISOString(),
        },
        session: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "test-user-id",
            email: "test@example.com",
            created_at: new Date().toISOString(),
          },
        },
      }),

    signUp: () =>
      Effect.succeed({
        user: {
          id: "new-user-id",
          email: "new@example.com",
          created_at: new Date().toISOString(),
        },
        session: null,
      }),

    signOut: () => Effect.void,

    verifyToken: () =>
      Effect.succeed({
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        role: "authenticated",
      }),

    getSession: () =>
      Effect.succeed(
        Option.some({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "test-user-id",
            email: "test@example.com",
            created_at: new Date().toISOString(),
          },
        })
      ),

    getUser: () =>
      Effect.succeed(
        Option.some({
          id: "test-user-id",
          email: "test@example.com",
          created_at: new Date().toISOString(),
        })
      ),

    refreshSession: () =>
      Effect.succeed({
        access_token: "refreshed-access-token",
        refresh_token: "refreshed-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: new Date().toISOString(),
        },
      }),

    getUserFromToken: () =>
      Effect.succeed({
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        role: "authenticated",
      })
  })

  /**
   * Dev layer with debug logging
   */
  static readonly Dev = Layer.effect(
    SupabaseAuth,
    Effect.gen(function*() {
      yield* Effect.logDebug("[SupabaseAuth] Initializing dev auth service...")

      // Use test implementations with logging
      return {
        signInWithPassword: (credentials: SignInCredentials) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] signInWithPassword", { email: credentials.email })
            return {
              user: {
                id: "dev-user-id",
                email: credentials.email,
                created_at: new Date().toISOString()
              },
              session: {
                access_token: "dev-access-token",
                refresh_token: "dev-refresh-token",
                expires_in: 3600,
                token_type: "bearer",
                user: {
                  id: "dev-user-id",
                  email: credentials.email,
                  created_at: new Date().toISOString(),
                }
              },
            };
          }),

        signUp: (credentials: SignUpCredentials) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] signUp", { email: credentials.email })
            return {
              user: {
                id: "dev-new-user-id",
                email: credentials.email,
                created_at: new Date().toISOString()
              },
              session: null,
            };
          }),

        signOut: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] signOut")
          }),

        verifyToken: (token: string) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] verifyToken", { token: \`\${token.slice(0, 10)}...\` })
            return {
              id: "dev-user-id",
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated",
            };
          }),

        getSession: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] getSession")
            return Option.some({
              access_token: "dev-access-token",
              refresh_token: "dev-refresh-token",
              expires_in: 3600,
              token_type: "bearer",
              user: {
                id: "dev-user-id",
                email: "dev@example.com",
                created_at: new Date().toISOString()
              },
            })
          }),

        getUser: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] getUser")
            return Option.some({
              id: "dev-user-id",
              email: "dev@example.com",
              created_at: new Date().toISOString(),
            })
          }),

        refreshSession: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] refreshSession")
            return {
              access_token: "dev-refreshed-token",
              refresh_token: "dev-refresh-token",
              expires_in: 3600,
              token_type: "bearer",
              user: {
                id: "dev-user-id",
                email: "dev@example.com",
                created_at: new Date().toISOString()
              },
            };
          }),

        getUserFromToken: (accessToken: string) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseAuth] getUserFromToken", { token: \`\${accessToken.slice(0, 10)}...\` })
            return {
              id: "dev-user-id",
              email: "dev@example.com",
              name: "Dev User",
              role: "authenticated",
            };
          })
      } ;
    })
  )
}`)

  return builder.toString()
}
