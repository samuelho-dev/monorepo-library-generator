/**
 * RPC Router Template (Contract-First)
 *
 * Generates router.ts for feature libraries that integrates handlers with middleware.
 * Creates Next.js/Express compatible HTTP handlers.
 *
 * Contract-First Architecture:
 * - Handlers implement contract RPCs
 * - Middleware is applied based on RouteTag from contract
 * - Router creates HTTP endpoint
 *
 * @module monorepo-library-generator/feature/templates/rpc/router
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate router.ts file for feature library
 *
 * Creates the RPC router that:
 * - Combines handlers with middleware based on RouteTag
 * - Exposes HTTP endpoint for Next.js/Express
 */
export function generateRouterFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name, subModules } = options
  const scope = WORKSPACE_CONFIG.getScope()

  const subModulesList = subModules?.filter(Boolean) ?? []
  const hasSubModules = subModulesList.length > 0

  builder.addFileHeader({
    title: `${className} RPC Router`,
    description: `Router for ${name} RPC operations.

Contract-First Architecture:
- Handlers implement contract RPCs
- Middleware applied automatically based on RouteTag
- Router creates HTTP endpoint

Usage:
  // In Next.js App Router (app/api/${name}/route.ts)
  import { create${className}Handler } from "${scope}/feature-${name}/rpc";
  export const POST = create${className}Handler();`
  })

  builder.addImports([
    { from: "effect", imports: ["Layer"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Handler Imports")

  builder.addRaw(`import { ${className}HandlersLayer } from "./handlers";
`)

  builder.addSectionComment("Middleware Imports")

  builder.addRaw(`import {
  // Middleware layers
  AllMiddlewareLive,
  AllMiddlewareTest,
} from "${scope}/infra-rpc";
`)

  builder.addSectionComment("Layer Composition")

  builder.addRaw(`/**
 * Combined layer for production
 *
 * Includes all handlers and middleware for production use.
 * Compose with your infrastructure layers.
 */
export const ${className}ProductionLayer = Layer.mergeAll(
  ${className}HandlersLayer,
  AllMiddlewareLive,
);

/**
 * Combined layer for testing
 *
 * Includes all handlers with test middleware.
 */
export const ${className}TestLayer = Layer.mergeAll(
  ${className}HandlersLayer,
  AllMiddlewareTest,
);
`)

  builder.addSectionComment("HTTP Handler (Next.js / Express)")

  builder.addRaw(`/**
 * Create Next.js App Router handler
 *
 * Uses @effect/rpc Layer-based pattern with RpcGroup.toLayer.
 * The handlers Layer provides all RPC implementations.
 *
 * @example
 * \`\`\`typescript
 * // app/api/${name}/route.ts
 * import { ${className}Handlers, ${className}ProductionLayer } from "${scope}/feature-${name}/rpc";
 * import { RpcServer } from "@effect/rpc-http";
 * import { HttpRouter, HttpServer } from "@effect/platform";
 *
 * // Mount RPC handlers
 * const httpApp = HttpRouter.empty.pipe(
 *   HttpRouter.mount("/rpc", RpcServer.toHttpApp(${className}Rpcs))
 * );
 *
 * // Provide layers and run
 * const runnable = httpApp.pipe(
 *   Effect.provide(${className}Handlers),
 *   Effect.provide(${className}ProductionLayer)
 * );
 * \`\`\`
 *
 * For simpler Next.js integration, use Effect.runPromise directly:
 * @example
 * \`\`\`typescript
 * // app/api/${name}/route.ts
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   // Handle RPC call using provided layers
 *   const result = await Effect.runPromise(
 *     handleRpcRequest(body).pipe(
 *       Effect.provide(${className}Handlers),
 *       Effect.provide(${className}ProductionLayer)
 *     )
 *   );
 *   return Response.json(result);
 * }
 * \`\`\`
 */
`)
  builder.addBlankLine()

  builder.addSectionComment("Re-exports")

  if (hasSubModules) {
    builder.addRaw(`/**
 * Re-export handlers for direct composition
 */
export { ${className}Handlers, All${className}Handlers, ${className}HandlersLayer } from "./handlers";
`)
  } else {
    builder.addRaw(`/**
 * Re-export handlers for direct composition
 */
export { ${className}Handlers, ${className}HandlersLayer } from "./handlers";
`)
  }

  return builder.toString()
}
