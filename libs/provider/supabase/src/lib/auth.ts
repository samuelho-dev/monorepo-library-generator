import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js'
import { Context, Duration, Effect, Layer, Option, Schema } from 'effect'
import {
  SupabaseAuthError,
  SupabaseConnectionError,
  SupabaseInvalidCredentialsError,
  SupabaseSessionExpiredError,
  SupabaseTokenError
} from './errors'
import { SupabaseClient } from './service'
import type {
  AuthResult,
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  SupabaseSession,
  SupabaseUser
} from './types'
import { SupabaseSessionSchema, SupabaseUserSchema } from './types'

/**
 * SupabaseAuth Service
 *
 * Supabase authentication provider with Effect integration.

Wraps Supabase Auth API for:
- Email/password authentication
- Token verification (for RPC middleware)
- Session management
- User retrieval

This service is consumed by infra-auth for the auth middleware.
 *
 * @module @samuelho-dev/provider-supabase/service/auth
 * @see https://supabase.com/docs/reference/javascript/auth-api
 */

// ============================================================================
// Service Interface
// ============================================================================

/**
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
  ) => Effect.Effect<
    AuthResult,
    SupabaseAuthError | SupabaseInvalidCredentialsError | SupabaseConnectionError
  >

  /**
   * Sign up with email and password
   */
  readonly signUp: (
    credentials: SignUpCredentials
  ) => Effect.Effect<AuthResult, SupabaseAuthError | SupabaseConnectionError>

  /**
   * Sign out the current user
   */
  readonly signOut: () => Effect.Effect<void, SupabaseAuthError | SupabaseConnectionError>

  /**
   * Verify a JWT token and return the user
   *
   * Used by RPC middleware to validate Bearer tokens.
   */
  readonly verifyToken: (
    token: string
  ) => Effect.Effect<AuthUser, SupabaseAuthError | SupabaseTokenError | SupabaseConnectionError>

  /**
   * Get the current session
   *
   * Returns None if no active session.
   */
  readonly getSession: () => Effect.Effect<
    Option.Option<SupabaseSession>,
    SupabaseAuthError | SupabaseConnectionError
  >

  /**
   * Get the current user
   *
   * Returns None if no authenticated user.
   */
  readonly getUser: () => Effect.Effect<
    Option.Option<SupabaseUser>,
    SupabaseAuthError | SupabaseConnectionError
  >

  /**
   * Refresh the current session
   */
  readonly refreshSession: () => Effect.Effect<
    SupabaseSession,
    SupabaseAuthError | SupabaseSessionExpiredError | SupabaseConnectionError
  >

  /**
   * Get user from session token (server-side)
   *
   * For server-side verification without cookies.
   * Used by RPC handlers to verify session tokens.
   */
  readonly getUserFromToken: (
    accessToken: string
  ) => Effect.Effect<AuthUser, SupabaseAuthError | SupabaseTokenError | SupabaseConnectionError>

  /**
   * Sign in with OTP (magic link)
   */
  readonly signInWithOtp: (params: {
    email: string
    options?: { emailRedirectTo?: string }
  }) => Effect.Effect<void, SupabaseAuthError | SupabaseConnectionError>

  /**
   * Verify OTP token
   */
  readonly verifyOtp: (params: {
    email: string
    token: string
    type: 'email' | 'magiclink' | 'signup' | 'invite' | 'recovery'
  }) => Effect.Effect<
    { user: SupabaseUser | null; session: SupabaseSession | null },
    SupabaseAuthError | SupabaseConnectionError
  >

  /**
   * Update current user
   */
  readonly updateUser: (params: {
    email?: string
    password?: string
    data?: Record<string, unknown>
  }) => Effect.Effect<SupabaseUser, SupabaseAuthError | SupabaseConnectionError>
}

// ============================================================================
// Helpers
// ============================================================================

const AUTH_TIMEOUT = Duration.millis(10_000)

/**
 * Decode SDK user to typed SupabaseUser using Schema
 *
 * Uses Effect Schema for type-safe decoding instead of type assertions.
 */
const decodeUser = Schema.decodeUnknownOption(SupabaseUserSchema)

/**
 * Effect-returning user decoder that PRESERVES the ParseError.
 *
 * Unlike `decodeUser` (Option-based, discards the failure reason), this surfaces
 * the schema/SDK mismatch so token-decode failures are self-diagnosing instead of
 * collapsing to a bare "Invalid user data from token".
 */
const decodeUserEffect = Schema.decodeUnknownEffect(SupabaseUserSchema)

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
type AuthOperation =
  | 'signIn'
  | 'signOut'
  | 'signUp'
  | 'verifyToken'
  | 'refreshToken'
  | 'getSession'
  | 'getUser'

/**
 * Validate and decode user from SDK response
 */
