/**
 * Contract Sub-Module Entities Template
 *
 * Generates entities.ts for contract sub-module with Schema.Class definitions.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/contract/submodule-entities-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface SubModuleEntitiesOptions {
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
 * Generate entities.ts for a contract sub-module
 *
 * Creates domain entity definitions specific to this sub-module
 */
export function generateSubModuleEntitiesFile(options: SubModuleEntitiesOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Entities`,
    description: `Domain entities specific to the ${subModuleName} sub-module.

These entities are scoped to ${subModuleName} operations within the ${parentName} domain.
Import shared types from the parent contract when needed.`,
    module: `${scope}/contract-${parentName}/${subModuleName}/entities`
  })
  builder.addBlankLine()

  builder.addRaw(`
/**
 * TODO: Customize for your ${subModuleName} sub-module:
 * 1. Add ${subModuleName}-specific entity fields
 * 2. Import shared types from parent contract if needed
 * 3. Add validation rules with Schema.pipe()
 * 4. Add Schema.annotations() for documentation
 */
`)
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Schema"] }])
  builder.addBlankLine()

  builder.addSectionComment(`${subModuleClassName} ID Type`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${subModuleClassName} ID branded type
 */
export const ${subModuleClassName}Id = Schema.String.pipe(
  Schema.brand("${subModuleClassName}Id"),
  Schema.annotations({
    identifier: "${subModuleClassName}Id",
    title: "${subModuleClassName} ID",
    description: "Unique identifier for a ${subModuleName} entity"
  })
);

export type ${subModuleClassName}Id = Schema.Schema.Type<typeof ${subModuleClassName}Id>;`)
  builder.addBlankLine()

  builder.addSectionComment(`${subModuleClassName} Entity`)
  builder.addBlankLine()

  // Generate a sub-module-appropriate entity based on the name
  const entityExample = getEntityExample(subModuleName, subModuleClassName, parentClassName)

  builder.addRaw(`/**
 * ${subModuleClassName} domain entity
 *
 * Part of the ${parentName} domain, handles ${subModuleName}-specific data.
 */
export class ${subModuleClassName} extends Schema.Class<${subModuleClassName}>("${subModuleClassName}")({
  /** Unique identifier */
  id: ${subModuleClassName}Id,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

${entityExample}
}).pipe(
  Schema.annotations({
    identifier: "${subModuleClassName}",
    title: "${subModuleClassName} Entity",
    description: "${subModuleClassName} entity within the ${parentName} domain"
  })
) {}`)
  builder.addBlankLine()

  builder.addSectionComment(`${subModuleClassName} Item (for collections)`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${subModuleClassName} item for list/collection operations
 *
 * Lightweight representation for ${subModuleName} items
 */
export class ${subModuleClassName}Item extends Schema.Class<${subModuleClassName}Item>("${subModuleClassName}Item")({
  /** Item identifier */
  id: Schema.UUID,

  /** Item name or label */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "${subModuleClassName} Item Name",
      description: "Display name for this ${subModuleName} item"
    })
  ),

  /** Item quantity (if applicable) */
  quantity: Schema.optional(Schema.Number.pipe(Schema.positive())),

  // TODO: Add ${subModuleName}-specific item fields
}).pipe(
  Schema.annotations({
    identifier: "${subModuleClassName}Item",
    title: "${subModuleClassName} Item",
    description: "Lightweight ${subModuleName} item representation"
  })
) {}`)
  builder.addBlankLine()

  builder.addSectionComment("Helper Functions")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Parse ${subModuleClassName} from unknown data
 */
export const parse${subModuleClassName} = Schema.decodeUnknown(${subModuleClassName});

/**
 * Encode ${subModuleClassName} to plain object
 */
export const encode${subModuleClassName} = Schema.encode(${subModuleClassName});

/**
 * Parse ${subModuleClassName}Item from unknown data
 */
export const parse${subModuleClassName}Item = Schema.decodeUnknown(${subModuleClassName}Item);`)
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Get entity example fields based on common sub-module patterns
 */
function getEntityExample(subModuleName: string, subModuleClassName: string, parentClassName: string) {
  const name = subModuleName.toLowerCase()

  // Common sub-module patterns with appropriate fields
  if (name === "cart") {
    return `  /** Associated ${parentClassName.toLowerCase()} user ID */
  userId: Schema.UUID,

  /** Cart items */
  items: Schema.Array(Schema.Unknown), // TODO: Define cart item schema

  /** Cart status */
  status: Schema.Literal("active", "abandoned", "converted"),

  /** Total amount */
  totalAmount: Schema.optional(Schema.Number.pipe(Schema.positive())),`
  }

  if (name === "checkout") {
    return `  /** Associated cart ID */
  cartId: Schema.UUID,

  /** Checkout session status */
  status: Schema.Literal("pending", "processing", "completed", "failed"),

  /** Payment method */
  paymentMethod: Schema.optional(Schema.String),

  /** Shipping address */
  shippingAddress: Schema.optional(Schema.Unknown), // TODO: Define address schema`
  }

  if (name === "management" || name === "order-management") {
    return `  /** Order reference number */
  orderNumber: Schema.String,

  /** Order status */
  status: Schema.Literal("pending", "confirmed", "shipped", "delivered", "cancelled"),

  /** Order notes */
  notes: Schema.optional(Schema.String),

  /** Assigned handler */
  handlerId: Schema.optional(Schema.UUID),`
  }

  if (name === "catalog") {
    return `  /** Product reference */
  productId: Schema.UUID,

  /** Catalog category */
  categoryId: Schema.optional(Schema.UUID),

  /** Display order */
  displayOrder: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),

  /** Is featured */
  isFeatured: Schema.Boolean,`
  }

  if (name === "media") {
    return `  /** Associated entity ID */
  entityId: Schema.UUID,

  /** Media type */
  mediaType: Schema.Literal("image", "video", "document", "audio"),

  /** File URL */
  url: Schema.String,

  /** File size in bytes */
  size: Schema.optional(Schema.Number.pipe(Schema.positive())),

  /** MIME type */
  mimeType: Schema.optional(Schema.String),`
  }

  if (name === "metadata") {
    return `  /** Associated entity ID */
  entityId: Schema.UUID,

  /** Metadata key */
  key: Schema.String.pipe(Schema.minLength(1)),

  /** Metadata value */
  value: Schema.Unknown,

  /** Metadata namespace */
  namespace: Schema.optional(Schema.String),`
  }

  if (name === "fulfillment") {
    return `  /** Order ID being fulfilled */
  orderId: Schema.UUID,

  /** Fulfillment status */
  status: Schema.Literal("pending", "processing", "shipped", "delivered", "failed"),

  /** Tracking number */
  trackingNumber: Schema.optional(Schema.String),

  /** Carrier name */
  carrier: Schema.optional(Schema.String),`
  }

  // Generic fallback
  return `  /** Parent ${parentClassName.toLowerCase()} ID */
  ${parentClassName.toLowerCase()}Id: Schema.optional(Schema.UUID),

  /** ${subModuleClassName} name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "${subModuleClassName} Name",
      description: "Name of this ${subModuleName}"
    })
  ),

  /** ${subModuleClassName} status */
  status: Schema.Literal("active", "inactive", "pending"),

  // TODO: Add ${subModuleName}-specific fields`
}
