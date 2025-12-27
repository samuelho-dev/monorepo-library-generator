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
} from "./lib/errors"

// ============================================================================
// Core RPC Utilities
// ============================================================================

// Re-exports from @effect/rpc
export { Rpc, RpcGroup } from "./lib/core"

// Definition helpers
export { createHandlers, defineRpc, defineRpcGroup, type HandlersFor, type RpcHandler } from "./lib/core"

// Schema helpers
export { EmptyRequest, IdRequest, paginatedResponse, paginationRequest, SuccessResponse } from "./lib/core"

// ============================================================================
// RPC Client
// ============================================================================

export { createRpcClientLayer, RpcClient, type RpcClientConfig, RpcClientConfigTag } from "./lib/client"

// ============================================================================
// Transport Layer
// ============================================================================

// Transport types
export type {
  HttpRpcClientConfig,
  HttpTransportConfig,
  HttpTransportOptions,
  RpcTransportConfig,
  TransportConfig,
  TransportMode
} from "./lib/transport"

// HTTP transport client
export { createNextHandler, HttpRpcClient, RpcTransportClient } from "./lib/transport"

// Transport utilities
export { errorResponse, extractHeaders, jsonResponse, type NextHandler } from "./lib/transport"

// Router utilities
export {
  combineHandlers,
  createNextRpcHandler,
  defaultRouterConfig,
  healthCheck,
  type HealthCheckResponse,
  type NextRpcHandler,
  type NextRpcHandlerOptions,
  type RouterConfig,
  type RpcHandlerMap,
  type RpcRequiredLayers
} from "./lib/router"

// ============================================================================
// Middleware (Contract-First Architecture)
// ============================================================================

// User Authentication (Protected Routes)
export {
  AdminTestUser,
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
  // Context Tags
  CurrentUser,
  // Types
  type CurrentUserData,
  // Test data
  TestUser
} from "./lib/middleware"

// Service-to-Service Authentication (Service Routes)
export {
  generateServiceToken,
  KNOWN_SERVICES,
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
  // Token utilities
  validateServiceToken
} from "./lib/middleware"

// Request Metadata (All Routes)
export {
  // Helpers
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,
  // Context Tags
  RequestMeta,
  // Types
  type RequestMetadata,
  // Middleware
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive
} from "./lib/middleware"

// Route Selection (Contract-First)
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
} from "./lib/middleware"

// Combined Middleware Layers
export { AllMiddlewareLive, AllMiddlewareTest, defaultMiddlewareConfig } from "./lib/middleware"

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
} from "./lib/hooks"
