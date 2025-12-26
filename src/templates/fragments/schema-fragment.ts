/**
 * Schema Fragment
 *
 * Fragment renderer for Effect Schema definitions.
 * Generates type-safe schema constants with optional branding and annotations.
 *
 * @module monorepo-library-generator/templates/fragments/schema-fragment
 */

import { Effect } from "effect"
import type { SourceFile } from "ts-morph"
import { interpolateSync } from "../core/resolver"
import type { TemplateContext } from "../core/types"
import { registerFragment } from "./registry"
import type { SchemaAnnotations, SchemaField, SchemaFragmentConfig } from "./types"

// ============================================================================
// Schema Fragment Renderer
// ============================================================================

/**
 * Render a Schema fragment
 *
 * Generates a Schema definition with optional branding, annotations, and type alias.
 */
export function renderSchemaFragment(
  sourceFile: SourceFile,
  config: SchemaFragmentConfig,
  context: TemplateContext
): Effect.Effect<void, never> {
  return Effect.sync(() => {
    const name = interpolateSync(config.name, context)

    const statements: string[] = []

    // Add JSDoc if provided
    if (config.jsdoc) {
      statements.push(`/**\n * ${interpolateSync(config.jsdoc, context)}\n */`)
    }

    // Build schema expression based on type
    const schemaExpr = buildSchemaExpression(config, context)

    // Add export
    const exportKeyword = config.exported !== false ? "export " : ""
    statements.push(`${exportKeyword}const ${name} = ${schemaExpr}`)

    // Add type alias if requested
    if (config.typeAlias) {
      const typeAliasName = interpolateSync(config.typeAlias, context)
      statements.push(``)
      statements.push(`${exportKeyword}type ${typeAliasName} = Schema.Schema.Type<typeof ${name}>`)
    }

    // Add to source file
    sourceFile.addStatements(statements.join("\n"))
  })
}

/**
 * Build the schema expression based on config
 */
function buildSchemaExpression(
  config: SchemaFragmentConfig,
  context: TemplateContext
): string {
  let expr: string

  switch (config.schemaType) {
    case "Struct":
      expr = buildStructSchema(config.fields ?? [], context)
      break
    case "String":
      expr = "Schema.String"
      break
    case "Number":
      expr = "Schema.Number"
      break
    case "Boolean":
      expr = "Schema.Boolean"
      break
    case "Array":
      // For array, first field's schema is the item type
      const itemSchema = config.fields?.[0]?.schema ?? "Schema.Unknown"
      expr = `Schema.Array(${interpolateSync(itemSchema, context)})`
      break
    case "Union":
      // For union, each field is a variant
      const variants = (config.fields ?? [])
        .map((f) => interpolateSync(f.schema, context))
        .join(", ")
      expr = `Schema.Union(${variants})`
      break
    default:
      expr = "Schema.Unknown"
  }

  // Add brand if specified
  if (config.brand) {
    const brand = interpolateSync(config.brand, context)
    expr = `${expr}.pipe(Schema.brand("${brand}"))`
  }

  // Add annotations if specified
  if (config.annotations) {
    const annotations = buildAnnotations(config.annotations, context)
    expr = `${expr}.pipe(Schema.annotations(${annotations}))`
  }

  return expr
}

/**
 * Build a Struct schema expression
 */
function buildStructSchema(
  fields: ReadonlyArray<SchemaField>,
  context: TemplateContext
): string {
  if (fields.length === 0) {
    return "Schema.Struct({})"
  }

  const fieldLines = fields.map((field) => {
    const fieldName = interpolateSync(field.name, context)
    const fieldSchema = interpolateSync(field.schema, context)
    const schemaExpr = field.optional
      ? `Schema.optional(${fieldSchema})`
      : fieldSchema

    return `  ${fieldName}: ${schemaExpr}`
  })

  return `Schema.Struct({
${fieldLines.join(",\n")}
})`
}

/**
 * Build annotations object
 */
function buildAnnotations(
  annotations: SchemaAnnotations,
  context: TemplateContext
): string {
  const parts: string[] = []

  if (annotations.identifier) {
    parts.push(`identifier: "${interpolateSync(annotations.identifier, context)}"`)
  }

  if (annotations.title) {
    parts.push(`title: "${interpolateSync(annotations.title, context)}"`)
  }

  if (annotations.description) {
    parts.push(`description: "${interpolateSync(annotations.description, context)}"`)
  }

  return `{ ${parts.join(", ")} }`
}

// ============================================================================
// Fragment Presets
// ============================================================================

/**
 * Create a branded ID schema fragment
 */
export function brandedIdFragment(
  className: string,
  options: {
    readonly name?: string
    readonly brand?: string
  } = {}
): SchemaFragmentConfig {
  const name = options.name ?? `${className}Id`
  const brand = options.brand ?? name

  return {
    name,
    schemaType: "String",
    brand,
    annotations: {
      identifier: name,
      title: `${className} ID`
    },
    typeAlias: name,
    jsdoc: `Branded ${className} ID type`
  }
}

/**
 * Create an entity schema fragment
 */
export function entitySchemaFragment(
  className: string,
  fields: ReadonlyArray<SchemaField>,
  options: {
    readonly name?: string
    readonly typeAlias?: string
  } = {}
): SchemaFragmentConfig {
  const name = options.name ?? `${className}Schema`
  const typeAlias = options.typeAlias ?? className

  return {
    name,
    schemaType: "Struct",
    fields,
    typeAlias,
    jsdoc: `${className} entity schema`
  }
}

/**
 * Create a create input schema fragment
 */
export function createInputSchemaFragment(
  className: string,
  fields: ReadonlyArray<SchemaField>
): SchemaFragmentConfig {
  return {
    name: `Create${className}Input`,
    schemaType: "Struct",
    fields,
    typeAlias: `Create${className}Input`,
    jsdoc: `Input schema for creating a ${className.toLowerCase()}`
  }
}

/**
 * Create an update input schema fragment
 */
export function updateInputSchemaFragment(
  className: string,
  fields: ReadonlyArray<SchemaField>
): SchemaFragmentConfig {
  // All fields are optional for update
  const optionalFields = fields.map((f) => ({ ...f, optional: true }))

  return {
    name: `Update${className}Input`,
    schemaType: "Struct",
    fields: optionalFields,
    typeAlias: `Update${className}Input`,
    jsdoc: `Input schema for updating a ${className.toLowerCase()}`
  }
}

/**
 * Create common schema field definitions
 */
export const commonSchemaFields = {
  id: (name = "id"): SchemaField => ({
    name,
    schema: "Schema.String",
    jsdoc: "Unique identifier"
  }),

  createdAt: (): SchemaField => ({
    name: "createdAt",
    schema: "Schema.Date",
    jsdoc: "Creation timestamp"
  }),

  updatedAt: (): SchemaField => ({
    name: "updatedAt",
    schema: "Schema.Date",
    jsdoc: "Last update timestamp"
  }),

  name: (): SchemaField => ({
    name: "name",
    schema: "Schema.String",
    jsdoc: "Display name"
  }),

  email: (): SchemaField => ({
    name: "email",
    schema: "Schema.String",
    jsdoc: "Email address"
  }),

  status: (variants: ReadonlyArray<string>): SchemaField => ({
    name: "status",
    schema: `Schema.Literal(${variants.map((v) => `"${v}"`).join(", ")})`,
    jsdoc: "Current status"
  }),

  optional: (field: SchemaField): SchemaField => ({
    ...field,
    optional: true
  })
}

// ============================================================================
// Register Fragment
// ============================================================================

// Register on import
registerFragment("schema", renderSchemaFragment, ["Schema"])
