/**
 * Auth Contract Library
 *
 * Single source of truth for auth SDK types across the monorepo.
 *
 * NOTE: This library contains ONLY SDK types - types that map directly
 * to the authentication provider (Supabase). Application-specific user data
 * (seller_id, role, etc.) lives in @samuelho-dev/contract-user.
 *
 * This library defines:
 * - Schemas (AuthMethod, AuthSession, ServiceIdentity)
 * - Errors (AuthError, ServiceAuthError)
 * - Ports (AuthVerifier, ServiceAuthVerifier)
 * - Middleware (RouteTag, ServiceContext, RequestMeta)
 *
 * @module @samuelho-dev/contract-auth
 */

// ============================================================================
// Schemas
// ============================================================================

export {
  // User authentication (SDK-level)
  AuthMethod,
  AuthSession,
  // SDK-level user data from auth provider
  AuthUserData,
  type KnownService,
  KnownServices,
  // Service authentication
  ServiceIdentity,
  ServiceTokenRequest,
  // Service token request (for JWT generation)
  type ServiceTokenRequestInput,
  UserId
} from './lib/entities'

// ============================================================================
// Errors
// ============================================================================

export {
  // Combined
  type AuthContractError,
  type AuthDomainError,
  // User auth errors
  AuthError,
  AuthErrorCode,
  // Service auth errors
  ServiceAuthError,
  ServiceAuthErrorCode
} from './lib/errors'

// ============================================================================
// Ports (Service Interfaces)
// ============================================================================

export { AuthProvider, AuthVerifier, ServiceAuthVerifier } from './lib/ports'

// ============================================================================
// Middleware Context
// ============================================================================

export {
  // Request metadata
  RequestMeta,
  type RequestMetadata,
  // Route types
  RouteTag,
  type RouteType,
  type RpcWithRouteTag,
  // Service context (service-to-service auth)
  ServiceContext,
  // Handler context helpers
  type ServiceHandlerContext
} from './lib/middleware'
