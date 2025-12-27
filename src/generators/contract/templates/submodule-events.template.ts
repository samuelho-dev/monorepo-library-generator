/**
 * Contract Sub-Module Events Template
 *
 * Generates events.ts for contract sub-module with domain event definitions.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/contract/submodule-events-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface SubModuleEventsOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate events.ts for a contract sub-module
 *
 * Creates domain event definitions specific to this sub-module
 */
export function generateSubModuleEventsFile(options: SubModuleEventsOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Domain Events`,
    description: `Domain events for the ${subModuleName} sub-module.

Events are prefixed with "${subModuleClassName}." for routing in the parent domain's event bus.
These events can be published via PubsubService and consumed by other features.`,
    module: `${scope}/contract-${parentName}/${subModuleName}/events`
  })

  builder.addImports([{ from: "effect", imports: ["Schema"] }])

  builder.addSectionComment("Event Base Schema")

  builder.addRaw(`/**
 * Base event metadata for ${subModuleName} events
 */
const ${subModuleClassName}EventBase = Schema.Struct({
  /** Event timestamp */
  timestamp: Schema.DateTimeUtc,
  /** Correlation ID for tracing */
  correlationId: Schema.UUID,
  /** User who triggered the event (if applicable) */
  userId: Schema.optional(Schema.UUID),
  /** Additional metadata */
  metadata: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
})`)

  builder.addSectionComment(`${subModuleClassName} Domain Events`)

  // Generate events based on common sub-module patterns
  const events = getEventsForSubModule(subModuleName, subModuleClassName, parentClassName)

  builder.addRaw(events)

  builder.addSectionComment("Event Union Type")

  const eventNames = getEventNamesForSubModule(subModuleName, subModuleClassName)

  // Format union type with leading | for multiple events
  const unionType = eventNames.length > 1
    ? `\n  | ${eventNames.map((e) => `Schema.Schema.Type<typeof ${e}>`).join("\n  | ")}`
    : `Schema.Schema.Type<typeof ${eventNames[0]}>`

  builder.addRaw(`/**
 * Union of all ${subModuleName} domain events
 *
 * Use this for type-safe event handling:
 * \`\`\`typescript
 * const handle = (event: ${subModuleClassName}Event) => {
 *   switch (event._tag) {
 *     case "${subModuleClassName}.Created": ...
 *     case "${subModuleClassName}.Updated": ...
 *   }
 * }
 * \`\`\`
 */
export type ${subModuleClassName}Event =${unionType}

/**
 * All ${subModuleName} event schemas for registration
 */
export const ${subModuleClassName}Events = {
  ${eventNames.join(",\n  ")}
}`)

  return builder.toString()
}

/**
 * Get event definitions based on common sub-module patterns
 */
function getEventsForSubModule(
  subModuleName: string,
  subModuleClassName: string,
  parentClassName: string
) {
  const name = subModuleName.toLowerCase()
  const prefix = `${subModuleClassName}.`

  // Common sub-module patterns with appropriate events
  if (name === "cart") {
    return `/**
 * Cart item added event
 */
export const ${subModuleClassName}ItemAdded = Schema.Struct({
  _tag: Schema.Literal("${prefix}ItemAdded"),
  cartId: Schema.UUID,
  itemId: Schema.UUID,
  quantity: Schema.Number.pipe(Schema.positive()),
  productId: Schema.UUID,
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}ItemAdded",
  title: "Cart Item Added",
  description: "Emitted when an item is added to a cart"
}))
/**
 * Cart item removed event
 */
export const ${subModuleClassName}ItemRemoved = Schema.Struct({
  _tag: Schema.Literal("${prefix}ItemRemoved"),
  cartId: Schema.UUID,
  itemId: Schema.UUID,
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}ItemRemoved",
  title: "Cart Item Removed",
  description: "Emitted when an item is removed from a cart"
}))
/**
 * Cart cleared event
 */
export const ${subModuleClassName}Cleared = Schema.Struct({
  _tag: Schema.Literal("${prefix}Cleared"),
  cartId: Schema.UUID,
  itemCount: Schema.Number.pipe(Schema.int()),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Cleared",
  title: "Cart Cleared",
  description: "Emitted when a cart is cleared of all items"
}))`
  }

  if (name === "checkout") {
    return `/**
 * Checkout initiated event
 */
export const ${subModuleClassName}Initiated = Schema.Struct({
  _tag: Schema.Literal("${prefix}Initiated"),
  checkoutId: Schema.UUID,
  cartId: Schema.UUID,
  totalAmount: Schema.Number.pipe(Schema.positive()),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Initiated",
  title: "Checkout Initiated",
  description: "Emitted when a checkout process is started"
}))
/**
 * Payment processed event
 */
