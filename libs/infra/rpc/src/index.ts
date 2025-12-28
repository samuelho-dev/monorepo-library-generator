/**
 * RPC Infrastructure Library
 *
 * RPC infrastructure for Effect-based applications.

Contract-First Architecture:
- Contract library defines RPCs with RouteTag (public/protected/service)
- infra-rpc provides all middleware (auth, service-auth, request-meta, route-selector)
- Feature library imports from contract and implements handlers
- Middleware is applied automatically based on RouteTag

This library provides:
- RPC client for making typed requests
- Transport layer (HTTP/Internal) for client-server communication
- Middleware for authentication and request metadata
- Route selection based on contract RouteTag
- Core utilities for RPC operations

Usage:
  import {
    RpcClient,
    createRpcClientLayer,
    AuthMiddleware,
    ServiceMiddleware,
    createMiddlewareSelector
  } from '@samuelho-dev/infra-rpc';
 *
 */

// ============================================================================
// Errors
// ============================================================================

export {
  getHttpStatus,
  RpcConfigError,
  RpcConflictError,
  RpcConnectionError,
  type RpcError,
  RpcForbiddenError,
  // HTTP Status (single source of truth)
  RpcHttpStatus,
  // RPC Errors (Schema.TaggedError for serialization)
  RpcInfraError,
  // Domain Errors (Data.TaggedError for internal use)
  RpcInternalDomainError,
  RpcInternalError,
  RpcNotFoundError,
  RpcRateLimitError,
  RpcServiceError,
  RpcTimeoutError,
  RpcValidationError,
  // Error Boundary
  withRpcErrorBoundary
} from './lib/errors'

// ============================================================================
// Core RPC Utilities
// ============================================================================

// Re-exports from @effect/rpc
// Definition helpers
// Schema helpers
export {
  createHandlers,
  defineRpc,
  defineRpcGroup,
  EmptyRequest,
  type HandlersFor,
  IdRequest,
  paginatedResponse,
  paginationRequest,
  Rpc,
  RpcGroup,
  type RpcHandler,
  SuccessResponse
} from './lib/core'

// ============================================================================
// RPC Client
// ============================================================================

export {
  createRpcClientLayer,
  RpcClient,
  type RpcClientConfig,
  RpcClientConfigTag
} from './lib/client'

// ============================================================================
// Transport Layer
// ============================================================================

// Router utilities
export {
  combineHandlers,
  createNextRpcHandler,
  defaultRouterConfig,
  type HealthCheckResponse,
  healthCheck,
  type NextRpcHandler,
  type NextRpcHandlerOptions,
  type RouterConfig,
  type RpcHandlerMap,
  type RpcRequiredLayers
} from './lib/router'
// Transport types
export type {
  HttpRpcClientConfig,
  HttpTransportConfig,
  HttpTransportOptions,
  RpcTransportConfig,
  TransportConfig,
  TransportMode
} from './lib/transport'
// HTTP transport client
// Transport utilities
export {
  createNextHandler,
  errorResponse,
  extractHeaders,
  HttpRpcClient,
  jsonResponse,
  type NextHandler,
  RpcTransportClient
} from './lib/transport'

// ============================================================================
// Middleware (Contract-First Architecture)
// ============================================================================

// User Authentication (Protected Routes)
// Service-to-Service Authentication (Service Routes)
// Request Metadata (All Routes)
// Route Selection (Contract-First)
// Combined Middleware Layers
export {
  AdminTestUser,
  AllMiddlewareLive,
  AllMiddlewareTest,
  // Errors
  AuthError,
  type AuthMethod,
  AuthMethodContext,
  // Middleware
  AuthMiddleware,
  AuthMiddlewareAdmin,
  AuthMiddlewareLive,
  AuthMiddlewareTest,
  // Interface (for infra-auth to implement)
  AuthVerifier,
  applyRouteMiddleware,
  assertRouteType,
  // Context Tags
  CurrentUser,
  // Types
  type CurrentUserData,
  createMiddlewareSelector,
  createRequestRouteContext,
  defaultMiddlewareConfig,
  detectRouteType,
  generateServiceToken,
  // Helpers
  getHandlerContext,
  getHandlerContextOptional,
  // Functions
  getRouteType,
  type HandlerContext,
  KNOWN_SERVICES,
  // Dev helpers
  logRouteType,
  type MiddlewareSelectorConfig,
  // Context Tags
  RequestMeta,
  // Types
  type RequestMetadata,
  // Middleware
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,
  type RequestRouteContext,
  // Context
  RequestRouteContextTag,
  // Symbol
  RouteTag,
  // Types
  type RouteType,
  type RpcWithRouteTag,
  requireServicePermission,
  // Errors
  ServiceAuthError,
  // Context Tags
  ServiceContext,
  // Types
  type ServiceIdentity,
  // Middleware
  ServiceMiddleware,
  ServiceMiddlewareLive,
  ServiceMiddlewareTest,
  // Test data
  TestServiceIdentity,
  // Test data
  TestUser,
  validateRpcRoutes,
  // Token utilities
  validateServiceToken
} from './lib/middleware'

// ============================================================================
// Client Hooks (React)
// ============================================================================

export {
  // Core RPC call function (Schema-validated)
  callRpc,
  // Runtime utilities
  getRpcRuntime,
  type ParsedRpcError,
  // Types
  type RpcCallOptions,
  runEffectExit,
  // Lazy query hook (manual trigger)
  useRpcLazyQuery,
  // Mutation hook with loading/error state
  useRpcMutation,
  // Query hook with automatic fetching
  useRpcQuery
} from './lib/hooks'
