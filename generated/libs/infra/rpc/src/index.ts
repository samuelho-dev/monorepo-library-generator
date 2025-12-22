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
  errorCodeToHttpStatus,
  mapToRpcError,
  RpcConfigError,
  RpcConnectionError,
  type RpcError,
  RpcErrorCodes,
  RpcInfraError,
  RpcInternalError,
  RpcNotFoundError,
  RpcRateLimitError,
  RpcTimeoutError,
  RpcValidationError,
} from "./lib/service/errors";

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
  SuccessResponse,
} from "./lib/service/core";

// ============================================================================
// RPC Client
// ============================================================================

export {
  createRpcClientLayer,
  RpcClient,
  type RpcClientConfig,
  RpcClientConfigTag,
} from "./lib/service/client";

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
  type RpcRequiredLayers,
} from "./lib/service/router";
// Transport types
export type {
  HttpRpcClientConfig,
  HttpTransportConfig,
  HttpTransportOptions,
  RpcTransportConfig,
  TransportConfig,
  TransportMode,
} from "./lib/service/transport";
// HTTP transport client
// Transport utilities
export {
  createNextHandler,
  errorResponse,
  extractHeaders,
  HttpRpcClient,
  jsonResponse,
  type NextHandler,
  RpcTransportClient,
} from "./lib/service/transport";

// ============================================================================
// Middleware & Auth
// ============================================================================

// Auth middleware
// Context tags and types
// Context helpers
// Request metadata middleware
// Test utilities
export {
  AdminTestUser,
  AuthError,
  type AuthenticatedUserData,
  type AuthMethod,
  AuthMethodContext,
  AuthMiddleware,
  AuthMiddlewareAdmin,
  AuthMiddlewareLive,
  AuthMiddlewareTest,
  AuthVerifier,
  CurrentUser,
  type CurrentUserData,
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,
  RequestMeta,
  type RequestMetadata,
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,
  TestUser,
} from "./lib/service/middleware";
