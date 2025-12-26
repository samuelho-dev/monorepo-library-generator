/**
 * Error Fragment
 *
 * Fragment renderer for Data.TaggedError classes.
 * Generates type-safe error classes with optional static factory methods.
 *
 * @module monorepo-library-generator/templates/fragments/error-fragment
 */

import { Effect } from "effect"
import type { SourceFile } from "ts-morph"
import { interpolateSync } from "../core/resolver"
import type { TemplateContext } from "../core/types"
import { registerFragment } from "./registry"
import type { ErrorField, ErrorStaticMethod, TaggedErrorFragmentConfig } from "./types"

// ============================================================================
// Error Fragment Renderer
// ============================================================================

/**
 * Render a TaggedError fragment
 *
 * Generates a Data.TaggedError class with fields and optional static methods.
 */
export function renderTaggedErrorFragment(
  sourceFile: SourceFile,
  config: TaggedErrorFragmentConfig,
  context: TemplateContext
): Effect.Effect<void, never> {
  return Effect.sync(() => {
    const className = interpolateSync(config.className, context)
    const tagName = config.tagName ? interpolateSync(config.tagName, context) : className

    // Build field definitions
    const fieldDefs = buildFieldDefinitions(config.fields, context)

    // Build static methods
    const staticMethods = config.staticMethods
      ? buildStaticMethods(config.staticMethods, className, context)
      : []

    // Add JSDoc if provided
    const statements: string[] = []

    if (config.jsdoc) {
      statements.push(`/**\n * ${interpolateSync(config.jsdoc, context)}\n */`)
    }

    // Build class body
    const hasBody = staticMethods.length > 0
    const bodyContent = hasBody
      ? ` {\n${staticMethods.join("\n\n")}\n}`
      : " {}"

    // Generate the class declaration
    const exportKeyword = config.exported !== false ? "export " : ""
    const classDecl = `${exportKeyword}class ${className} extends Data.TaggedError(
  "${tagName}"
)<{
${fieldDefs}
}>${bodyContent}`

    statements.push(classDecl)

    // Add to source file
    sourceFile.addStatements(statements.join("\n"))
  })
}

/**
 * Build field definitions for the error class
 */
function buildFieldDefinitions(
  fields: ReadonlyArray<ErrorField>,
  context: TemplateContext
): string {
  const lines: string[] = []

  for (const field of fields) {
    const fieldName = interpolateSync(field.name, context)
    const fieldType = interpolateSync(field.type, context)
    const optional = field.optional ? "?" : ""

    if (field.jsdoc) {
      lines.push(`  /** ${interpolateSync(field.jsdoc, context)} */`)
    }

    lines.push(`  readonly ${fieldName}${optional}: ${fieldType}`)
  }

  return lines.join("\n")
}

/**
 * Build static method definitions
 *
 * Note: Method bodies are NOT interpolated because they contain JavaScript
 * template literal syntax (${variable}) that should be preserved.
 * Only parameter names/types use {variable} interpolation.
 */
function buildStaticMethods(
  methods: ReadonlyArray<ErrorStaticMethod>,
  className: string,
  context: TemplateContext
): string[] {
  return methods.map((method) => {
    const params = method.params
      .map((p) => {
        // Only interpolate if the value contains {curlyBraces} pattern
        const pName = hasInterpolation(p.name) ? interpolateSync(p.name, context) : p.name
        const pType = hasInterpolation(p.type) ? interpolateSync(p.type, context) : p.type
        const optional = p.optional ? "?" : ""
        return `${pName}${optional}: ${pType}`
      })
      .join(", ")

    // Method body is NOT interpolated - it contains JS template literal syntax
    const body = method.body

    return `  static ${method.name}(${params}) {\n    ${body}\n  }`
  })
}

/**
 * Check if string contains interpolation pattern {variableName}
 */
function hasInterpolation(str: string): boolean {
  return /\{[a-zA-Z_][a-zA-Z0-9_.]*\}/.test(str)
}

// ============================================================================
// Fragment Presets
// ============================================================================

/**
 * Create a not-found error fragment config
 */
export function notFoundErrorFragment(
  className: string,
  idFieldName = "id"
): TaggedErrorFragmentConfig {
  return {
    className: `${className}NotFoundError`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: `${idFieldName}`, type: "string", jsdoc: "Identifier that was not found" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: idFieldName, type: "string" }],
        body: `return new ${className}NotFoundError({
      message: \`${className} not found: \${${idFieldName}}\`,
      ${idFieldName}
    })`
      }
    ],
    jsdoc: `Error thrown when ${className.toLowerCase()} is not found`
  }
}

/**
 * Create a validation error fragment config
 */
