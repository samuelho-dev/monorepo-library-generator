/**
 * RPC Barrel Export Template (Contract-First)
 *
 * Generates the index.ts barrel export for feature RPC module.
 * Re-exports from contract and provides unified handler access.
 *
 * Contract-First Architecture:
 * - RPC definitions are imported from contract library
 * - Handlers implement the contract RPCs
 * - Middleware is from infra-rpc
 *
 * @module monorepo-library-generator/feature/templates/rpc/barrel
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate RPC barrel export file
 *
 * Creates clean re-exports for the feature RPC module.
 */
export function generateRpcBarrelFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, subModules } = options
  const scope = WORKSPACE_CONFIG.getScope()

  const subModulesList = subModules?.filter(Boolean) ?? []
  const hasSubModules = subModulesList.length > 0

  builder.addFileHeader({
    title: `${className} RPC Module`,
    description: `RPC exports for ${name} feature library.

Contract-First Architecture:
- RPC definitions re-exported from contract library (single source of truth)
- Handlers implement the contract RPCs
- Middleware re-exported from infra-rpc

Usage:
  import { ${className}Handlers, ${className}HandlersLayer } from "${scope}/feature-${fileName}/rpc";
  import { ${className}Rpcs, Get${className}, Create${className} } from "${scope}/feature-${fileName}/rpc";`
  })

  builder.addSectionComment("Contract Re-exports (Single Source of Truth)")

  builder.addRaw(`// Re-export all RPC definitions from contract
// This includes: Rpc classes, RpcGroup, RouteTag, errors, types
export {
  // RPC Errors
  ${className}NotFoundRpcError,
  ${className}ValidationRpcError,
  ${className}PermissionRpcError,
  ${className}RpcError,
  // Definitions
  ${className}Id,
  RouteTag,
  type RouteType,
  ${className}Schema,
  type ${className}Entity,
  PaginationParams,
  PaginatedResponse,
  Create${className}Input,
  Update${className}Input,
  Validate${className}Input,
  ValidationResponse,
  BulkGet${className}Input,
  Get${className},
  List${className}s,
  Create${className},
  Update${className},
  Delete${className},
  Validate${className},
  BulkGet${className}s,
  // Group
  ${className}Rpcs,
  type ${className}RpcDefinitions,
  getRouteType,
  isProtectedRoute,
  isServiceRoute,
  isPublicRoute,
  ${className}RpcsByRoute
} from "${scope}/contract-${fileName}"
`)

  builder.addSectionComment("Handler Exports")

  if (hasSubModules) {
    builder.addRaw(`export {
  ${className}Handlers,
  All${className}Handlers,
  ${className}HandlersLayer
} from "./handlers"
`)
  } else {
    builder.addRaw(`export {
  ${className}Handlers,
  ${className}HandlersLayer
} from "./handlers"
`)
  }

  builder.addSectionComment("Middleware Re-exports (from infra-rpc)")

  builder.addRaw(`// Re-export commonly used middleware for convenience
export {
  // User auth (protected routes)
  CurrentUser,
  AuthMiddleware,
  AuthError,
  type CurrentUserData,

  // Service auth (service routes)
  ServiceContext,
  ServiceMiddleware,
  ServiceAuthError,
  type ServiceIdentity,

  // Request metadata (all routes)
  RequestMeta,
  RequestMetaMiddleware,
  type RequestMetadata,

  // Handler context helper
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,

  // Route selection utilities (RouteTag/RouteType re-exported from contract above)
  createMiddlewareSelector,
  type MiddlewareSelectorConfig,

  // Combined layers
  AllMiddlewareTest,
  AllMiddlewareLive
} from "${scope}/infra-rpc"
`)

  builder.addSectionComment("Router Exports")

  builder.addRaw(`export {
  // Layer compositions for @effect/rpc integration
  ${className}ProductionLayer,
  ${className}TestLayer
} from "./router"
`)

  if (hasSubModules) {
    builder.addSectionComment("Sub-Module Handler Exports")

    for (const subModule of subModulesList!) {
      const subClassName = subModule.charAt(0).toUpperCase() + subModule.slice(1)
      builder.addRaw(`export { ${subClassName}Handlers } from "../server/services/${subModule}/handlers"`)
    }
  }

  return builder.toString()
}