function validateUser(user: unknown, operation: AuthOperation) {
  const userOption = decodeUser(user)
  if (Option.isNone(userOption)) {
    return Effect.fail(
      new SupabaseAuthError({
        retryable: true as const,
        message: 'Invalid user data from Supabase',
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
  if (error.message?.includes('Invalid login credentials')) {
    return Effect.fail(
      new SupabaseInvalidCredentialsError({
        retryable: false as const,
        message: 'Invalid email or password',
        cause: error
      })
    )
  }
  return Effect.fail(
    new SupabaseAuthError({
      retryable: true as const,
      message: error.message || 'Sign in failed',
      operation: 'signIn',
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
}

/**
 * Decode optional user and session from OTP verification response
 */
function decodeOtpResult(data: { user: unknown; session: unknown }) {
  const userOption = data.user ? decodeUser(data.user) : Option.none()
  const sessionOption = data.session ? decodeSession(data.session) : Option.none()

  return {
    user: Option.isSome(userOption) ? userOption.value : null,
    session: Option.isSome(sessionOption) ? sessionOption.value : null
  }
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * SupabaseAuth Service Tag
 *
 * Access via: yield* SupabaseAuth
 *
 * Requires: SupabaseClient
 *
 * Static layers:
 * - SupabaseAuth.Live - Production layer (requires SupabaseClient.Live)
 * - SupabaseAuth.Test - Test layer with mock implementations
 */
export class SupabaseAuth extends Context.Service<SupabaseAuth, SupabaseAuthServiceInterface>()(
  '@samuelho-dev/provider-supabase/SupabaseAuth'
) {
  /**
   * Create auth service from Supabase client
   */
  private static createService(client: SupabaseSDKClient) {
    return {
      signInWithPassword: Effect.fn('SupabaseAuth.signInWithPassword')(
        function* (credentials: SignInCredentials) {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              }),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Sign in failed',
                operation: 'signIn',
                cause: error
              })
          })

          if (error) {
            return yield* handleSignInError(error)
          }

          const user = yield* validateUser(data.user, 'signIn')
          return buildAuthResult(user, data.session)
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.signInWithPassword')
      ),

      signUp: Effect.fn('SupabaseAuth.signUp')(
        function* (credentials: SignUpCredentials) {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                ...(credentials.options && { options: credentials.options })
              }),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Sign up failed',
                operation: 'signUp',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Sign up failed',
              operation: 'signUp',
              cause: error
            })
          }

          const user = yield* validateUser(data.user, 'signUp')
          return buildAuthResult(user, data.session)
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.signUp')
      ),

      signOut: Effect.fn('SupabaseAuth.signOut')(
        function* () {
          const { error } = yield* Effect.tryPromise({
            try: () => client.auth.signOut(),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Sign out failed',
                operation: 'signOut',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Sign out failed',
              operation: 'signOut',
              cause: error
            })
          }
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.signOut')
      ),

      verifyToken: Effect.fn('SupabaseAuth.verifyToken')(
        function* (token: string) {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(token),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Token verification failed',
                operation: 'verifyToken',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseTokenError({
              retryable: false as const,
              message: error.message || 'Invalid token',
              tokenType: 'access',
              cause: error
            })
          }

          if (!data.user) {
            return yield* new SupabaseTokenError({
              retryable: false as const,
              message: 'Token is valid but no user found',
              tokenType: 'access'
            })
          }

          // Decode using Schema for type safety. Effect-returning decoder so the
          // ParseError reason is surfaced in the error message (not swallowed).
          const user = yield* decodeUserEffect(data.user).pipe(
            Effect.mapError(
              (parseError) =>
                new SupabaseTokenError({
                  retryable: false as const,
                  message: `Invalid user data from token: ${parseError.message}`,
                  tokenType: 'access'
                })
            )
          )

          return toAuthUser(user)
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.verifyToken')
      ),

      getSession: Effect.fn('SupabaseAuth.getSession')(
        function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getSession(),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to get session',
                operation: 'getSession',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to get session',
              operation: 'getSession',
              cause: error
            })
          }

          // Decode using Schema for type safety
          if (!data.session) {
            return Option.none()
          }

          const sessionOption = decodeSession(data.session)
          return sessionOption
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.getSession')
      ),

      getUser: Effect.fn('SupabaseAuth.getUser')(
        function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to get user',
                operation: 'getUser',
                cause: error
              })
          })

          if (error) {
            // Not authenticated is not an error, just no user
            if (error.status === 401) {
              return Option.none()
            }
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to get user',
              operation: 'getUser',
              cause: error
            })
          }

          // Decode using Schema for type safety
          if (!data.user) {
            return Option.none()
          }

          const userOption = decodeUser(data.user)
          return userOption
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.getUser')
      ),

      refreshSession: Effect.fn('SupabaseAuth.refreshSession')(
        function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.refreshSession(),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to refresh session',
                operation: 'refreshToken',
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes('expired')) {
              return yield* new SupabaseSessionExpiredError({
                retryable: false as const,
                message: 'Session has expired',
                cause: error
              })
            }
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to refresh session',
              operation: 'refreshToken',
              cause: error
            })
          }

          if (!data.session) {
            return yield* new SupabaseSessionExpiredError({
              retryable: false as const,
              message: 'No session to refresh'
            })
          }

          // Decode using Schema for type safety
          const sessionOption = decodeSession(data.session)
          if (Option.isNone(sessionOption)) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: 'Invalid session data from Supabase',
              operation: 'refreshToken'
            })
          }

          return sessionOption.value
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.refreshSession')
      ),

      getUserFromToken: Effect.fn('SupabaseAuth.getUserFromToken')(
        function* (accessToken: string) {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.getUser(accessToken),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to get user from token',
                operation: 'getUser',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseTokenError({
              retryable: false as const,
              message: error.message || 'Invalid access token',
              tokenType: 'access',
              cause: error
            })
          }

          if (!data.user) {
            return yield* new SupabaseTokenError({
              retryable: false as const,
              message: 'Token is valid but no user found',
              tokenType: 'access'
            })
          }

          // Decode using Schema for type safety. Effect-returning decoder so the
          // ParseError reason is surfaced in the error message (not swallowed).
          const user = yield* decodeUserEffect(data.user).pipe(
            Effect.mapError(
              (parseError) =>
                new SupabaseTokenError({
                  retryable: false as const,
                  message: `Invalid user data from token: ${parseError.message}`,
                  tokenType: 'access'
                })
            )
          )

          return toAuthUser(user)
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.getUserFromToken')
      ),

      signInWithOtp: Effect.fn('SupabaseAuth.signInWithOtp')(
        function* (params: { email: string; options?: { emailRedirectTo?: string } }) {
          const { error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.signInWithOtp({
                email: params.email,
                ...(params.options ? { options: params.options } : {})
              }),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to send OTP',
                operation: 'signIn',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to send OTP',
              operation: 'signIn',
              cause: error
            })
          }
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.signInWithOtp')
      ),

      verifyOtp: Effect.fn('SupabaseAuth.verifyOtp')(
        function* (params: {
          email: string
          token: string
          type: 'email' | 'magiclink' | 'signup' | 'invite' | 'recovery'
        }) {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.auth.verifyOtp({
                email: params.email,
                token: params.token,
                type: params.type
              }),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to verify OTP',
                operation: 'verifyToken',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to verify OTP',
              operation: 'verifyToken',
              cause: error
            })
          }

          return decodeOtpResult(data)
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.verifyOtp')
      ),

      updateUser: Effect.fn('SupabaseAuth.updateUser')(
        function* (params: { email?: string; password?: string; data?: Record<string, unknown> }) {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.auth.updateUser(params),
            catch: (error) =>
              new SupabaseAuthError({
                retryable: true as const,
                message: 'Failed to update user',
                operation: 'getUser',
                cause: error
              })
          })

          if (error) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: error.message || 'Failed to update user',
              operation: 'getUser',
              cause: error
            })
          }

          const userOption = decodeUser(data.user)
          if (Option.isNone(userOption)) {
            return yield* new SupabaseAuthError({
              retryable: true as const,
              message: 'Invalid user data from update response',
              operation: 'getUser'
            })
          }

          return userOption.value
        },
        Effect.timeout(AUTH_TIMEOUT),
        Effect.catchTag('TimeoutError', () =>
          Effect.fail(
            new SupabaseConnectionError({
              message: 'Supabase auth timed out',
              retryable: true
            })
          )
        ),
        Effect.withSpan('SupabaseAuth.updateUser')
      )
    }
  }

  /**
   * Live layer - requires SupabaseClient
   */
  static readonly Live = Layer.effect(
    SupabaseAuth,
    Effect.gen(function* () {
      const supabaseClient = yield* SupabaseClient
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
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date()
        },
        session: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            created_at: new Date()
          }
        }
      }),

    signUp: () =>
      Effect.succeed({
        user: {
          id: 'new-user-id',
          email: 'new@example.com',
          created_at: new Date()
        },
        session: null
      }),

    signOut: () => Effect.void,

    verifyToken: () =>
      Effect.succeed({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'authenticated'
      }),

    getSession: () =>
      Effect.succeed(
        Option.some({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            created_at: new Date()
          }
        })
      ),

    getUser: () =>
      Effect.succeed(
        Option.some({
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date()
        })
      ),

    refreshSession: () =>
      Effect.succeed({
        access_token: 'refreshed-access-token',
        refresh_token: 'refreshed-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date()
        }
      }),

    getUserFromToken: () =>
      Effect.succeed({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'authenticated'
      }),

    signInWithOtp: () => Effect.void,

    verifyOtp: () =>
      Effect.succeed({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: new Date()
        },
        session: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            created_at: new Date()
          }
        }
      }),

    updateUser: () =>
      Effect.succeed({
        id: 'test-user-id',
        email: 'updated@example.com',
        created_at: new Date()
      })
  })
}
