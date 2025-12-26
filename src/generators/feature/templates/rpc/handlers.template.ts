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
  const { className, fileName, name, subModules } = options
  const scope = WORKSPACE_CONFIG.getScope()

  const subModulesList = subModules?.filter(Boolean) ?? []
  const hasSubModules = subModulesList.length > 0

  builder.addFileHeader({
    title: `${className} RPC Handlers`,
    description: `Handler implementations for ${name} RPC operations.

Contract-First Architecture:
- RPC definitions imported from @${scope}/contract-${fileName}
- Handlers implement the RPC interface using the service layer
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract

Usage:
  The handlers are composed into the RpcGroup and exposed via HTTP transport.
  See router.ts for Next.js/Express integration.`
  })

  builder.addImports([
    { from: "effect", imports: [{ name: "Array", alias: "EffectArray" }, "DateTime", "Effect", "Layer", "Option"] },
    // RPC errors for response mapping
    {
      from: `${scope}/contract-${fileName}`,
      imports: [
        `${className}NotFoundRpcError`,
        `${className}Rpcs`,
        `${className}ValidationRpcError`
      ]
    },
    // Service input types for handler transformations
    {
      from: `${scope}/data-access-${fileName}`,
      imports: [`${className}CreateInput`, `${className}UpdateInput`],
      isTypeOnly: true
    },
    // Note: Domain errors (${className}NotFoundError, ${className}TimeoutError) are NOT imported
    // because catchTags uses string literals to match error tags, not runtime types
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

  // Error handlers for catchTags - catch all errors in the error channel
  // Domain errors: NotFoundError (from service when entity not found)
  // Infrastructure errors: TimeoutError (from repository timeout), DatabaseInternalError (from database)
  const notFoundAndInfraCatchTags = `Effect.catchTags({
        "${className}NotFoundError": (e) =>
          Effect.fail(new ${className}NotFoundRpcError({
            ${name}Id: e.${name}Id,
            message: e.message
          })),
        "${className}TimeoutError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            field: "timeout",
            message: \`Operation timed out after \${e.timeoutMs}ms\`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            field: "database",
            message: e.message
          }))
      })`

  const infraOnlyCatchTags = `Effect.catchTags({
        "${className}TimeoutError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            field: "timeout",
            message: \`Operation timed out after \${e.timeoutMs}ms\`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new ${className}ValidationRpcError({
            field: "database",
            message: e.message
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
 *     return yield* service.findById(id)
 *   })
 * \`\`\`
 */
export const ${className}Handlers = ${className}Rpcs.toLayer({
  /**
   * Get ${name} by ID
   *
   * RouteTag: "public" - No authentication required
   * Errors: NotFoundError, TimeoutError
   */
  Get${className}: ({ id }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service;
      const meta = yield* RequestMeta;

      yield* Effect.logDebug("Getting ${name}", {
        id,
        requestId: meta.requestId
      })

      // Service throws ${className}NotFoundError which is caught by catchTags
      return yield* service.get(id)
    }).pipe(${notFoundAndInfraCatchTags}),

  /**
   * List ${name}s with pagination
   *
   * RouteTag: "public" - No authentication required
   * Errors: TimeoutError
   */
  List${className}s: ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      const currentPage = page ?? 1
      const currentPageSize = pageSize ?? 20
      const offset = (currentPage - 1) * currentPageSize

      const [items, total] = yield* Effect.all([
        service.findByCriteria({}, offset, currentPageSize),
        service.count({})
      ])

      return {
        page: currentPage,
        pageSize: currentPageSize,
        items,
        total,
        hasMore: offset + items.length < total
      }
    }).pipe(${infraOnlyCatchTags}),

  /**
   * Create a new ${name}
   *
   * RouteTag: "protected" - User authentication required
   * Errors: TimeoutError
   */
  Create${className}: (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Creating ${name}", {
        userId: user.id,
        requestId: meta.requestId
      })

      // Transform RPC input to service input
      // The contract defines the public API schema, service uses internal types
      // Cast is safe because both types represent the same domain entity
      return yield* service.create(input as ${className}CreateInput)
    }).pipe(${infraOnlyCatchTags}),

  /**
   * Update an existing ${name}
   *
   * RouteTag: "protected" - User authentication required
   * Errors: NotFoundError, TimeoutError
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

      // Transform RPC data to service input
      // The contract defines the public API schema, service uses internal types
      // Cast is safe because both types represent the same domain entity
      // Service throws ${className}NotFoundError which is caught by catchTags
      return yield* service.update(id, data as ${className}UpdateInput)
    }).pipe(${notFoundAndInfraCatchTags}),

  /**
   * Delete a ${name}
   *
   * RouteTag: "protected" - User authentication required
   * Errors: NotFoundError, TimeoutError
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

      yield* service.delete(id)
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow()
      }
    }).pipe(${notFoundAndInfraCatchTags}),

  /**
   * Validate ${name} (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   * Errors: TimeoutError
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

      const exists = yield* service.exists(userId)

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
    }).pipe(${infraOnlyCatchTags}),

  /**
   * Bulk get ${name}s (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   * Errors: TimeoutError (NotFoundError is handled per-id internally)
   */
  BulkGet${className}s: ({ ids }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      // Fetch all entities in parallel, catching NotFoundError per-id
      // Use Effect.option to convert NotFoundError to Option.none
      const results = yield* Effect.all(
        ids.map((id) =>
          service.get(id).pipe(
            Effect.asSome,
            Effect.catchTag("${className}NotFoundError", () =>
              Effect.succeed(Option.none())
            )
          )
        ),
        { concurrency: "unbounded" }
      )

      // Extract found items using EffectArray.getSomes
      const items = EffectArray.getSomes(results)
      const foundIds = new Set(items.map((item) => item.id))
      const notFound = ids.filter((id) => !foundIds.has(id))

      return {
        items,
        notFound
      }
    }).pipe(${infraOnlyCatchTags})
})
`)

  if (hasSubModules) {
    builder.addSectionComment("Combined Handlers (with Sub-Modules)")

    builder.addRaw(`/**
 * Combined handlers including all sub-modules
 *
 * Merges the main ${className} handlers with sub-module handlers using Layer.mergeAll.
 */
export const All${className}Handlers = Layer.mergeAll(
  ${className}Handlers,
${
      subModulesList.map((sub: string) => {
        const subClassName = sub.charAt(0).toUpperCase() + sub.slice(1)
        return `  ${subClassName}Handlers`
      }).join(",\n")
    }
)
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
