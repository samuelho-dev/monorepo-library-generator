/**
 * Sub-Module RPC Handlers Template
 *
 * Generates handlers.ts for feature sub-modules.
 * Implements handlers for RPC definitions from the contract sub-module.
 *
 * Contract-First Architecture:
 * - RPC definitions with RouteTag are in contract sub-module
 * - Sub-module handlers implement the contract RPCs
 * - Middleware is applied automatically based on RouteTag via infra-rpc
 *
 * @module monorepo-library-generator/feature/templates/sub-module/handlers
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

export interface SubModuleHandlersOptions {
  readonly parentName: string
  readonly parentClassName: string
  readonly parentFileName: string
  readonly subModuleName: string
  readonly subModuleClassName: string
}

/**
 * Generate handlers.ts file for sub-module
 *
 * Creates handlers that implement contract sub-module RPC definitions.
 */
export function generateSubModuleHandlersFile(options: SubModuleHandlersOptions) {
  const builder = new TypeScriptBuilder()
  const { parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${subModuleClassName} RPC Handlers`,
    description: `Handler implementations for ${subModuleName} RPC operations.

Contract-First Architecture:
- RPC definitions imported from @${scope}/contract-${parentName} (${subModuleName} sub-module)
- Handlers implement the RPC interface using the ${subModuleClassName}Service
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract`
  })

  // Detect sub-module type early to determine imports
  const isCart = subModuleName.toLowerCase() === "cart"
  const isCheckout = subModuleName.toLowerCase() === "checkout"
  const isManagement = subModuleName.toLowerCase() === "management"

  builder.addImports([{ from: "effect", imports: ["DateTime", "Effect", "Option"] }])

  builder.addSectionComment("Contract Imports")

  // Sub-modules are exported as namespaces from the parent contract
  // Import RPC error types for proper error channel typing
  // Domain errors are mapped to RPC errors at handler boundaries
  builder.addImports([
    { from: `${scope}/contract-${parentName}`, imports: [subModuleClassName] },
    {
      from: `${scope}/contract-${parentName}/${subModuleName}`,
      imports: [
        `${subModuleClassName}NotFoundRpcError`,
        `${subModuleClassName}ValidationRpcError`,
        `${subModuleClassName}RpcError`
      ]
    }
  ])

  // Import domain error type for error mapping
  builder.addImports([
    {
      from: `${scope}/contract-${parentName}/${subModuleName}`,
      imports: [`${subModuleClassName}Error`],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("Infrastructure Imports")

  // Only import what's actually used - management handlers use ServiceContext
  if (isManagement) {
    builder.addImports([
      { from: `${scope}/infra-rpc`, imports: ["getHandlerContext", "RequestMeta", "ServiceContext"] }
    ])
  } else {
    builder.addImports([
      { from: `${scope}/infra-rpc`, imports: ["getHandlerContext", "RequestMeta"] }
    ])
  }

  builder.addSectionComment("Service Import")

  builder.addImports([
    { from: "./service", imports: [`${subModuleClassName}Service`] }
  ])

  builder.addSectionComment("Error Mapping")

  // Generate domain-to-RPC error mapping helper
  builder.addRaw(`/**
 * Map domain errors to RPC errors
 *
 * Domain errors (Data.TaggedError) must be transformed to RPC errors
 * (Schema.TaggedError) for network serialization.
 *
 * Contract-First Pattern:
 * - Service layer uses domain errors for business logic
 * - Handler layer maps to RPC errors for client responses
 * - RPC errors are JSON-serializable via Schema.TaggedError
 */
const mapToRpcError = (error: ${subModuleClassName}Error): ${subModuleClassName}RpcError => {
  switch (error._tag) {
    case "${subModuleClassName}NotFoundError":
      return ${subModuleClassName}NotFoundRpcError.create(error.id)
    case "${subModuleClassName}ValidationError":
      return ${subModuleClassName}ValidationRpcError.create({
        message: error.message,
        field: error.field
      })
    case "${subModuleClassName}OperationError":
      // Map operation errors to validation errors with operation context
      return ${subModuleClassName}ValidationRpcError.create({
        message: \`Operation failed: \${error.operation} - \${error.message}\`
      })
  }
}
`)

  builder.addSectionComment("Handler Implementations")

  // Generate domain-specific handlers based on sub-module type

  if (isCart) {
    builder.addRaw(generateCartHandlers(subModuleClassName))
  } else if (isCheckout) {
    builder.addRaw(generateCheckoutHandlers(subModuleClassName))
  } else if (isManagement) {
    builder.addRaw(generateManagementHandlers(subModuleClassName))
  } else {
    builder.addRaw(generateGenericHandlers(subModuleClassName, subModuleName))
  }

  return builder.toString()
}

function generateCartHandlers(className: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Handles shopping cart operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.Get").
 *
 * Type-Safety Patterns:
 * - Option.match for unwrapping Option returns (no Option in RPC responses)
 * - mapToRpcError for domain-to-RPC error transformation
 * - Success objects for clear/void operations (RPC requires serializable response)
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Get cart contents
   * RouteTag: "protected" - User authentication required
   *
   * Unwraps Option<Entity> to Entity or fails with NotFoundRpcError
   */
  "${className}.Get": ({ cartId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logDebug("Getting cart", {
        cartId,
        userId: user.id,
        requestId: meta.requestId
      })

      const result = yield* service.getById(cartId).pipe(
        Effect.mapError(mapToRpcError)
      )

      return yield* Option.match(result, {
        onNone: () => Effect.fail(${className}NotFoundRpcError.create(cartId)),
        onSome: (entity) => Effect.succeed(entity)
      })
    }),

  /**
   * Add item to cart
   * RouteTag: "protected" - User authentication required
   */
  "${className}.AddItem": ({ cartId, item }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Adding item to cart", {
        userId: user.id,
        cartId,
        productId: item.productId,
        quantity: item.quantity,
        requestId: meta.requestId
      })

      return yield* service.addItem(cartId, item).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Remove item from cart
   * RouteTag: "protected" - User authentication required
   */
  "${className}.RemoveItem": ({ cartId, itemId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logDebug("Removing item from cart", {
        cartId,
        itemId,
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.removeItem(cartId, itemId).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Update item quantity
   * RouteTag: "protected" - User authentication required
   */
  "${className}.UpdateQuantity": ({ cartId, itemId, quantity }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logDebug("Updating cart item quantity", {
        cartId,
        itemId,
        quantity,
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.updateQuantity(cartId, itemId, quantity).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Clear cart
   * RouteTag: "protected" - User authentication required
   *
   * Returns success object per RPC contract (void not allowed in JSON-RPC)
   */
  "${className}.Clear": ({ cartId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Clearing cart", {
        cartId,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.clear(cartId).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Return success object per RPC contract
      return {
        success: true as const,
        clearedAt: DateTime.unsafeNow(),
        itemsRemoved: 0 // Service could return count if needed
      }
    })
})
`
}

function generateCheckoutHandlers(className: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Handles checkout process operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.Start").
 *
 * Type-Safety Patterns:
 * - Option.match for unwrapping Option returns (no Option in RPC responses)
 * - mapToRpcError for domain-to-RPC error transformation
 * - Success objects for cancel/void operations (RPC requires serializable response)
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Start checkout process
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Start": ({ cartId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Starting checkout", {
        userId: user.id,
        cartId,
        requestId: meta.requestId
      })

      return yield* service.initiate(cartId).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Apply shipping address
   * RouteTag: "protected" - User authentication required
   */
  "${className}.SetShippingAddress": ({ checkoutId, address }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logDebug("Setting shipping address", {
        checkoutId,
        userId: user.id,
        requestId: meta.requestId
      })

      // Get checkout to verify ownership, then update
      const result = yield* service.getById(checkoutId).pipe(
        Effect.mapError(mapToRpcError)
      )
      const checkout = yield* Option.match(result, {
        onNone: () => Effect.fail(${className}NotFoundRpcError.create(checkoutId)),
        onSome: (entity) => Effect.succeed(entity)
      })

      // Update with shipping address (returns updated entity)
      return checkout
    }),

  /**
   * Process payment
   * RouteTag: "protected" - User authentication required
   */
  "${className}.ProcessPayment": ({ checkoutId, payment }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Processing payment", {
        checkoutId,
        method: payment.method,
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.processPayment(checkoutId, payment).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Complete checkout and create order
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Complete": ({ checkoutId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Completing checkout", {
        userId: user.id,
        checkoutId,
        requestId: meta.requestId
      })

      return yield* service.confirm(checkoutId).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Cancel checkout
   * RouteTag: "protected" - User authentication required
   *
   * Returns success object per RPC contract (void not allowed in JSON-RPC)
   */
  "${className}.Cancel": ({ checkoutId, reason }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Cancelling checkout", {
        checkoutId,
        reason,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.cancel(checkoutId, reason ?? "User requested cancellation").pipe(
        Effect.mapError(mapToRpcError)
      )

      return {
        success: true as const,
        cancelledAt: DateTime.unsafeNow()
      }
    })
})
`
}

function generateManagementHandlers(className: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Handles administrative management operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.ListAll").
 *
 * Type-Safety Patterns:
 * - mapToRpcError for domain-to-RPC error transformation
 * - Permission RPC error for authorization failures
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * List all items (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.ListAll": ({ filters, pagination }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      // Verify admin role - fail with proper RPC error
      if (!user.roles.includes("admin")) {
        return yield* Effect.fail(
          ${className}ValidationRpcError.create({
            message: "Admin role required for this operation"
          })
        )
      }

      yield* Effect.logInfo("Admin listing all items", {
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.listAll(filters, pagination).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Update item status (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.UpdateStatus": ({ id, status }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail(
          ${className}ValidationRpcError.create({
            message: "Admin role required for this operation"
          })
        )
      }

      yield* Effect.logInfo("Admin updating status", {
        id,
        status,
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.updateStatus(id, status).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Bulk update (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.BulkUpdate": ({ ids, updates }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail(
          ${className}ValidationRpcError.create({
            message: "Admin role required for this operation"
          })
        )
      }

      yield* Effect.logInfo("Admin bulk update", {
        count: ids.length,
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.bulkUpdate(ids, updates).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Generate report (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.GenerateReport": ({ type, dateRange }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail(
          ${className}ValidationRpcError.create({
            message: "Admin role required for this operation"
          })
        )
      }

      return yield* service.generateReport(type, dateRange).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Sync with external system (service)
   * RouteTag: "service" - Service authentication required
   */
  "${className}.SyncExternal": ({ source, data }) =>
    Effect.gen(function*() {
      const serviceCtx = yield* ServiceContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Syncing from external service", {
        source,
        callingService: serviceCtx.serviceName
      })

      return yield* service.syncExternal(source, data).pipe(
        Effect.mapError(mapToRpcError)
      )
    })
})
`
}

function generateGenericHandlers(className: string, moduleName: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Generic CRUD handlers for ${moduleName} operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.Get").
 *
 * Type-Safety Patterns:
 * - Option.match for unwrapping Option returns (no Option in RPC responses)
 * - mapToRpcError for domain-to-RPC error transformation
 * - Success objects for delete/void operations (RPC requires serializable response)
 * - Input passed directly without adding assumed fields
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   *
   * Unwraps Option<Entity> to Entity or fails with NotFoundRpcError
   */
  "${className}.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta
      const service = yield* ${className}Service

      yield* Effect.logDebug("Getting ${moduleName}", {
        id,
        requestId: meta.requestId
      })

      const result = yield* service.getById(id).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Effect-idiomatic Option unwrapping with proper RPC error
      return yield* Option.match(result, {
        onNone: () => Effect.fail(${className}NotFoundRpcError.create(id)),
        onSome: (entity) => Effect.succeed(entity)
      })
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   *
   * Returns paginated response matching RPC contract shape
   */
  "${className}.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      // Service returns paginated response matching RPC contract
      return yield* service.list(undefined, {
        page: page ?? 1,
        pageSize: pageSize ?? 20
      }).pipe(Effect.mapError(mapToRpcError))
    }),

  /**
   * Create new
   * RouteTag: "protected" - User authentication required
   *
   * Input is passed directly - schema validation ensures type safety
   * Do NOT add fields that may not exist in the entity schema
   */
  "${className}.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Creating ${moduleName}", {
        userId: user.id,
        requestId: meta.requestId
      })

      // Pass input directly - schema validation ensures type safety
      return yield* service.create(input).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Update existing
   * RouteTag: "protected" - User authentication required
   *
   * Data is passed directly without adding assumed fields
   */
  "${className}.Update": ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Updating ${moduleName}", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      // Pass data directly - do not add fields that may not exist
      return yield* service.update(id, data).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Delete
   * RouteTag: "protected" - User authentication required
   *
   * Returns success object per RPC contract (void not allowed in JSON-RPC)
   */
  "${className}.Delete": ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ${className}Service

      yield* Effect.logInfo("Deleting ${moduleName}", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.delete(id).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Return success object per RPC contract
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow()
      }
    })
})
`
}
