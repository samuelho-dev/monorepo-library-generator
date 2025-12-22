/**
 * RPC Infrastructure Index Template
 *
 * Generates the barrel export for RPC infrastructure.
 * RPC has a specialized structure with client, transport, middleware, etc.
 *
 * @module monorepo-library-generator/infra-templates/rpc/index
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';

/**
 * Generate RPC index.ts file
 */
export function generateRpcIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { packageName, className } = options;

  builder.addFileHeader({
    title: 'RPC Infrastructure Library',
    description: `RPC infrastructure for Effect-based applications.

This library provides:
- RPC client for making typed requests
- Transport layer (HTTP/Internal) for client-server communication
- Middleware for authentication and request metadata
- Core utilities for RPC operations

Usage:
  import { ${className}Client, createRpcClientLayer, AuthMiddleware } from '${packageName}';`,
  });
  builder.addBlankLine();

  // Error exports
  builder.addSectionComment('Errors');
  builder.addBlankLine();

  builder.addRaw(`export {
  RpcInfraError,
  RpcRateLimitError,
  RpcValidationError,
  RpcNotFoundError,
  RpcTimeoutError,
  ${className}InternalError,
  ${className}ConfigError,
  ${className}ConnectionError,
  type RpcError,
  mapToRpcError,
  RpcErrorCodes,
  errorCodeToHttpStatus,
} from "./lib/service/errors";`);
  builder.addBlankLine();

  // Core exports
  builder.addSectionComment('Core RPC Utilities');
  builder.addBlankLine();

  builder.addRaw(`// Re-exports from @effect/rpc
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
} from "./lib/service/core";`);
  builder.addBlankLine();

  // Client exports
  builder.addSectionComment('RPC Client');
  builder.addBlankLine();

  builder.addRaw(`export {
  ${className}Client,
  RpcClientConfigTag,
  createRpcClientLayer,
  type RpcClientConfig,
} from "./lib/service/client";`);
  builder.addBlankLine();

  // Transport exports
  builder.addSectionComment('Transport Layer');
  builder.addBlankLine();

  builder.addRaw(`// Transport types
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
} from "./lib/service/router";`);
  builder.addBlankLine();

  // Middleware exports
  builder.addSectionComment('Middleware & Auth');
  builder.addBlankLine();

  builder.addRaw(`// Auth middleware
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
export { TestUser, AdminTestUser } from "./lib/service/middleware";`);

  return builder.toString();
}
