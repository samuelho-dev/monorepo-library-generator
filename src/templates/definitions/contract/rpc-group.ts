/**
 * Contract RPC Group Template Definition
 *
 * Declarative template for generating rpc-group.ts in contract libraries.
 * Contains RpcGroup composition that combines all RPC definitions.
 *
 * @module monorepo-library-generator/templates/definitions/contract/rpc-group
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract RPC Group Template Definition
 *
 * Generates a complete rpc-group.ts file with:
 * - RpcGroup.make composition of all RPCs
 * - Type exports for handler typing
 * - Re-exports of individual RPCs
 * - Route helper functions
 * - RPCs organized by route type
 */
export const contractRpcGroupTemplate: TemplateDefinition = {
  id: 'contract/rpc-group',
  meta: {
    title: '{className} RPC Group',
    description: `Unified RPC group combining all {className} operations.
This is the primary export for handler registration.

Usage in feature handlers:
\`\`\`typescript
import { {className}Rpcs } from "{scope}/contract-{fileName}";
import { {className}Service } from "./service";

export const {className}Handlers = {className}Rpcs.toLayer({
  Get{className}: (input) => Effect.flatMap({className}Service, s => s.get(input.id)),
  List{className}s: (input) => Effect.flatMap({className}Service, s => s.list(input)),
  Create{className}: (input) => Effect.flatMap({className}Service, s => s.create(input)),
  Update{className}: (input) => Effect.flatMap({className}Service, s => s.update(input.id, input.data)),
  Delete{className}: (input) => Effect.flatMap({className}Service, s => s.delete(input.id)),
  Validate{className}: (input) => Effect.flatMap({className}Service, s => s.validate(input)),
  BulkGet{className}s: (input) => Effect.flatMap({className}Service, s => s.bulkGet(input.ids)),
})
\`\`\``,
    module: '{scope}/contract-{fileName}/rpc-group'
  },
  imports: [
    { from: '@effect/rpc', items: ['RpcGroup'] },
    {
      from: './rpc-definitions',
      items: [
        'BulkGet{className}s',
        'Create{className}',
        'Delete{className}',
        'Get{className}',
        'List{className}s',
        'RouteTag',
        'Update{className}',
        'Validate{className}'
      ]
    },
    { from: './rpc-definitions', items: ['RouteType'], isTypeOnly: true }
  ],
  sections: [
    // Re-export Route System
    {
      title: 'Re-export Route System',
      content: {
        type: 'raw',
        value: `// biome-ignore lint/performance/noBarrelFile: Contract-First Architecture requires re-exporting route system
export { RouteTag, type RouteType } from "./rpc-definitions"`
      }
    },
    // RPC Group Composition
    {
      title: 'RPC Group Composition',
      content: {
        type: 'raw',
        value: `/**
 * {className} RPC Group
 *
 * Combines all {className} RPC definitions into a single group.
 * Use \`.toLayer()\` to create handlers with type-safe implementation.
 *
 * @example
 * \`\`\`typescript
 * // Full handler implementation
 * const handlers = {className}Rpcs.toLayer({
 *   Get{className}: (input) => service.get(input.id),
 *   List{className}s: (input) => service.list(input),
 *   // ... other handlers
 * })
 *
 * // Merge with router
 * const app = RouterBuilder.make({className}Rpcs).handle(handlers)
 * \`\`\`
 */
export const {className}Rpcs = RpcGroup.make(BulkGet{className}s, Create{className}, Delete{className}, Get{className}, List{className}s, Update{className}, Validate{className})`
      }
    },
    // Type Exports
    {
      title: 'Type Exports',
      content: {
        type: 'raw',
        value: `/**
 * Type of the {className} RPC group
 */
export type {className}Rpcs = typeof {className}Rpcs

/**
 * All {className} RPC definition types (for handler typing)
 */
export type {className}RpcDefinitions = {
  Get{className}: typeof Get{className}
  List{className}s: typeof List{className}s
  Create{className}: typeof Create{className}
  Update{className}: typeof Update{className}
  Delete{className}: typeof Delete{className}
  Validate{className}: typeof Validate{className}
  BulkGet{className}s: typeof BulkGet{className}s
}`
      }
    },
    // Re-export Individual RPCs
    {
      title: 'Re-export Individual RPCs',
      content: {
        type: 'raw',
        value: `export {
  Get{className},
  List{className}s,
  Create{className},
  Update{className},
  Delete{className},
  Validate{className},
  BulkGet{className}s
} from "./rpc-definitions"`
      }
    },
    // Route Helpers
    {
      title: 'Route Helpers',
      content: {
        type: 'raw',
        value: `/**
 * Get route type for an RPC definition
 *
 * @example
 * \`\`\`typescript
 * const routeType = getRouteType(Get{className}) // "public"
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
export const {className}RpcsByRoute = {
  public: [Get{className}, List{className}s] as const,
  protected: [Create{className}, Update{className}, Delete{className}] as const,
  service: [Validate{className}, BulkGet{className}s] as const
} as const`
      }
    }
  ]
}

export default contractRpcGroupTemplate
