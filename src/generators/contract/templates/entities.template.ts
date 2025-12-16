/**
 * Contract Entities Template
 *
 * Generates entities.ts file for contract libraries with Schema.Class
 * definitions for domain entities with runtime validation.
 *
 * @module monorepo-library-generator/contract/entities-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ContractTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate entities.ts file for contract library
 *
 * Creates domain entity definitions using Schema.Class with:
 * - Type aliases for database types
 * - Schema.Class entity definition
 * - Helper functions for parsing and encoding
 */
export function generateEntitiesFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Domain Entities`,
    description:
      "Defines domain entities using Schema.Class for runtime validation. Database types are imported from @custom-repo/infra-database.",
    module: `@custom-repo/contract-${fileName}/entities`
  })

  builder.addRaw(`
/**
 * TODO: Customize for your domain:
 * 1. Add domain-specific fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add Schema.annotations() for OpenAPI/documentation
 * 4. Add Schema.filter() for cross-field validation
 * 5. Add Schema.transform() for data normalization
 * 6. Add computed fields if needed
 * 7. Import database types (${className}Select, etc.) from infra-database
 */
`)

  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])
  builder.addBlankLine()

  // ============================================================================
  // SECTION 1: Type Aliases
  // ============================================================================

  builder.addSectionComment("Type Aliases for Database Types")
  builder.addComment(
    "Import database-generated types from infra-database library"
  )
  builder.addComment("DO NOT duplicate these definitions here")
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}Id`,
    type: "string",
    exported: true,
    jsdoc: `${className} ID type (UUID string)`
  })

  builder.addComment("TODO: Import actual database types when available:")
  builder.addComment("import type {")
  builder.addComment(`  ${className}Select,`)
  builder.addComment(`  ${className}Insert,`)
  builder.addComment(`  ${className}Update,`)
  builder.addComment("} from \"@custom-repo/infra-database\";")
  builder.addBlankLine()

  // ============================================================================
  // SECTION 2: Domain Entity
  // ============================================================================

  builder.addSectionComment("Domain Entities (Schema.Class)")
  builder.addBlankLine()

  // Create Schema.Class using raw code since it has special syntax
  const entityClass = `/**
 * ${className} domain entity
 *
 * Uses Schema.Class for runtime validation and type safety.
 * This is separate from database types to allow domain-specific validation.
 */
export class ${className} extends Schema.Class<${className}>("${className}")({
  /** Unique identifier */
  id: Schema.UUID,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

  // TODO: Add domain-specific fields here
  // Example fields with Schema.annotations():
  //
  // /** ${className} name */
  // name: Schema.String.pipe(
  //   Schema.minLength(1),
  //   Schema.maxLength(255)
  // ).annotations({
  //   title: "${className} Name",
  //   description: "The human-readable name for this ${className}",
  //   examples: ["Example ${className}"],
  //   jsonSchema: { minLength: 1, maxLength: 255 }
  // }),
  //
  // /** ${className} description */
  // description: Schema.optional(Schema.String).annotations({
  //   title: "Description",
  //   description: "Optional description providing additional context"
  // }),
  //
  // /** ${className} status */
  // status: Schema.Literal("draft", "active", "archived").annotations({
  //   title: "Status",
  //   description: "Current lifecycle status",
  //   examples: ["active"]
  // }),
  //
  // /** Owner user ID */
  // ownerId: Schema.UUID.annotations({
  //   title: "Owner ID",
  //   description: "UUID of the user who owns this ${className}"
  // }),
}).pipe(
  // TODO: Add cross-field validation with Schema.filter()
  // Example:
  // Schema.filter((entity) => {
  //   // Validate relationships between fields
  //   if (entity.endDate && entity.startDate && entity.endDate < entity.startDate) {
  //     return {
  //       path: ["endDate"],
  //       message: "End date must be after start date"
  //     };
  //   }
  //   return true;
  // }),

  // Add class-level annotations for OpenAPI documentation
  Schema.annotations({
    identifier: "${className}",
    title: "${className} Entity",
    description: "Core ${className} domain entity with runtime validation and type safety"
  })
) {}`

  builder.addRaw(entityClass)
  builder.addBlankLine()

  // ============================================================================
  // SECTION 3: Helper Functions
  // ============================================================================

  builder.addSectionComment("Helper Functions")
  builder.addBlankLine()

  // Parse function
  const parseFunction = `/**
 * Parse ${className} from unknown data
 *
 * @example
 * \`\`\`typescript
 * const entity = yield* parse${className}(unknownData);
 * \`\`\`
 */
export const parse${className} = Schema.decodeUnknown(${className});`

  builder.addRaw(parseFunction)
  builder.addBlankLine()

  // Encode function
  const encodeFunction = `/**
 * Encode ${className} to plain object
 *
 * @example
 * \`\`\`typescript
 * const encoded = yield* encode${className}(entity);
 * \`\`\`
 */
export const encode${className} = Schema.encode(${className});`

  builder.addRaw(encodeFunction)
  builder.addBlankLine()

  return builder.toString()
}
