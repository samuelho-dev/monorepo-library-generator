/**
 * Middleware Index Template
 *
 * Generates the barrel export for all RPC middleware modules.
 * This consolidates all middleware in one place for infra-rpc.
 *
 * @module monorepo-library-generator/infra-templates/rpc/middleware/index
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate middleware index file
 *
 * Creates barrel export for all middleware modules.
 */
export function generateMiddlewareIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} RPC Middleware`,
    description: `Consolidated middleware exports for RPC operations.

This module is the SINGLE SOURCE OF TRUTH for all RPC middleware.
Feature libraries should NOT define their own middleware.

Middleware Types:
- User Authentication (protected routes): CurrentUser, AuthMiddleware
- Service Authentication (service routes): ServiceContext, ServiceMiddleware
- Request Metadata (all routes): RequestMeta, RequestMetaMiddleware
- Route Selection (automatic): createMiddlewareSelector, RouteTag

Usage:
\`\`\`typescript
import {
  AuthMiddleware,
  AuthMiddlewareLive,
  ServiceMiddleware,
  ServiceMiddlewareLive,
  RequestMetaMiddleware,
  RequestMetaMiddlewareLive,
  createMiddlewareSelector,
} from "${scope}/infra-${fileName}";
\`\`\``,
    module: `${scope}/infra-${fileName}/middleware`
  })

  builder.addImports([
    { from: "effect", imports: ["Layer"] }
  ])

  builder.addSectionComment("User Authentication (Protected Routes)")

  builder.addRaw(`// Re-export user auth middleware
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
} from "./auth";
`)

  builder.addSectionComment("Service Authentication (Service Routes)")

  builder.addRaw(`// Re-export service auth middleware
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
} from "./service-auth";
`)

  builder.addSectionComment("Request Metadata (All Routes)")

  builder.addRaw(`// Re-export request meta middleware
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
} from "./request-meta";
`)

  builder.addSectionComment("Route Selection (Contract-First)")

  builder.addRaw(`// Re-export route selector
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
} from "./route-selector";
`)

  builder.addSectionComment("Combined Middleware Layers")

  // Import middleware layers for use in combined exports
  // (biome requires explicit imports when using re-exported variables)
  builder.addRaw(`import { AuthMiddlewareLive, AuthMiddlewareTest } from "./auth";
import { ServiceMiddlewareLive, ServiceMiddlewareTest } from "./service-auth";
import { RequestMetaMiddlewareLive } from "./request-meta";
import type { MiddlewareSelectorConfig } from "./route-selector";

/**
 * Combined middleware layer for development/testing
 *
 * Provides all middleware with test implementations.
 */
export const AllMiddlewareTest = Layer.mergeAll(
  AuthMiddlewareTest,
  ServiceMiddlewareTest,
  RequestMetaMiddlewareLive,
);

/**
 * Combined middleware layer for production
 *
 * Provides all middleware with live implementations.
 * Note: AuthMiddleware.Live requires AuthVerifier to be provided.
 */
export const AllMiddlewareLive = Layer.mergeAll(
  AuthMiddlewareLive,
  ServiceMiddlewareLive,
  RequestMetaMiddlewareLive,
);

/**
 * Default middleware selector configuration for development
 */
export const defaultMiddlewareConfig: MiddlewareSelectorConfig = {
  protectedMiddleware: AuthMiddlewareTest,
  serviceMiddleware: ServiceMiddlewareTest,
  globalMiddleware: RequestMetaMiddlewareLive,
};
`)

  return builder.toString()
}