export function validationErrorFragment(className: string): TaggedErrorFragmentConfig {
  return {
    className: `${className}ValidationError`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "field", type: "string", optional: true, jsdoc: "Field that failed validation" },
      { name: "constraint", type: "string", optional: true, jsdoc: "Constraint that was violated" },
      { name: "value", type: "unknown", optional: true, jsdoc: "Invalid value" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          {
            name: "params",
            type: "{ message: string; field?: string; constraint?: string; value?: unknown }"
          }
        ],
        body: `return new ${className}ValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value })
    })`
      },
      {
        name: "fieldRequired",
        params: [{ name: "field", type: "string" }],
        body: `return new ${className}ValidationError({
      message: \`\${field} is required\`,
      field,
      constraint: "required"
    })`
      },
      {
        name: "fieldInvalid",
        params: [
          { name: "field", type: "string" },
          { name: "constraint", type: "string" },
          { name: "value", type: "unknown", optional: true }
        ],
        body: `return new ${className}ValidationError({
      message: \`\${field} is invalid: \${constraint}\`,
      field,
      constraint,
      ...(value !== undefined && { value })
    })`
      }
    ],
    jsdoc: `Error thrown when ${className.toLowerCase()} validation fails`
  }
}

/**
 * Create an already-exists error fragment config
 */
export function alreadyExistsErrorFragment(className: string): TaggedErrorFragmentConfig {
  return {
    className: `${className}AlreadyExistsError`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "identifier", type: "string", optional: true, jsdoc: "Identifier of existing resource" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: "identifier", type: "string", optional: true }],
        body: `return new ${className}AlreadyExistsError({
      message: identifier
        ? \`${className} already exists: \${identifier}\`
        : "${className} already exists",
      ...(identifier !== undefined && { identifier })
    })`
      }
    ],
    jsdoc: `Error thrown when ${className.toLowerCase()} already exists`
  }
}

/**
 * Create a permission error fragment config
 */
export function permissionErrorFragment(
  className: string,
  idFieldName = "id"
): TaggedErrorFragmentConfig {
  return {
    className: `${className}PermissionError`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Operation that was denied" },
      { name: `${idFieldName}`, type: "string", jsdoc: "Resource identifier" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          {
            name: "params",
            type: `{ operation: string; ${idFieldName}: string }`
          }
        ],
        body: `return new ${className}PermissionError({
      message: \`Operation '\${params.operation}' not permitted on ${className.toLowerCase()} \${params.${idFieldName}}\`,
      operation: params.operation,
      ${idFieldName}: params.${idFieldName}
    })`
      }
    ],
    jsdoc: `Error thrown when ${className.toLowerCase()} operation is not permitted`
  }
}

/**
 * Create a database/repository error fragment config
 */
export function databaseErrorFragment(className: string): TaggedErrorFragmentConfig {
  return {
    className: `${className}DatabaseError`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Database operation that failed" },
      { name: "cause", type: "string", optional: true, jsdoc: "Underlying error cause" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          {
            name: "params",
            type: "{ message: string; operation: string; cause?: string }"
          }
        ],
        body: `return new ${className}DatabaseError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause })
    })`
      }
    ],
    jsdoc: `Error thrown when ${className.toLowerCase()} database operation fails`
  }
}

/**
 * Get all domain error fragments for a class
 */
export function domainErrorFragments(
  className: string,
  idFieldName = "id"
): ReadonlyArray<TaggedErrorFragmentConfig> {
  return [
    notFoundErrorFragment(className, idFieldName),
    validationErrorFragment(className),
    alreadyExistsErrorFragment(className),
    permissionErrorFragment(className, idFieldName)
  ]
}

/**
 * Get all repository error fragments for a class
 */
export function repositoryErrorFragments(
  className: string,
  idFieldName = "id"
): ReadonlyArray<TaggedErrorFragmentConfig> {
  return [
    {
      ...notFoundErrorFragment(className, idFieldName),
      className: `${className}NotFoundRepositoryError`,
      jsdoc: `Repository error for ${className.toLowerCase()} not found`
    },
    {
      ...validationErrorFragment(className),
      className: `${className}ValidationRepositoryError`,
      jsdoc: `Repository error for ${className.toLowerCase()} validation failures`
    },
    {
      className: `${className}ConflictRepositoryError`,
      fields: [
        { name: "message", type: "string", jsdoc: "Human-readable error message" },
        { name: "identifier", type: "string", optional: true, jsdoc: "Identifier of conflicting resource" }
      ],
      staticMethods: [
        {
          name: "create",
          params: [{ name: "identifier", type: "string", optional: true }],
          body: `return new ${className}ConflictRepositoryError({
      message: identifier
        ? \`${className} conflict: \${identifier}\`
        : "${className} conflict",
      ...(identifier !== undefined && { identifier })
    })`
        }
      ],
      jsdoc: `Repository error for ${className.toLowerCase()} conflicts`
    },
    databaseErrorFragment(className)
  ]
}

// ============================================================================
// Register Fragment
// ============================================================================

// Register on import
registerFragment("taggedError", renderTaggedErrorFragment, ["Data"])
