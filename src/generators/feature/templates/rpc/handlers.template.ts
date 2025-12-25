/**
 * RPC Handlers Template (Contract-First)
 *
 * Generates unified handlers.ts file for feature libraries.
 * Implements handlers for RPC definitions from the contract library.
 *
 * Contract-First Architecture:
 * - RPC definitions with RouteTag are in contract library (single source of truth)
 * - Feature library imports RPCs from contract and implements handlers
 * - Middleware is applied automatically based on RouteTag via infra-rpc
 *
 * @module monorepo-library-generator/feature/templates/rpc/handlers
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate handlers.ts file for feature library
 *
 * Creates unified handlers that implement contract RPC definitions.
 * No external/internal split - RouteTag determines middleware application.
 */
export function generateHandlersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name, subModules } = options
  const scope = WORKSPACE_CONFIG.getScope()

  const subModulesList = subModules?.filter(Boolean) ?? []
  const hasSubModules = subModulesList.length > 0

  builder.addFileHeader({
    title: `${className} RPC Handlers`,
    description: `Handler implementations for ${name} RPC operations.

Contract-First Architecture:
- RPC definitions imported from @${scope}/contract-${name}
- Handlers implement the RPC interface using the service layer
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract

Usage:
  The handlers are composed into the RpcGroup and exposed via HTTP transport.
  See router.ts for Next.js/Express integration.`
  })

  builder.addImports([
    { from: "effect", imports: [{ name: "Array", alias: "EffectArray" }, "DateTime", "Effect", "Layer", "Option"] },
    {
      from: `${scope}/contract-${name}`,
      imports: [
        `${className}NotFoundRpcError`,
        `${className}PermissionRpcError`,
        `${className}Rpcs`,
        `${className}ValidationRpcError`
      ]
    },
    { from: `${scope}/infra-rpc`, imports: ["getHandlerContext", "RequestMeta", "ServiceContext"] },
    { from: "../server/services", imports: [`${className}Service`] }
  ])

  if (hasSubModules) {
    builder.addSectionComment("Sub-Module Handler Imports")
    for (const subModule of subModulesList!) {
      const subClassName = subModule.charAt(0).toUpperCase() + subModule.slice(1)
      builder.addRaw(
        `import { ${subClassName}Handlers } from "../server/services/${subModule}/handlers"
`
      )
    }
  }

  // Helper to generate catchTags error mapping
  const errorCatchTags = `Effect.catchTags({
        "${className}NotFoundError": (e) =>
          Effect.fail(new ${className}NotFoundRpcError({
            message: e.message,
            ${name}Id: e.${name}Id
          })),
        "${className}ValidationError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "${className}AlreadyExistsError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            message: e.message,
            field: "${name}Id"
          })),
        "${className}PermissionError": (e) =>
          Effect.fail(new ${className}PermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "${className}ServiceError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            message: \`Service error: \${e.message}\`,
            field: "service"
          }))
      })`

  builder.addSectionComment("Handler Implementations")

  builder.addRaw(`/**
 * ${className} RPC Handler Implementations
 *
 * Implements handlers for all RPCs defined in the contract.
 * Each handler:
 * - Receives typed input from the RPC definition
 * - Has access to context based on RouteTag (CurrentUser, ServiceContext, RequestMeta)
 * - Returns typed output or fails with typed errors
 * - Uses Effect.catchTags for precise error type inference (no type widening)
 *
 * @example
 * \`\`\`typescript
 * // In a protected handler (RouteTag = "protected")
 * Get${className}: ({ id }) =>
 *   Effect.gen(function*() {
 *     const { user, meta } = yield* getHandlerContext;
 *     const service = yield* ${className}Service;
 *     return yield* service.findById(id);
 *   })
 * \`\`\`
 */
export const ${className}Handlers = ${className}Rpcs.toLayer({
  /**
   * Get ${name} by ID
   *
   * RouteTag: "public" - No authentication required
   */
  Get${className}: ({ id }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service;
      const meta = yield* RequestMeta;

      yield* Effect.logDebug("Getting ${name}", {
        id,
        requestId: meta.requestId
      })

      const result = yield* service.get(id).pipe(
        ${errorCatchTags}
      );

      // Handle Option.none case - return typed RPC error
      if (Option.isNone(result)) {
        return yield* Effect.fail(${className}NotFoundRpcError.create(id))
      }

      return result.value
    }),

  /**
   * List ${name}s with pagination
   *
   * RouteTag: "public" - No authentication required
   */
  List${className}s: ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      const currentPage = page ?? 1
      const currentPageSize = pageSize ?? 20
      const offset = (currentPage - 1) * currentPageSize

      const [items, total] = yield* Effect.all([
        service.findByCriteria({}, offset, currentPageSize).pipe(
          ${errorCatchTags}
        ),
        service.count({}).pipe(
          ${errorCatchTags}
        )
      ])

      return {
        page: currentPage,
        pageSize: currentPageSize,
        items,
        total,
        hasMore: offset + items.length < total
      }
    }),

  /**
   * Create a new ${name}
   *
   * RouteTag: "protected" - User authentication required
   */
  Create${className}: (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Creating ${name}", {
        userId: user.id,
        requestId: meta.requestId
      })

      // RPC input type should match service create input type
      // If types differ, use Schema.decode for transformation at this boundary
      return yield* service.create(input).pipe(
        ${errorCatchTags}
      )
    }),

  /**
   * Update an existing ${name}
   *
   * RouteTag: "protected" - User authentication required
   */
  Update${className}: ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Updating ${name}", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      // RPC data type should match service update input type
      // If types differ, use Schema.decode for transformation at this boundary
      const result = yield* service.update(id, data).pipe(
        ${errorCatchTags}
      )

      // Handle Option.none case - return typed RPC error
      if (Option.isNone(result)) {
        return yield* Effect.fail(new ${className}NotFoundRpcError({
          message: \`${className} not found: \${id}\`,
          ${name}Id: id
        }))
      }

      return result.value
    }),

  /**
   * Delete a ${name}
   *
   * RouteTag: "protected" - User authentication required
   */
  Delete${className}: ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Deleting ${name}", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.delete(id).pipe(
        ${errorCatchTags}
      )
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow()
      }
    }),

  /**
   * Validate ${name} (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   */
  Validate${className}: ({ userId, validationType }) =>
    Effect.gen(function*() {
      const serviceCtx = yield* ServiceContext
      const service = yield* ${className}Service

      yield* Effect.logDebug("Validating ${name} for service", {
        userId,
        validationType,
        callingService: serviceCtx.serviceName
      })

      const exists = yield* service.exists(userId).pipe(
        ${errorCatchTags}
      )

      // Build response with proper handling for exactOptionalPropertyTypes
      const baseResponse = {
        valid: exists,
        userId,
        validatedAt: DateTime.unsafeNow()
      }

      // Use typed constant to avoid type assertion
      const notFoundErrors: ReadonlyArray<string> = ["${className} not found"]

      return exists
        ? baseResponse
        : { ...baseResponse, errors: notFoundErrors }
    }),

  /**
   * Bulk get ${name}s (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   */
  BulkGet${className}s: ({ ids }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      // Fetch all entities in parallel using individual gets
      const results = yield* Effect.all(
        ids.map((id) => service.get(id).pipe(
          ${errorCatchTags}
        )),
        { concurrency: "unbounded" }
      )

      // Extract found items (filter out None results)
      const items = EffectArray.getSomes(results)
      const foundIds = new Set(items.map((item) => item.id))
      const notFound = ids.filter((id) => !foundIds.has(id))

      return {
        items,
        notFound
      }
    })
})
`)

  if (hasSubModules) {
    builder.addSectionComment("Combined Handlers (with Sub-Modules)")

    builder.addRaw(`/**
 * Combined handlers including all sub-modules
 *
 * Merges the main ${className} handlers with sub-module handlers.
 */
export const All${className}Handlers = {
  ...${className}Handlers,
${
      subModulesList.map((sub: string) => {
        const subClassName = sub.charAt(0).toUpperCase() + sub.slice(1)
        return `  ...${subClassName}Handlers`
      }).join(",\n")
    }
}
`)
  }

  builder.addSectionComment("Handler Layer")

  builder.addRaw(`/**
 * Handler dependencies layer
 *
 * Provides all dependencies needed by the handlers.
 * This is composed with middleware layers at the router level.
 */
export const ${className}HandlersLayer = Layer.mergeAll(
  ${className}Service.Live
  // Add other service layers as needed
)
`)

  return builder.toString()
}
