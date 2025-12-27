/**
 * Contract Auth Ports Template
 *
 * Generates lib/ports.ts for contract-auth library.
 * Defines auth service interfaces using Context.Tag pattern.
 *
 * @module monorepo-library-generator/contract/auth/ports
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { AuthTemplateOptions } from './schemas.template'

/**
 * Generate lib/ports.ts for contract-auth library
 *
 * Ports defined:
 * - AuthVerifier: Interface for verifying auth tokens
 * - AuthProvider: Interface for auth operations (login, logout, refresh)
 * - ServiceAuthVerifier: Interface for service-to-service auth
 */
export function generateAuthPortsFile(options: AuthTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: 'Auth Contract Ports',
    description: `Service interfaces for authentication.

These are the ports (interfaces) that auth implementations must satisfy.
infra-auth provides the implementations, contract-auth defines the interfaces.

Ports:
- AuthVerifier: Verify and decode auth tokens
- AuthProvider: Full auth operations (for auth services)
- ServiceAuthVerifier: Service-to-service token verification`,
    module: `${options.packageName}/ports`
  })
  builder.addBlankLine()

  builder.addImports([{ from: 'effect', imports: ['Context', 'Effect', 'Option'] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: './schemas',
      imports: ['AuthSession', 'CurrentUserData', 'ServiceIdentity'],
      isTypeOnly: true
    },
    { from: './errors', imports: ['AuthError', 'ServiceAuthError'], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addSectionComment('User Authentication Ports')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Auth Verifier Interface
 *
 * Verifies authentication tokens and returns user data.
 * This is the primary interface used by RPC middleware.
 *
 * Implementations:
 * - infra-auth provides Live/Test implementations
 * - provider-supabase can provide Supabase-based implementation
 */
export interface AuthVerifierInterface {
  /**
   * Verify a token and return user data
   *
   * @param token - The authentication token (JWT, session ID, etc.)
   * @returns User data if valid, AuthError if invalid
   */
  readonly verify: (token: string) => Effect.Effect<CurrentUserData, AuthError>
  /**
   * Verify a token and return optional user data
   *
   * Useful for public routes that optionally use auth context.
   *
   * @param token - The authentication token (may be undefined)
   * @returns Some(user) if valid, None if no token or invalid
   */
  readonly verifyOptional: (
    token: string | undefined
  ) => Effect.Effect<Option.Option<CurrentUserData>>
}

/**
 * Auth Verifier Context Tag
 */
export class AuthVerifier extends Context.Tag("AuthVerifier")<
  AuthVerifier,
  AuthVerifierInterface
>() {}

/**
 * Auth Provider Interface
 *
 * Full authentication operations for auth services.
 * Used by login/logout/refresh endpoints.
 */
export interface AuthProviderInterface {
  /**
   * Authenticate user and create session
   */
  readonly authenticate: (credentials: {
    readonly email: string
    readonly password: string
  }) => Effect.Effect<AuthSession, AuthError>
  /**
   * Refresh an existing session
   */
  readonly refresh: (
    refreshToken: string
  ) => Effect.Effect<AuthSession, AuthError>
  /**
   * Invalidate a session (logout)
   */
  readonly invalidate: (sessionId: string) => Effect.Effect<void, AuthError>
  /**
   * Get current session info
   */
  readonly getSession: (
    sessionId: string
  ) => Effect.Effect<Option.Option<AuthSession>, AuthError>
}

/**
 * Auth Provider Context Tag
 */
export class AuthProvider extends Context.Tag("AuthProvider")<
  AuthProvider,
  AuthProviderInterface
>() {}
`)
  builder.addBlankLine()

  builder.addSectionComment('Service-to-Service Authentication Ports')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Service Auth Verifier Interface
 *
 * Verifies service-to-service authentication tokens.
 * Used for internal service communication.
 */
export interface ServiceAuthVerifierInterface {
  /**
   * Verify a service token and return service identity
   *
   * @param token - The service authentication token
   * @returns Service identity if valid, ServiceAuthError if invalid
   */
  readonly verify: (
    token: string
  ) => Effect.Effect<ServiceIdentity, ServiceAuthError>
  /**
   * Generate a service token for outgoing requests
   *
   * @param serviceName - The calling service name
   * @returns Service token for authentication
   */
  readonly generateToken: (
    serviceName: string
  ) => Effect.Effect<string, ServiceAuthError>
  /**
   * Check if a service has permission for an operation
   *
   * @param identity - The service identity
   * @param permission - The permission to check
   * @returns true if permitted
   */
  readonly hasPermission: (
    identity: ServiceIdentity,
    permission: string
  ) => Effect.Effect<boolean>
}

/**
 * Service Auth Verifier Context Tag
 */
export class ServiceAuthVerifier extends Context.Tag("ServiceAuthVerifier")<
  ServiceAuthVerifier,
  ServiceAuthVerifierInterface
>() {}
`)
  builder.addBlankLine()

  return builder.toString()
}
