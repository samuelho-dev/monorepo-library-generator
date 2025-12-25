/**
 * Contract RPC Group Template
 *
 * Generates the RpcGroup composition file that combines all RPC definitions
 * into a single group for router registration.
 *
 * The RpcGroup provides:
 * - Single export for all RPCs
 * - Type-safe handler registration via .toLayer()
 * - Type extraction helpers
 *
 * @module monorepo-library-generator/contract/rpc-group-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate RPC group file for contract library
 *
 * Creates RpcGroup.make composition with all RPC definitions.
 */
export function generateRpcGroupFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addRaw(`/**
 * ${className} RPC Group
 *
 * Unified RPC group combining all ${className} operations.
 * This is the primary export for handler registration.
 *
 * Usage in feature handlers:
 * \`\`\`typescript
 * import { ${className}Rpcs } from "${scope}/contract-${fileName}";
 * import { ${className}Service } from "./service";
 *
 * export const ${className}Handlers = ${className}Rpcs.toLayer({
 *   Get${className}: (input) => Effect.flatMap(${className}Service, s => s.get(input.id)),
 *   List${className}s: (input) => Effect.flatMap(${className}Service, s => s.list(input)),
 *   Create${className}: (input) => Effect.flatMap(${className}Service, s => s.create(input)),
 *   Update${className}: (input) => Effect.flatMap(${className}Service, s => s.update(input.id, input.data)),
 *   Delete${className}: (input) => Effect.flatMap(${className}Service, s => s.delete(input.id)),
 *   Validate${className}: (input) => Effect.flatMap(${className}Service, s => s.validate(input)),
 *   BulkGet${className}s: (input) => Effect.flatMap(${className}Service, s => s.bulkGet(input.ids)),
 * })
 * \`\`\`
 *
 * @module ${scope}/contract-${fileName}/rpc-group
 */`)
  builder.addBlankLine()

  // Imports
  builder.addImports([{ from: "@effect/rpc", imports: ["RpcGroup"] }])

  builder.addSectionComment("RPC Definition Imports")
  builder.addImports([
    {
      from: "./rpc-definitions",
      imports: [
        `BulkGet${className}s`,
        `Create${className}`,
        `Delete${className}`,
        `Get${className}`,
        `List${className}s`,
        "RouteTag",
        `Update${className}`,
        `Validate${className}`
      ]
    }
  ])
  builder.addImports([
    { from: "./rpc-definitions", imports: ["RouteType"], isTypeOnly: true }
  ])

  // Re-export RouteTag - needed for Contract-First Architecture
  builder.addSectionComment("Re-export Route System")
  builder.addComment("biome-ignore lint/performance/noBarrelFile: Contract-First Architecture requires re-exporting route system")
  builder.addRaw(`export { RouteTag, type RouteType } from "./rpc-definitions"`)

  // RpcGroup composition
  builder.addSectionComment("RPC Group Composition")

  builder.addRaw(`/**
 * ${className} RPC Group
 *
 * Combines all ${className} RPC definitions into a single group.
 * Use \`.toLayer()\` to create handlers with type-safe implementation.
 *
 * @example
 * \`\`\`typescript
 * // Full handler implementation
 * const handlers = ${className}Rpcs.toLayer({
 *   Get${className}: (input) => service.get(input.id),
 *   List${className}s: (input) => service.list(input),
 *   // ... other handlers
 * })
 *
 * // Merge with router
 * const app = RouterBuilder.make(${className}Rpcs).handle(handlers)
 * \`\`\`
 */
export const ${className}Rpcs = RpcGroup.make(BulkGet${className}s, Create${className}, Delete${className}, Get${className}, List${className}s, Update${className}, Validate${className})`)

  // Type exports
  builder.addSectionComment("Type Exports")

  builder.addRaw(`/**
 * Type of the ${className} RPC group
 */
export type ${className}Rpcs = typeof ${className}Rpcs

/**
 * All ${className} RPC definition types (for handler typing)
 */
export type ${className}RpcDefinitions = {
  Get${className}: typeof Get${className}
  List${className}s: typeof List${className}s
  Create${className}: typeof Create${className}
  Update${className}: typeof Update${className}
  Delete${className}: typeof Delete${className}
  Validate${className}: typeof Validate${className}
  BulkGet${className}s: typeof BulkGet${className}s
}`)

  // Re-export individual RPCs
  builder.addSectionComment("Re-export Individual RPCs")

  builder.addRaw(`export {
  Get${className},
  List${className}s,
  Create${className},
  Update${className},
  Delete${className},
  Validate${className},
  BulkGet${className}s
} from "./rpc-definitions"`)

  // Route helpers
  builder.addSectionComment("Route Helpers")

  builder.addRaw(`/**
 * Get route type for an RPC definition
 *
 * @example
 * \`\`\`typescript
 * const routeType = getRouteType(Get${className}) // "public"
 * \`\`\`
 */
export function getRouteType<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag]
}

/**
 * Check if an RPC requires user authentication
 */
export function isProtectedRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "protected"
}

/**
 * Check if an RPC is for service-to-service communication
 */
export function isServiceRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "service"
}

/**
 * Check if an RPC is public (no auth required)
 */
export function isPublicRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "public"
}

/**
 * Map of all RPCs organized by route type
 *
 * Useful for middleware configuration.
 */
export const ${className}RpcsByRoute = {
  public: [Get${className}, List${className}s] as const,
  protected: [Create${className}, Update${className}, Delete${className}] as const,
  service: [Validate${className}, BulkGet${className}s] as const
} as const`)

  return builder.toString()
}
