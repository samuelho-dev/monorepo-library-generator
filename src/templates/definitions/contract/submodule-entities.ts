/**
 * Contract Sub-Module Entities Template Definition
 *
 * Declarative template for generating entities.ts in contract sub-modules.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/templates/definitions/contract/submodule-entities
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Sub-Module Entities Template Definition
 *
 * Generates an entities.ts file for sub-modules with:
 * - Branded ID type ({subModuleClassName}Id)
 * - Main entity class using Schema.Class
 * - Item class for collections
 * - Helper functions (parse, encode)
 *
 * Uses template variables:
 * - {parentClassName}: Parent domain class name (e.g., "Order")
 * - {parentName}: Parent domain name (e.g., "order")
 * - {subModuleClassName}: Sub-module class name (e.g., "Cart")
 * - {subModuleName}: Sub-module name (e.g., "cart")
 */
export const contractSubmoduleEntitiesTemplate: TemplateDefinition = {
  id: "contract/submodule-entities",
  meta: {
    title: "{parentClassName} {subModuleClassName} Entities",
    description: `Domain entities specific to the {subModuleName} sub-module.

These entities are scoped to {subModuleName} operations within the {parentName} domain.
Import shared types from the parent contract when needed.

TODO: Customize for your {subModuleName} sub-module:
1. Add {subModuleName}-specific entity fields
2. Import shared types from parent contract if needed
3. Add validation rules with Schema.pipe()
4. Add Schema.annotations() for documentation`,
    module: "{scope}/contract-{parentName}/{subModuleName}/entities"
  },
  imports: [{ from: "effect", items: ["Schema"] }],
  sections: [
    // ID Type
    {
      title: "{subModuleClassName} ID Type",
      content: {
        type: "raw",
        value: `/**
 * {subModuleClassName} ID branded type
 */
export const {subModuleClassName}Id = Schema.String.pipe(
  Schema.brand("{subModuleClassName}Id"),
  Schema.annotations({
    identifier: "{subModuleClassName}Id",
    title: "{subModuleClassName} ID",
    description: "Unique identifier for a {subModuleName} entity"
  })
)

export type {subModuleClassName}Id = Schema.Schema.Type<typeof {subModuleClassName}Id>`
      }
    },
    // Entity Class
    {
      title: "{subModuleClassName} Entity",
      content: {
        type: "raw",
        value: `/**
 * {subModuleClassName} domain entity
 *
 * Part of the {parentName} domain, handles {subModuleName}-specific data.
 *
 * @identifier {subModuleClassName}
 * @title {subModuleClassName} Entity
 * @description {subModuleClassName} entity within the {parentName} domain
 */
export class {subModuleClassName} extends Schema.Class<{subModuleClassName}>("{subModuleClassName}")({
  /** Unique identifier */
  id: {subModuleClassName}Id,
  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,
  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,
  /** Parent {parentClassName} ID */
  {parentName}Id: Schema.optional(Schema.UUID),
  /** {subModuleClassName} name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "{subModuleClassName} Name",
      description: "Name of this {subModuleName}"
    })
  ),
  /** {subModuleClassName} status */
  status: Schema.Literal(
    "active",
    "inactive",
    "pending"
  )
  // TODO: Add {subModuleName}-specific fields
}) {}`
      }
    },
    // Item Class
    {
      title: "{subModuleClassName} Item (for collections)",
      content: {
        type: "raw",
        value: `/**
 * {subModuleClassName} item for list/collection operations
 *
 * Lightweight representation for {subModuleName} items
 *
 * @identifier {subModuleClassName}Item
 * @title {subModuleClassName} Item
 * @description Lightweight {subModuleName} item representation
 */
export class {subModuleClassName}Item extends Schema.Class<{subModuleClassName}Item>("{subModuleClassName}Item")({
  /** Item identifier */
  id: Schema.UUID,
  /** Item name or label */
  name: Schema.String.pipe(Schema.minLength(1)),
  /** Item quantity (if applicable) */
  quantity: Schema.optional(Schema.Number.pipe(Schema.positive()))
  // TODO: Add {subModuleName}-specific item fields
}) {}`
      }
    },
    // Helper Functions
    {
      title: "Helper Functions",
      content: {
        type: "raw",
        value: `/**
 * Parse {subModuleClassName} from unknown data
 */
export const parse{subModuleClassName} = Schema.decodeUnknown({subModuleClassName})

/**
 * Encode {subModuleClassName} to plain object
 */
export const encode{subModuleClassName} = Schema.encode({subModuleClassName})

/**
 * Parse {subModuleClassName}Item from unknown data
 */
export const parse{subModuleClassName}Item = Schema.decodeUnknown({subModuleClassName}Item)`
      }
    }
  ]
}

export default contractSubmoduleEntitiesTemplate
