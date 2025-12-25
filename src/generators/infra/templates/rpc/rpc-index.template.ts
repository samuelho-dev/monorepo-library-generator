/**
 * RPC Infrastructure Index Template
 *
 * Generates the barrel export for RPC infrastructure.
 * RPC has a specialized structure with client, transport, middleware, etc.
 *
 * Uses Contract-First architecture where:
 * - Contract library defines RPCs with RouteTag
 * - infra-rpc provides middleware (auth, service-auth, request-meta, route-selector)
 * - Feature library imports from contract and implements handlers
 *
 * @module monorepo-library-generator/infra-templates/rpc/index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"

/**
 * Generate RPC index.ts file
 */
export function generateRpcIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName } = options

  builder.addFileHeader({
    title: "RPC Infrastructure Library",
    description: `RPC infrastructure for Effect-based applications.

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
    ${className}Client,
    createRpcClientLayer,
    AuthMiddleware,
    ServiceMiddleware,
    createMiddlewareSelector,
  } from '${packageName}';`
  })
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Errors")
  builder.addBlankLine()

  builder.addRaw(`export {
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
  ${className}InternalDomainError,
  ${className}ConfigError,
  ${className}ConnectionError,

  // HTTP Status (single source of truth)
  RpcHttpStatus,
  getHttpStatus,

  // Error Boundary
  withRpcErrorBoundary,
} from "./lib/errors"`)
  builder.addBlankLine()

  // Core exports
  builder.addSectionComment("Core RPC Utilities")
  builder.addBlankLine()

  builder.addRaw(`// Re-exports from @effect/rpc
export { Rpc, RpcGroup } from "./lib/core"

// Definition helpers
export {
  defineRpc,
  defineRpcGroup,
  createHandlers,
  type RpcHandler,
  type HandlersFor,
} from "./lib/core"

// Schema helpers
export {
  paginatedResponse,
  paginationRequest,
  IdRequest,
  SuccessResponse,
  EmptyRequest,
} from "./lib/core"`)
  builder.addBlankLine()

  // Client exports
  builder.addSectionComment("RPC Client")
  builder.addBlankLine()

  builder.addRaw(`export {
  ${className}Client,
  RpcClientConfigTag,
  createRpcClientLayer,
  type RpcClientConfig,
} from "./lib/client"`)
  builder.addBlankLine()

  // Transport exports
  builder.addSectionComment("Transport Layer")
  builder.addBlankLine()

  builder.addRaw(`// Transport types
export type {
  TransportMode,
  TransportConfig,
  HttpTransportConfig,
  RpcTransportConfig,
  HttpTransportOptions,
  HttpRpcClientConfig,
} from "./lib/transport"

// HTTP transport client
export { HttpRpcClient, RpcTransportClient, createNextHandler } from "./lib/transport"

// Transport utilities
export {
  extractHeaders,
  jsonResponse,
  errorResponse,
  type NextHandler,
} from "./lib/transport"

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
} from "./lib/router"`)
  builder.addBlankLine()

  // Middleware exports - now from middleware module
  builder.addSectionComment("Middleware (Contract-First Architecture)")
  builder.addBlankLine()

  builder.addRaw(`// User Authentication (Protected Routes)
export {
  // Types
  type CurrentUserData,
  type AuthMethod,

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
} from "./lib/middleware"

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
} from "./lib/middleware"

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
} from "./lib/middleware"

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
} from "./lib/middleware"

// Combined Middleware Layers
export {
  AllMiddlewareTest,
  AllMiddlewareLive,
  defaultMiddlewareConfig,
} from "./lib/middleware"`)
  builder.addBlankLine()

  // Client Hooks exports
  builder.addSectionComment("Client Hooks (React)")
  builder.addBlankLine()

  builder.addRaw(`export {
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
  type ParsedRpcError,
} from "./lib/hooks"`)

  return builder.toString()
}
