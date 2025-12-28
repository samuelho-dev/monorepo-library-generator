/**
 * Contract Sub-Module RPC Definitions Template
 *
 * Generates RPC definitions for contract sub-modules using the Rpc.make pattern
 * with RouteTag. Sub-module RPCs use prefixed names for unified router routing.
 *
 * Example: Cart sub-module generates "Cart.Get", "Cart.AddItem", etc.
 *
 * @module monorepo-library-generator/contract/submodule-rpc-definitions-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

export interface SubModuleRpcDefinitionsOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
  /** Sub-module property name (e.g., 'cart') */
  subModulePropertyName: string
}

/**
 * Generate RPC definitions file for a contract sub-module
 *
 * Creates Rpc.make definitions with:
 * - Prefixed operation names (e.g., "Cart.Get")
 * - RouteTag for middleware selection
 * - Domain-specific operations based on sub-module type
 */
export function generateSubModuleRpcDefinitionsFile(options: SubModuleRpcDefinitionsOptions) {
  const builder = new TypeScriptBuilder()
  const { parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addRaw(`/**
 * ${subModuleClassName} RPC Definitions
 *
 * Contract-first RPC definitions for the ${subModuleName} sub-module.
 * All operations are prefixed with "${subModuleClassName}." for unified router routing.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (CurrentUser)
 * - "service": Service-to-service authentication (ServiceContext)
 *
 * Usage in feature handlers:
 * \`\`\`typescript
 * import { ${subModuleClassName}Rpcs } from "${scope}/contract-${parentName}/${subModuleName}";
 * import { ${subModuleClassName}Service } from "./service";
 *
 * export const ${subModuleClassName}Handlers = ${subModuleClassName}Rpcs.toLayer({
 *   "${subModuleClassName}.Get": (input) =>
 *     Effect.flatMap(${subModuleClassName}Service, s => s.get(input.id)),
 * })
 * \`\`\`
 *
 * @module ${scope}/contract-${parentName}/${subModuleName}/rpc
 */`)
  builder.addBlankLine()

  // Imports - @effect/* packages first, then effect, then relative imports
  builder.addImports([
    { from: '@effect/rpc', imports: ['Rpc', 'RpcGroup'] },
    { from: 'effect', imports: ['Schema'] }
  ])

  // Note: submodule is at /src/{submodule}/, parent rpc-definitions is at /src/lib/
  builder.addImports([
    { from: '../lib/rpc-definitions', imports: ['RouteTag'] },
    { from: '../lib/rpc-definitions', imports: ['RouteType'], isTypeOnly: true }
  ])

  builder.addSectionComment('Local Imports')
  // Note: entities.ts exports the class as ${subModuleClassName} (not ${subModuleClassName}Entity)
  builder.addImports([
    { from: './entities', imports: [subModuleClassName, `${subModuleClassName}Id`] },
    { from: './rpc-errors', imports: [`${subModuleClassName}RpcError`] }
  ])

  // Note: RouteTag is imported from parent, not re-exported to avoid duplicates
  // Use import { RouteTag } from "@scope/contract-{parent}" in consuming code

  // Generate domain-specific RPC definitions
  const rpcContent = generateSubModuleRpcs(subModuleName, subModuleClassName)
  builder.addRaw(rpcContent)

  return builder.toString()
}

/**
 * Generate RPC definitions based on sub-module type
 */
function generateSubModuleRpcs(subModuleName: string, subModuleClassName: string) {
  const name = subModuleName.toLowerCase()
  const prefix = subModuleClassName

  // Cart-specific RPCs
  if (name === 'cart') {
    return generateCartRpcs(prefix)
  }

  // Checkout-specific RPCs
  if (name === 'checkout') {
    return generateCheckoutRpcs(prefix)
  }

  // Order management-specific RPCs
  if (name === 'management' || name === 'order-management') {
    return generateManagementRpcs(prefix)
  }

  // Generic CRUD RPCs for other sub-modules
  return generateGenericRpcs(prefix, subModuleClassName)
}

/**
 * Generate Cart sub-module RPCs
 */
function generateCartRpcs(prefix: string) {
  return `// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Cart item schema for add/update operations
 */
export const ${prefix}ItemInput = Schema.Struct({
  productId: Schema.UUID,
  quantity: Schema.Number.pipe(Schema.int(), Schema.positive()),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}).pipe(Schema.annotations({
  identifier: "${prefix}ItemInput",
  title: "${prefix} Item Input"
}))

export type ${prefix}ItemInput = Schema.Schema.Type<typeof ${prefix}ItemInput>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Get cart contents
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Get extends Rpc.make("${prefix}.Get", {
  payload: Schema.Struct({
    cartId: Schema.UUID
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Add item to cart
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}AddItem extends Rpc.make("${prefix}.AddItem", {
  payload: Schema.Struct({
    cartId: Schema.UUID,
    item: ${prefix}ItemInput
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Remove item from cart
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}RemoveItem extends Rpc.make("${prefix}.RemoveItem", {
  payload: Schema.Struct({
    cartId: Schema.UUID,
    itemId: Schema.UUID
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update cart item quantity
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}UpdateQuantity extends Rpc.make("${prefix}.UpdateQuantity", {
  payload: Schema.Struct({
    cartId: Schema.UUID,
    itemId: Schema.UUID,
    quantity: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Clear all items from cart
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Clear extends Rpc.make("${prefix}.Clear", {
  payload: Schema.Struct({
    cartId: Schema.UUID
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    clearedAt: Schema.DateTimeUtc,
    itemsRemoved: Schema.Number.pipe(Schema.int(), Schema.nonNegative())
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * ${prefix} RPC Group
 *
 * All cart operations for router registration.
 */
export const ${prefix}Rpcs = RpcGroup.make(
  ${prefix}Get,
  ${prefix}AddItem,
  ${prefix}RemoveItem,
  ${prefix}UpdateQuantity,
  ${prefix}Clear
)

export type ${prefix}Rpcs = typeof ${prefix}Rpcs

/**
 * RPCs organized by route type
 */
export const ${prefix}RpcsByRoute = {
  public: [] as const,
  protected: [${prefix}Get, ${prefix}AddItem, ${prefix}RemoveItem, ${prefix}UpdateQuantity, ${prefix}Clear] as const,
  service: [] as const
}`
}

/**
 * Generate Checkout sub-module RPCs
 */
function generateCheckoutRpcs(prefix: string) {
  return `// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Shipping address schema
 */
export const ShippingAddress = Schema.Struct({
  street: Schema.String.pipe(Schema.minLength(1)),
  city: Schema.String.pipe(Schema.minLength(1)),
  state: Schema.String.pipe(Schema.minLength(1)),
  postalCode: Schema.String.pipe(Schema.minLength(1)),
  country: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(2))
}).pipe(Schema.annotations({
  identifier: "ShippingAddress",
  title: "Shipping Address"
}))

export type ShippingAddress = Schema.Schema.Type<typeof ShippingAddress>

/**
 * Payment details schema
 */
export const PaymentDetails = Schema.Struct({
  method: Schema.Literal("card", "paypal", "bank_transfer"),
  token: Schema.optional(Schema.String)
}).pipe(Schema.annotations({
  identifier: "PaymentDetails",
  title: "Payment Details"
}))

export type PaymentDetails = Schema.Schema.Type<typeof PaymentDetails>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Initiate checkout from cart
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Initiate extends Rpc.make("${prefix}.Initiate", {
  payload: Schema.Struct({
    cartId: Schema.UUID,
    shippingAddress: Schema.optional(ShippingAddress)
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Process payment for checkout
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}ProcessPayment extends Rpc.make("${prefix}.ProcessPayment", {
  payload: Schema.Struct({
    checkoutId: Schema.UUID,
    payment: PaymentDetails
  }),
  success: Schema.Struct({
    checkoutId: Schema.UUID,
    paymentId: Schema.String,
    status: Schema.Literal("success", "pending", "failed")
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Confirm and complete checkout
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Confirm extends Rpc.make("${prefix}.Confirm", {
  payload: Schema.Struct({
    checkoutId: Schema.UUID
  }),
  success: Schema.Struct({
    orderId: Schema.UUID,
    orderNumber: Schema.String,
    status: Schema.Literal("confirmed"),
    confirmedAt: Schema.DateTimeUtc
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Cancel checkout
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Cancel extends Rpc.make("${prefix}.Cancel", {
  payload: Schema.Struct({
    checkoutId: Schema.UUID,
    reason: Schema.optional(Schema.String)
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    cancelledAt: Schema.DateTimeUtc
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * ${prefix} RPC Group
 *
 * All checkout operations for router registration.
 */
export const ${prefix}Rpcs = RpcGroup.make(
  ${prefix}Initiate,
  ${prefix}ProcessPayment,
  ${prefix}Confirm,
  ${prefix}Cancel
)

export type ${prefix}Rpcs = typeof ${prefix}Rpcs

/**
 * RPCs organized by route type
 */
export const ${prefix}RpcsByRoute = {
  public: [] as const,
  protected: [${prefix}Initiate, ${prefix}ProcessPayment, ${prefix}Confirm, ${prefix}Cancel] as const,
  service: [] as const
}`
}

/**
 * Generate Management sub-module RPCs
 */
function generateManagementRpcs(prefix: string) {
  return `// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Order status values
 */
export const OrderStatus = Schema.Literal("pending", "processing", "shipped", "delivered", "cancelled")

export type OrderStatus = Schema.Schema.Type<typeof OrderStatus>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Get order by ID
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}GetOrder extends Rpc.make("${prefix}.GetOrder", {
  payload: Schema.Struct({
    orderId: Schema.UUID
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * List orders with pagination
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}ListOrders extends Rpc.make("${prefix}.ListOrders", {
  payload: Schema.Struct({
    page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 1
    }),
    pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 20
    }),
    status: Schema.optional(OrderStatus)
  }),
  success: Schema.Struct({
    items: Schema.Array(${prefix}),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update order status
 *
 * @route service - Requires service authentication
 */
export class ${prefix}UpdateStatus extends Rpc.make("${prefix}.UpdateStatus", {
  payload: Schema.Struct({
    orderId: Schema.UUID,
    status: OrderStatus,
    reason: Schema.optional(Schema.String)
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "service"
}

/**
 * Cancel order
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}CancelOrder extends Rpc.make("${prefix}.CancelOrder", {
  payload: Schema.Struct({
    orderId: Schema.UUID,
    reason: Schema.String.pipe(Schema.minLength(1))
  }),
  success: Schema.Struct({
    orderId: Schema.UUID,
    status: Schema.Literal("cancelled"),
    refundAmount: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
    cancelledAt: Schema.DateTimeUtc
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * ${prefix} RPC Group
 *
 * All management operations for router registration.
 */
export const ${prefix}Rpcs = RpcGroup.make(
  ${prefix}GetOrder,
  ${prefix}ListOrders,
  ${prefix}UpdateStatus,
  ${prefix}CancelOrder
)

export type ${prefix}Rpcs = typeof ${prefix}Rpcs

/**
 * RPCs organized by route type
 */
export const ${prefix}RpcsByRoute = {
  public: [] as const,
  protected: [${prefix}GetOrder, ${prefix}ListOrders, ${prefix}CancelOrder] as const,
  service: [${prefix}UpdateStatus] as const
}`
}

/**
 * Generate generic CRUD RPCs for sub-modules
 */
function generateGenericRpcs(prefix: string, subModuleClassName: string) {
  return `// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Create input schema
 */
export const Create${prefix}Input = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific fields for ${subModuleClassName}
}).pipe(Schema.annotations({
  identifier: "Create${prefix}Input",
  title: "Create ${prefix} Input"
}))

export type Create${prefix}Input = Schema.Schema.Type<typeof Create${prefix}Input>

/**
 * Update input schema
 */
export const Update${prefix}Input = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields for ${subModuleClassName}
}).pipe(Schema.annotations({
  identifier: "Update${prefix}Input",
  title: "Update ${prefix} Input"
}))

export type Update${prefix}Input = Schema.Schema.Type<typeof Update${prefix}Input>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Get ${subModuleClassName} by ID
 *
 * @route public - No authentication required
 */
export class ${prefix}Get extends Rpc.make("${prefix}.Get", {
  payload: Schema.Struct({
    id: ${prefix}Id
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * List ${subModuleClassName}s with pagination
 *
 * @route public - No authentication required
 */
export class ${prefix}List extends Rpc.make("${prefix}.List", {
  payload: Schema.Struct({
    page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 1
    }),
    pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 20
    })
  }),
  success: Schema.Struct({
    items: Schema.Array(${prefix}),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * Create ${subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Create extends Rpc.make("${prefix}.Create", {
  payload: Create${prefix}Input,
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update ${subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Update extends Rpc.make("${prefix}.Update", {
  payload: Schema.Struct({
    id: ${prefix}Id,
    data: Update${prefix}Input
  }),
  success: ${prefix},
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Delete ${subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class ${prefix}Delete extends Rpc.make("${prefix}.Delete", {
  payload: Schema.Struct({
    id: ${prefix}Id
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: ${prefix}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * ${prefix} RPC Group
 *
 * All ${subModuleClassName} operations for router registration.
 */
export const ${prefix}Rpcs = RpcGroup.make(
  ${prefix}Get,
  ${prefix}List,
  ${prefix}Create,
  ${prefix}Update,
  ${prefix}Delete
)

export type ${prefix}Rpcs = typeof ${prefix}Rpcs

/**
 * RPCs organized by route type
 */
export const ${prefix}RpcsByRoute = {
  public: [${prefix}Get, ${prefix}List] as const,
  protected: [${prefix}Create, ${prefix}Update, ${prefix}Delete] as const,
  service: [] as const
}`
}

/**
 * Generate sub-module RPC group (simpler version for sub-module barrel export)
 */
export function generateSubModuleRpcGroupExport(options: SubModuleRpcDefinitionsOptions) {
  const { subModuleClassName } = options

  return `// Re-export RPC definitions and group
export {
  ${subModuleClassName}Rpcs,
  type ${subModuleClassName}Rpcs as ${subModuleClassName}RpcsType,
  ${subModuleClassName}RpcsByRoute,
  RouteTag,
  type RouteType
} from "./rpc-definitions"`
}
