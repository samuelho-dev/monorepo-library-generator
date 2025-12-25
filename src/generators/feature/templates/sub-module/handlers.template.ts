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

  builder.addImports([{ from: "effect", imports: ["Effect"] }])
  builder.addBlankLine()

  builder.addSectionComment("Contract Imports")

  // Sub-modules are exported as namespaces from the parent contract
  builder.addRaw(`import { ${subModuleClassName} } from "${scope}/contract-${parentName}";
`)

  builder.addSectionComment("Infrastructure Imports")

  // Only import what's actually used - management handlers use ServiceContext
  if (isManagement) {
    builder.addRaw(`import {
  ServiceContext,
  RequestMeta,
  getHandlerContext,
} from "${scope}/infra-rpc";
`)
  } else {
    builder.addRaw(`import {
  RequestMeta,
  getHandlerContext,
} from "${scope}/infra-rpc";
`)
  }

  builder.addSectionComment("Service Import")

  builder.addRaw(`import { ${subModuleClassName}Service } from "./service";
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
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Get cart contents
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Get": () =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.getCart(user.id);
    }),

  /**
   * Add item to cart
   * RouteTag: "protected" - User authentication required
   */
  "${className}.AddItem": ({ itemId, quantity }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Adding item to cart", {
        userId: user.id,
        itemId,
        quantity,
        requestId: meta.requestId,
      });

      return yield* service.addItem(user.id, itemId, quantity);
    }),

  /**
   * Remove item from cart
   * RouteTag: "protected" - User authentication required
   */
  "${className}.RemoveItem": ({ itemId }) =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.removeItem(user.id, itemId);
    }),

  /**
   * Update item quantity
   * RouteTag: "protected" - User authentication required
   */
  "${className}.UpdateQuantity": ({ itemId, quantity }) =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.updateQuantity(user.id, itemId, quantity);
    }),

  /**
   * Clear cart
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Clear": () =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.clearCart(user.id);
    }),
});
`
}

function generateCheckoutHandlers(className: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Handles checkout process operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.Start").
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Start checkout process
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Start": ({ cartId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Starting checkout", {
        userId: user.id,
        cartId,
        requestId: meta.requestId,
      });

      return yield* service.startCheckout(user.id, cartId);
    }),

  /**
   * Apply shipping address
   * RouteTag: "protected" - User authentication required
   */
  "${className}.SetShippingAddress": ({ checkoutId, address }) =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.setShippingAddress(checkoutId, address);
    }),

  /**
   * Apply payment method
   * RouteTag: "protected" - User authentication required
   */
  "${className}.SetPaymentMethod": ({ checkoutId, paymentMethod }) =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.setPaymentMethod(checkoutId, paymentMethod);
    }),

  /**
   * Complete checkout and create order
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Complete": ({ checkoutId }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Completing checkout", {
        userId: user.id,
        checkoutId,
        requestId: meta.requestId,
      });

      return yield* service.completeCheckout(checkoutId);
    }),

  /**
   * Cancel checkout
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Cancel": ({ checkoutId }) =>
    Effect.gen(function*() {
      const { user } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      return yield* service.cancelCheckout(checkoutId);
    }),
});
`
}

function generateManagementHandlers(className: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Handles administrative management operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.ListAll").
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * List all items (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.ListAll": ({ filters, pagination }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      // Verify admin role
      if (!user.roles.includes("admin")) {
        return yield* Effect.fail({
          _tag: "Forbidden" as const,
          message: "Admin role required",
        });
      }

      yield* Effect.logInfo("Admin listing all items", {
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.listAll(filters, pagination);
    }),

  /**
   * Update item status (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.UpdateStatus": ({ id, status }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail({
          _tag: "Forbidden" as const,
          message: "Admin role required",
        });
      }

      yield* Effect.logInfo("Admin updating status", {
        id,
        status,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.updateStatus(id, status);
    }),

  /**
   * Bulk update (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.BulkUpdate": ({ ids, updates }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail({
          _tag: "Forbidden" as const,
          message: "Admin role required",
        });
      }

      yield* Effect.logInfo("Admin bulk update", {
        count: ids.length,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.bulkUpdate(ids, updates);
    }),

  /**
   * Generate report (admin)
   * RouteTag: "protected" - User authentication required (admin role)
   */
  "${className}.GenerateReport": ({ type, dateRange }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      if (!user.roles.includes("admin")) {
        return yield* Effect.fail({
          _tag: "Forbidden" as const,
          message: "Admin role required",
        });
      }

      return yield* service.generateReport(type, dateRange);
    }),

  /**
   * Sync with external system (service)
   * RouteTag: "service" - Service authentication required
   */
  "${className}.SyncExternal": ({ source, data }) =>
    Effect.gen(function*() {
      const serviceCtx = yield* ServiceContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Syncing from external service", {
        source,
        callingService: serviceCtx.serviceName,
      });

      return yield* service.syncExternal(source, data);
    }),
});
`
}

function generateGenericHandlers(className: string, moduleName: string) {
  return `/**
 * ${className} RPC Handler Implementations
 *
 * Generic CRUD handlers for ${moduleName} operations.
 * Handler keys must match RPC operation names exactly (e.g., "${className}.Get").
 */
export const ${className}Handlers = ${className}.${className}Rpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   */
  "${className}.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta;
      const service = yield* ${className}Service;

      yield* Effect.logDebug("Getting ${moduleName}", {
        id,
        requestId: meta.requestId,
      });

      return yield* service.findById(id);
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   */
  "${className}.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ${className}Service;

      return yield* service.findMany({
        page: page ?? 1,
        pageSize: pageSize ?? 20,
      });
    }),

  /**
   * Create new
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Creating ${moduleName}", {
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.create({
        ...input,
        createdBy: user.id,
      });
    }),

  /**
   * Update existing
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Update": ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Updating ${moduleName}", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.update(id, {
        ...data,
        updatedBy: user.id,
      });
    }),

  /**
   * Delete
   * RouteTag: "protected" - User authentication required
   */
  "${className}.Delete": ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* ${className}Service;

      yield* Effect.logInfo("Deleting ${moduleName}", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.delete(id);
    }),
});
`
}
