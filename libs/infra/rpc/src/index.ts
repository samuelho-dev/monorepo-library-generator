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
    createMiddlewareSelector,
  } from '@samuelho-dev/infra-rpc';
 *
 */


// ============================================================================
// Errors
// ============================================================================


export {
  // RPC Errors (Schema.TaggedError for serialization)
  RpcInfraError,
  RpcRateLimitError,
  RpcValidationError,
  RpcNotFoundError,
  RpcTimeoutError,
  RpcForbiddenError,
  RpcConflictError,
  RpcServiceError,
  RpcInternalError,
  type RpcError,

  // Domain Errors (Data.TaggedError for internal use)
  RpcInternalDomainError,
  RpcConfigError,
  RpcConnectionError,

  // HTTP Status (single source of truth)
  RpcHttpStatus,
  getHttpStatus,

  // Error Boundary
  withRpcErrorBoundary,
} from "./lib/errors";

// ============================================================================
// Core RPC Utilities
// ============================================================================


// Re-exports from @effect/rpc
export { Rpc, RpcGroup } from "./lib/core";

// Definition helpers
export {
  defineRpc,
  defineRpcGroup,
  createHandlers,
  type RpcHandler,
  type HandlersFor,
} from "./lib/core";

// Schema helpers
export {
  paginatedResponse,
  paginationRequest,
  IdRequest,
  SuccessResponse,
  EmptyRequest,
} from "./lib/core";

// ============================================================================
// RPC Client
// ============================================================================


export {
  RpcClient,
  RpcClientConfigTag,
  createRpcClientLayer,
  type RpcClientConfig,
} from "./lib/client";

// ============================================================================
// Transport Layer
// ============================================================================


// Transport types
export type {
  TransportMode,
  TransportConfig,
  HttpTransportConfig,
  RpcTransportConfig,
  HttpTransportOptions,
  HttpRpcClientConfig,
} from "./lib/transport";

// HTTP transport client
export { HttpRpcClient, RpcTransportClient, createNextHandler } from "./lib/transport";

// Transport utilities
export {
  extractHeaders,
  jsonResponse,
  errorResponse,
  type NextHandler,
} from "./lib/transport";

// Router utilities
export {
  createNextRpcHandler,
  combineHandlers,
  healthCheck,
  defaultRouterConfig,
  type RouterConfig,
  type HealthCheckResponse,
  type RpcHandlerMap,
  type RpcRequiredLayers,
  type NextRpcHandlerOptions,
  type NextRpcHandler,
} from "./lib/router";

// ============================================================================
// Middleware (Contract-First Architecture)
// ============================================================================


// User Authentication (Protected Routes)
export {
  // Types
  type CurrentUserData,
  type AuthMethod,
  type AuthenticatedUserData,

  // Context Tags
  CurrentUser,
  AuthMethodContext,

  // Errors
  AuthError,

  // Interface (for infra-auth to implement)
  AuthVerifier,

  // Middleware
  AuthMiddleware,
  AuthMiddlewareLive,
  AuthMiddlewareTest,
  AuthMiddlewareAdmin,

  // Test data
  TestUser,
  AdminTestUser,
} from "./lib/middleware";

// Service-to-Service Authentication (Service Routes)
export {
  // Types
  type ServiceIdentity,

  // Context Tags
  ServiceContext,

  // Errors
  ServiceAuthError,

  // Token utilities
  validateServiceToken,
  generateServiceToken,
  KNOWN_SERVICES,

  // Middleware
  ServiceMiddleware,
  ServiceMiddlewareLive,
  ServiceMiddlewareTest,
  requireServicePermission,

  // Test data
  TestServiceIdentity,
} from "./lib/middleware";

// Request Metadata (All Routes)
export {
  // Types
  type RequestMetadata,

  // Context Tags
  RequestMeta,

  // Middleware
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,

  // Helpers
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,
} from "./lib/middleware";

// Route Selection (Contract-First)
export {
  // Types
  type RouteType,
  type RpcWithRouteTag,
  type MiddlewareSelectorConfig,
  type RequestRouteContext,

  // Symbol
  RouteTag,

  // Functions
  getRouteType,
  detectRouteType,
  createMiddlewareSelector,
  applyRouteMiddleware,

  // Context
  RequestRouteContextTag,
  createRequestRouteContext,

  // Dev helpers
  logRouteType,
  assertRouteType,
  validateRpcRoutes,
} from "./lib/middleware";

// Combined Middleware Layers
export {
  AllMiddlewareTest,
  AllMiddlewareLive,
  defaultMiddlewareConfig,
} from "./lib/middleware";

// ============================================================================
// Client Hooks (React)
// ============================================================================


export {
  // Core RPC call function (Schema-validated)
  callRpc,

  // Mutation hook with loading/error state
  useRpcMutation,

  // Query hook with automatic fetching
  useRpcQuery,

  // Lazy query hook (manual trigger)
  useRpcLazyQuery,

  // Runtime utilities
  getRpcRuntime,
  runEffectExit,

  // Types
  type RpcCallOptions,
  type RpcError,
} from "./lib/hooks";