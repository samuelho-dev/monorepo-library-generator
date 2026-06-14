import { Context, type Effect, type Option } from 'effect'
import type { AuthSession, AuthUserData, ServiceIdentity } from './entities'
import type { AuthError, ServiceAuthError } from './errors'

// ============================================================================
// User Authentication Ports
// ============================================================================

export class AuthVerifier extends Context.Service<
  AuthVerifier,
  {
    readonly verify: (token: string) => Effect.Effect<AuthUserData, AuthError>
    readonly verifyOptional: (
      token: string | undefined
    ) => Effect.Effect<Option.Option<AuthUserData>>
  }
>()('@samuelho-dev/contract-auth/AuthVerifier') {}

export class AuthProvider extends Context.Service<
  AuthProvider,
  {
    readonly authenticate: (credentials: {
      readonly email: string
      readonly password: string
    }) => Effect.Effect<AuthSession, AuthError>
    readonly refresh: (refreshToken: string) => Effect.Effect<AuthSession, AuthError>
    readonly invalidate: (sessionId: string) => Effect.Effect<void, AuthError>
    readonly getSession: (sessionId: string) => Effect.Effect<Option.Option<AuthSession>, AuthError>
  }
>()('@samuelho-dev/contract-auth/AuthProvider') {}

// ============================================================================
// Service-to-Service Authentication Ports
// ============================================================================

export class ServiceAuthVerifier extends Context.Service<
  ServiceAuthVerifier,
  {
    readonly verify: (token: string) => Effect.Effect<ServiceIdentity, ServiceAuthError>
    readonly generateToken: (serviceName: string) => Effect.Effect<string, ServiceAuthError>
    readonly hasPermission: (
      identity: ServiceIdentity,
      permission: string
    ) => Effect.Effect<boolean>
  }
>()('@samuelho-dev/contract-auth/ServiceAuthVerifier') {}
