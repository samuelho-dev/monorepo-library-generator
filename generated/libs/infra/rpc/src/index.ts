/**
 * RPC Infrastructure Library
 *
 * RPC infrastructure for Effect-based applications.

This library provides:
- RPC client for making typed requests
- Transport layer (HTTP/Internal) for client-server communication
- Middleware for authentication and request metadata
- Core utilities for RPC operations

Usage:
  import { RpcClient, createRpcClientLayer, AuthMiddleware } from '@myorg/infra-rpc';
 *
 */


// ============================================================================
// Errors
// ============================================================================


export {
  RpcInfraError,
  RpcRateLimitError,
  RpcValidationError,
  RpcNotFoundError,
  RpcTimeoutError,
  RpcInternalError,
  RpcConfigError,
  RpcConnectionError,
  type RpcError,
  mapToRpcError,
  RpcErrorCodes,
  errorCodeToHttpStatus,
} from "./lib/service/errors";

// ============================================================================
// Core RPC Utilities
// ============================================================================


// Re-exports from @effect/rpc
export { Rpc, RpcGroup } from "./lib/service/core";

// Definition helpers
export {
  defineRpc,
  defineRpcGroup,
  createHandlers,
  type RpcHandler,
  type HandlersFor,
} from "./lib/service/core";

// Schema helpers
export {
  paginatedResponse,
  paginationRequest,
  IdRequest,
  SuccessResponse,
  EmptyRequest,
} from "./lib/service/core";

// ============================================================================
// RPC Client
// ============================================================================


export {
  RpcClient,
  RpcClientConfigTag,
  createRpcClientLayer,
  type RpcClientConfig,
} from "./lib/service/client";

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
} from "./lib/service/transport";

// HTTP transport client
export { HttpRpcClient, RpcTransportClient, createNextHandler } from "./lib/service/transport";

// Transport utilities
export {
  extractHeaders,
  jsonResponse,
  errorResponse,
  type NextHandler,
} from "./lib/service/transport";

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
} from "./lib/service/router";

// ============================================================================
// Middleware & Auth
// ============================================================================


// Auth middleware
export {
  AuthMiddleware,
  AuthMiddlewareLive,
  AuthMiddlewareTest,
  AuthMiddlewareAdmin,
  AuthVerifier,
  AuthError,
  type AuthMethod,
} from "./lib/service/middleware";

// Context tags and types
export {
  CurrentUser,
  RequestMeta,
  AuthMethodContext,
  type CurrentUserData,
  type RequestMetadata,
  type AuthenticatedUserData,
  type HandlerContext,
} from "./lib/service/middleware";

// Context helpers
export {
  getHandlerContext,
  getHandlerContextOptional,
} from "./lib/service/middleware";

// Request metadata middleware
export {
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,
} from "./lib/service/middleware";

// Test utilities
export { TestUser, AdminTestUser } from "./lib/service/middleware";