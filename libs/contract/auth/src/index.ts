/**
 * Auth Contract Library
 *
 * Single source of truth for auth types across the monorepo.

This library defines all auth-related types:
- Schemas (CurrentUserData, AuthMethod, ServiceIdentity)
- Errors (AuthError, ServiceAuthError)
- Ports (AuthVerifier, AuthProvider, ServiceAuthVerifier)
- Middleware (RouteTag, CurrentUser, ServiceContext, RequestMeta)

Other libraries import from here:
- infra-rpc: Uses middleware and errors
- infra-auth: Implements ports
- provider-supabase: Maps to schemas
 *
 * @module @samuelho-dev/contract-auth
 */

// ============================================================================
// Schemas
// ============================================================================

export {
  type AuthenticatedUserData,
  AuthenticatedUserDataSchema,
  type AuthMethod,
  AuthMethodSchema,
  type AuthSession,
  AuthSessionSchema,
  type CurrentUserData,
  // User authentication
  CurrentUserDataSchema,
  type KnownService,
  KnownServicesSchema,
  type ServiceIdentity,
  // Service authentication
  ServiceIdentitySchema
} from "./lib/schemas"

// ============================================================================
// Errors
// ============================================================================

export {
  // Combined
  type AuthContractError,
  // User auth errors
  AuthError,
  type AuthErrorCode,
  AuthErrorCodeSchema,
  // Service auth errors
  ServiceAuthError,
  type ServiceAuthErrorCode,
  ServiceAuthErrorCodeSchema
} from "./lib/errors"

// ============================================================================
// Ports (Service Interfaces)
// ============================================================================

export {
  AuthProvider,
  type AuthProviderInterface,
  // User authentication
  AuthVerifier,
  type AuthVerifierInterface,
  // Service authentication
  ServiceAuthVerifier,
  type ServiceAuthVerifierInterface
} from "./lib/ports"

// ============================================================================
// Middleware Context
// ============================================================================

export {
  // User context
  CurrentUser,
  // Handler context helpers
  type HandlerContext,
  // Request metadata
  RequestMeta,
  type RequestMetadata,
  // Route types
  RouteTag,
  type RouteType,
  type RpcWithRouteTag,
  // Service context
  ServiceContext,
  type ServiceHandlerContext
} from "./lib/middleware"