export const ${subModuleClassName}PaymentProcessed = Schema.Struct({
  _tag: Schema.Literal("${prefix}PaymentProcessed"),
  checkoutId: Schema.UUID,
  paymentId: Schema.String,
  amount: Schema.Number.pipe(Schema.positive()),
  status: Schema.Literal("success", "failed", "pending"),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}PaymentProcessed",
  title: "Payment Processed",
  description: "Emitted when a payment is processed during checkout"
}))
/**
 * Checkout completed event
 */
export const ${subModuleClassName}Completed = Schema.Struct({
  _tag: Schema.Literal("${prefix}Completed"),
  checkoutId: Schema.UUID,
  orderId: Schema.UUID,
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Completed",
  title: "Checkout Completed",
  description: "Emitted when checkout is successfully completed"
}))`
  }

  if (name === "management" || name === "order-management") {
    return `/**
 * Order created event
 */
export const ${subModuleClassName}OrderCreated = Schema.Struct({
  _tag: Schema.Literal("${prefix}OrderCreated"),
  orderId: Schema.UUID,
  orderNumber: Schema.String,
  customerId: Schema.UUID,
  totalAmount: Schema.Number.pipe(Schema.positive()),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}OrderCreated",
  title: "Order Created",
  description: "Emitted when a new order is created"
}))
/**
 * Order status changed event
 */
export const ${subModuleClassName}StatusChanged = Schema.Struct({
  _tag: Schema.Literal("${prefix}StatusChanged"),
  orderId: Schema.UUID,
  previousStatus: Schema.String,
  newStatus: Schema.String,
  reason: Schema.optional(Schema.String),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}StatusChanged",
  title: "Order Status Changed",
  description: "Emitted when an order's status is updated"
}))
/**
 * Order cancelled event
 */
export const ${subModuleClassName}OrderCancelled = Schema.Struct({
  _tag: Schema.Literal("${prefix}OrderCancelled"),
  orderId: Schema.UUID,
  reason: Schema.String,
  refundAmount: Schema.optional(Schema.Number.pipe(Schema.positive())),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}OrderCancelled",
  title: "Order Cancelled",
  description: "Emitted when an order is cancelled"
}))`
  }

  // Generic events for other sub-modules
  // Note: Use "parent${parentClassName}Id" to avoid conflict with base's "userId" (who triggered the event)
  return `/**
 * ${subModuleClassName} created event
 */
export const ${subModuleClassName}Created = Schema.Struct({
  _tag: Schema.Literal("${prefix}Created"),
  ${subModuleName}Id: Schema.UUID,
  parent${parentClassName}Id: Schema.optional(Schema.UUID),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Created",
  title: "${subModuleClassName} Created",
  description: "Emitted when a ${subModuleName} is created"
}))
/**
 * ${subModuleClassName} updated event
 */
export const ${subModuleClassName}Updated = Schema.Struct({
  _tag: Schema.Literal("${prefix}Updated"),
  ${subModuleName}Id: Schema.UUID,
  changes: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }),
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Updated",
  title: "${subModuleClassName} Updated",
  description: "Emitted when a ${subModuleName} is updated"
}))
/**
 * ${subModuleClassName} deleted event
 */
export const ${subModuleClassName}Deleted = Schema.Struct({
  _tag: Schema.Literal("${prefix}Deleted"),
  ${subModuleName}Id: Schema.UUID,
  ...${subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "${prefix}Deleted",
  title: "${subModuleClassName} Deleted",
  description: "Emitted when a ${subModuleName} is deleted"
}))`
}

/**
 * Get event names for the sub-module
 */
function getEventNamesForSubModule(subModuleName: string, subModuleClassName: string) {
  const name = subModuleName.toLowerCase()

  if (name === "cart") {
    return [
      `${subModuleClassName}ItemAdded`,
      `${subModuleClassName}ItemRemoved`,
      `${subModuleClassName}Cleared`
    ]
  }

  if (name === "checkout") {
    return [
      `${subModuleClassName}Initiated`,
      `${subModuleClassName}PaymentProcessed`,
      `${subModuleClassName}Completed`
    ]
  }

  if (name === "management" || name === "order-management") {
    return [
      `${subModuleClassName}OrderCreated`,
      `${subModuleClassName}StatusChanged`,
      `${subModuleClassName}OrderCancelled`
    ]
  }

  // Generic event names
  return [
    `${subModuleClassName}Created`,
    `${subModuleClassName}Updated`,
    `${subModuleClassName}Deleted`
  ]
}
