import { Layer } from "effect"

/**
 * Rpc RPC Middleware
 *
 * Consolidated middleware exports for RPC operations.

This module is the SINGLE SOURCE OF TRUTH for all RPC middleware.
Feature libraries should NOT define their own middleware.

Middleware Types:
- User Authentication (protected routes): CurrentUser, AuthMiddleware
- Service Authentication (service routes): ServiceContext, ServiceMiddleware
- Request Metadata (all routes): RequestMeta, RequestMetaMiddleware
- Route Selection (automatic): createMiddlewareSelector, RouteTag

Usage:
```typescript
import {
  AuthMiddleware,
  AuthMiddlewareLive,
  ServiceMiddleware,
  ServiceMiddlewareLive,
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,
  createMiddlewareSelector,
} from "@samuelho-dev/infra-rpc";
```
 *
 * @module @samuelho-dev/infra-rpc/middleware
 */

// Import middleware layers for combined layer composition
// (must be before re-exports to maintain type inference)
import { AuthMiddleware, AuthMiddlewareLive, AuthMiddlewareTest } from "./auth"
import { RequestMetaMiddleware, RequestMetaMiddlewareLive } from "./request-meta"
import type { MiddlewareSelectorConfig } from "./route-selector"
import { ServiceMiddleware, ServiceMiddlewareLive, ServiceMiddlewareTest } from "./service-auth"

// ============================================================================
// User Authentication (Protected Routes)
// ============================================================================
// Re-export user auth middleware
export {
  AdminTestUser,
  // Errors
  AuthError,
  type AuthMethod,
  AuthMethodContext,
  // Middleware (also re-exported from imports above)
  AuthMiddlewareAdmin,
  // Interface (for infra-auth to implement)
  AuthVerifier,
  // Context Tags
  CurrentUser,
  // Types
  type CurrentUserData,
  // Test data
  TestUser
} from "./auth"

// Re-export imported middleware (preserves type inference)
export { AuthMiddleware, AuthMiddlewareLive, AuthMiddlewareTest }

// ============================================================================
// Service Authentication (Service Routes)
// ============================================================================
// Re-export service auth middleware
export {
  generateServiceToken,
  KNOWN_SERVICES,
  // Permission helper
  requireServicePermission,
  // Errors
  ServiceAuthError,
  // Context Tags
  ServiceContext,
  // Types
  type ServiceIdentity,
  // Test data
  TestServiceIdentity,
  // Token utilities
  validateServiceToken
} from "./service-auth"

// Re-export imported middleware (preserves type inference)
export { ServiceMiddleware, ServiceMiddlewareLive, ServiceMiddlewareTest }

// ============================================================================
// Request Metadata (All Routes)
// ============================================================================
// Re-export request meta middleware
export {
  // Helpers
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,
  // Context Tags
  RequestMeta,
  // Types
  type RequestMetadata
} from "./request-meta"

// Re-export imported middleware (preserves type inference)
export { RequestMetaMiddleware, RequestMetaMiddlewareLive }

// ============================================================================
// Route Selection (Contract-First)
// ============================================================================
// Re-export route selector
export {
  applyRouteMiddleware,
  assertRouteType,
  createMiddlewareSelector,
  createRequestRouteContext,
  detectRouteType,
  // Functions
  getRouteType,
  // Dev helpers
  logRouteType,
  type MiddlewareSelectorConfig,
  type RequestRouteContext,
  // Context
  RequestRouteContextTag,
  // Symbol
  RouteTag,
  // Types
  type RouteType,
  type RpcWithRouteTag,
  validateRpcRoutes
} from "./route-selector"

// ============================================================================
// Combined Middleware Layers
// ============================================================================
/**
 * Combined middleware layer for development/testing
 *
 * Provides all middleware with test implementations.
 */
export const AllMiddlewareTest = Layer.mergeAll(
  AuthMiddlewareTest,
  ServiceMiddlewareTest,
  RequestMetaMiddlewareLive
)

/**
 * Combined middleware layer for production
 *
 * Provides all middleware with live implementations.
 * Note: AuthMiddleware.Live requires AuthVerifier to be provided.
 */
export const AllMiddlewareLive = Layer.mergeAll(
  AuthMiddlewareLive,
  ServiceMiddlewareLive,
  RequestMetaMiddlewareLive
)

/**
 * Default middleware selector configuration for development
 */
export const defaultMiddlewareConfig: MiddlewareSelectorConfig = {
  protectedMiddleware: AuthMiddlewareTest,
  serviceMiddleware: ServiceMiddlewareTest,
  globalMiddleware: RequestMetaMiddlewareLive
}
