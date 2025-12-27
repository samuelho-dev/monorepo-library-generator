/**
 * Template Utilities
 *
 * Shared utilities for generating TypeScript templates across all generators.
 * Consolidates patterns for:
 * - Nx template file generation
 * - Error class templates (TaggedError)
 * - Type templates (pagination, sorting, filtering)
 * - Barrel export utilities
 * - Type-only export generation
 *
 * @module monorepo-library-generator/templates
 */

import type { Tree } from "@nx/devkit"
import { generateFiles } from "@nx/devkit"
import * as path from "node:path"
import type { TypeScriptBuilder } from "./code-builder"
import { createNamingVariants } from "./naming"
import type { LibraryType, NamingVariants } from "./types"

// Re-export TypeScriptBuilder from code-builder for convenience
export { TypeScriptBuilder } from "./code-builder"

// ============================================================================
// Nx Template File Generation
// ============================================================================

/**
 * Base template substitutions that all generators should include
 * Following Nx EJS template best practices
 */
export interface BaseTemplateSubstitutions extends NamingVariants {
  tmpl: "" // Standard Nx pattern for __tmpl__ removal
  name: string
  projectName: string
  projectRoot: string
  offsetFromRoot: string
  tags: string
}

/**
 * Generate template files with substitutions following Nx patterns
 * Uses EJS templating for variable substitution
 */
export function generateTemplateFiles<T extends BaseTemplateSubstitutions>(
  tree: Tree,
  templatePath: string,
  targetPath: string,
  substitutions: T
) {
  // Ensure tmpl is always empty string for __tmpl__ removal
  const finalSubstitutions: T & { tmpl: "" } = {
    ...substitutions,
    tmpl: ""
  }

  generateFiles(tree, templatePath, targetPath, finalSubstitutions)
}

/**
 * Create base substitutions object with common values
 */
export function createBaseSubstitutions(
  name: string,
  projectName: string,
  projectRoot: string,
  offsetFromRoot: string,
  tags: Array<string>
) {
  const nameVariations = createNamingVariants(name)

  const result: BaseTemplateSubstitutions = {
    ...nameVariations,
    tmpl: "",
    name,
    projectName,
    projectRoot,
    offsetFromRoot,
    tags: JSON.stringify(tags)
  }

  return result
}

/**
 * Clean up conditional template files based on options
 */
export function cleanupConditionalFiles(
  tree: Tree,
  projectRoot: string,
  filesToRemove: Array<string>
) {
  for (const file of filesToRemove) {
    const filePath = path.join(projectRoot, file)
    if (tree.exists(filePath)) {
      tree.delete(filePath)
    }
  }
}

/**
 * Get list of files to remove based on generator options
 */
export function getConditionalFilesToRemove(options: {
  includeClientServer?: boolean
  platform?: "node" | "browser" | "universal" | "edge"
  includePooling?: boolean
  [key: string]: unknown
}) {
  const filesToRemove = []

  // Only remove server.ts if not needed based on platform
  const shouldGenerateServer = options.includeClientServer || options.platform === "node" ||
    options.platform === "universal"
  const shouldGenerateClient = options.includeClientServer ||
    options.platform === "browser" ||
    options.platform === "universal"

  if (!shouldGenerateServer) {
    filesToRemove.push("src/server.ts")
  }

  if (!shouldGenerateClient) {
    filesToRemove.push("src/client.ts")
  }

  // Remove pool-related files when pooling is disabled
  if (options.includePooling === false) {
    filesToRemove.push("src/lib/__tests__/pool.test.ts")
  }

  return filesToRemove
}

// ============================================================================
// Error Template Types
// ============================================================================

/**
 * Field definition for Tagged Error class
 */
export interface ErrorField {
  /**
   * Field name
   * @example "id", "message", "field"
   */
  readonly name: string

  /**
   * TypeScript type
   * @example "string", "number", "unknown"
   */
  readonly type: string

  /**
   * Whether field is optional
   * @default false
   */
  readonly optional?: boolean

  /**
   * Whether field is readonly
   * @default true
   */
  readonly readonly?: boolean
}

/**
 * Static method parameter definition
 */
export interface MethodParameter {
  /**
   * Parameter name
   */
  readonly name: string

  /**
   * TypeScript type
   */
  readonly type: string

  /**
   * Whether parameter is optional
   * @default false
   */
  readonly optional?: boolean
}

/**
 * Static factory method definition
 */
export interface StaticFactoryMethod {
  /**
   * Method name (usually "create")
   */
  readonly name: string

  /**
   * Method parameters
   */
  readonly params: ReadonlyArray<MethodParameter>

  /**
   * Return type
   */
  readonly returnType: string

  /**
   * Method body (JavaScript code)
   */
  readonly body: string
}

/**
 * Tagged Error class configuration (used in error-templates)
 * Note: This is different from effect-patterns TaggedErrorConfig
 */
export interface ErrorClassConfig {
  /**
   * Class name
   * @example "UserNotFoundError"
   */
  readonly className: string

  /**
   * Tag name for Data.TaggedError
   * @example "UserNotFoundError"
   */
  readonly tagName: string

  /**
   * Error class fields
   */
  readonly fields: ReadonlyArray<ErrorField>

  /**
   * Optional static methods (typically a "create" factory)
   */
  readonly staticMethods?: ReadonlyArray<StaticFactoryMethod>

  /**
   * Optional JSDoc comment
   */
  readonly jsdoc?: string
}

// ============================================================================
// Error Template Functions
// ============================================================================

/**
 * Generates a Data.TaggedError class definition
 *
 * Creates Effect-style tagged errors with:
 * - Data.TaggedError base class
 * - Readonly fields
 * - Optional static factory methods
 * - JSDoc documentation
 */
export function createTaggedErrorClass(config: ErrorClassConfig) {
  const { className, fields, jsdoc, staticMethods, tagName } = config

  // Generate field definitions
  const fieldDefs = fields
    .map((f) => {
      const readonly = f.readonly !== false ? "readonly " : ""
      const optional = f.optional ? "?" : ""
      return `  ${readonly}${f.name}${optional}: ${f.type}`
    })
    .join("\n")

  // Generate static methods
  const methodDefs = staticMethods?.length
    ? "\n  " +
      staticMethods
        .map((method) => {
          const params = method.params
            .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
            .join(", ")

          // Indent method body lines
          const indentedBody = method.body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")

          return `static ${method.name}(${params}) {\n${indentedBody}\n  }`
        })
        .join("\n\n  ")
    : ""

  // Generate JSDoc
  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ""

  // Build complete class
  return `${jsdocComment}export class ${className} extends Data.TaggedError(
  "${tagName}"
)<{
${fieldDefs}
}>${methodDefs ? ` {${methodDefs}\n}` : " {}"}`
}

/**
 * Type guard function configuration
 */
export interface TypeGuardConfig {
  /**
   * Class name prefix
   * @example "User"
   */
  readonly className: string

  /**
   * Error type suffixes to generate guards for
   * @example ["NotFoundError", "ValidationError", "ConflictError"]
   */
  readonly errorTypes: ReadonlyArray<string>
}

/**
 * Generates type guard functions for tagged errors
 */
export function createTypeGuardFunctions(config: TypeGuardConfig) {
  const { className, errorTypes } = config

  return errorTypes
    .map((errorType) => {
      const fullTypeName = `${className}${errorType}`

      return `export function is${fullTypeName}(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "${fullTypeName}"
  )
}`
    })
    .join("\n\n")
}

/**
 * Error union type configuration
 */
export interface ErrorUnionTypeConfig {
  /**
   * Union type name
   * @example "UserRepositoryError" or "UserServiceError"
   */
  readonly typeName: string

  /**
   * Base error class name
   * @example "UserError"
   */
  readonly baseError: string

  /**
   * Additional error types in the union
   * @example ["UserNotFoundError", "UserValidationError"]
   */
  readonly errorTypes: ReadonlyArray<string>

  /**
   * Whether to export the type
   * @default true
   */
  readonly exported?: boolean

  /**
   * Optional JSDoc comment
   */
  readonly jsdoc?: string
}

/**
 * Generates an error union type
 */
export function createErrorUnionType(config: ErrorUnionTypeConfig) {
  const { baseError, errorTypes, exported = true, jsdoc, typeName } = config

  const exportKeyword = exported ? "export " : ""
  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ""

  const allErrors = [baseError, ...errorTypes]

  return `${jsdocComment}${exportKeyword}type ${typeName} = ${allErrors.join(" | ")}`
}

/**
 * Generates a standard NotFoundError class
 */
export function createNotFoundError(className: string) {
  return createTaggedErrorClass({
    className: `${className}NotFoundError`,
    tagName: `${className}NotFoundError`,
    fields: [
      { name: "message", type: "string" },
      { name: "id", type: "string" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: "id", type: "string" }],
        returnType: `${className}NotFoundError`,
        body: `return new ${className}NotFoundError({
  message: \`${className} not found: \${id}\`,
  id
})`
      }
    ],
    jsdoc: `Error thrown when a ${className} entity is not found`
  })
}

/**
 * Generates a standard ValidationError class
 */
export function createValidationError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ValidationError`,
    tagName: `${className}ValidationError`,
    fields: [
      { name: "message", type: "string" },
      { name: "field", type: "string", optional: true },
      { name: "constraint", type: "string", optional: true },
      { name: "value", type: "unknown", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          {
            name: "params",
            type: `{
    message: string
    field?: string
    constraint?: string
    value?: unknown
  }`
          }
        ],
        returnType: `${className}ValidationError`,
        body: `return new ${className}ValidationError({
  message: params.message,
  ...(params.field !== undefined && { field: params.field }),
  ...(params.constraint !== undefined && { constraint: params.constraint }),
  ...(params.value !== undefined && { value: params.value })
})`
      }
    ],
    jsdoc: `Error thrown when ${className} validation fails`
  })
}

/**
 * Generates a standard ConflictError class
 */
export function createConflictError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConflictError`,
    tagName: `${className}ConflictError`,
    fields: [
      { name: "message", type: "string" },
      { name: "conflictingId", type: "string", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: "conflictingId", type: "string", optional: true }],
        returnType: `${className}ConflictError`,
        body: `return new ${className}ConflictError({
  message: conflictingId
    ? \`Resource already exists: \${conflictingId}\`
    : "Resource already exists",
  ...(conflictingId !== undefined && { conflictingId })
})`
      }
    ],
    jsdoc: `Error thrown when a ${className} resource already exists`
  })
}

/**
 * Generates a standard ConnectionError class
 */
export function createConnectionError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConnectionError`,
    tagName: `${className}ConnectionError`,
    fields: [
      { name: "message", type: "string" },
      { name: "target", type: "string" },
      { name: "cause", type: "unknown" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "target", type: "string" },
          { name: "cause", type: "unknown" }
        ],
        returnType: `${className}ConnectionError`,
        body: `return new ${className}ConnectionError({
  message: \`Failed to connect to \${target}\`,
  target,
  cause
})`
      }
    ],
    jsdoc: `Error thrown when connection to external service fails`
  })
}

/**
 * Generates a standard TimeoutError class
 */
export function createTimeoutError(className: string) {
  return createTaggedErrorClass({
    className: `${className}TimeoutError`,
    tagName: `${className}TimeoutError`,
    fields: [
      { name: "message", type: "string" },
      { name: "operation", type: "string" },
      { name: "timeoutMs", type: "number" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "operation", type: "string" },
          { name: "timeoutMs", type: "number" }
        ],
        returnType: `${className}TimeoutError`,
        body: `return new ${className}TimeoutError({
  message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
  operation,
  timeoutMs
})`
      }
    ],
    jsdoc: `Error thrown when an operation times out`
  })
}

/**
 * Generates a standard ConfigError class
 */
export function createConfigError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConfigError`,
    tagName: `${className}ConfigError`,
    fields: [
      { name: "message", type: "string" },
      { name: "configKey", type: "string", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "message", type: "string" },
          { name: "configKey", type: "string", optional: true }
        ],
        returnType: `${className}ConfigError`,
        body: `return new ${className}ConfigError({
  message,
  ...(configKey !== undefined && { configKey })
})`
      }
    ],
    jsdoc: `Error thrown when configuration is invalid or missing`
  })
}

/**
 * Generates a standard InternalError class
 */
export function createInternalError(className: string) {
  return createTaggedErrorClass({
    className: `${className}InternalError`,
    tagName: `${className}InternalError`,
    fields: [
      { name: "message", type: "string" },
      { name: "cause", type: "unknown", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "message", type: "string" },
          { name: "cause", type: "unknown", optional: true }
        ],
        returnType: `${className}InternalError`,
        body: `return new ${className}InternalError({
  message,
  ...(cause !== undefined && { cause })
})`
      }
    ],
    jsdoc: `Error thrown when an unexpected internal error occurs`
  })
}

// ============================================================================
// Pagination & Query Type Templates
// ============================================================================

/**
 * Pagination options configuration
 */
export interface PaginationOptionsConfig {
  /**
   * Include offset-based pagination (skip/limit)
   * @default true
   */
  readonly offsetBased?: boolean

  /**
   * Include cursor-based pagination
   * @default false
   */
  readonly cursorBased?: boolean
}

/**
 * Adds pagination options type definitions
 */
export function addPaginationOptions(
  builder: TypeScriptBuilder,
  config: PaginationOptionsConfig = {}
) {
  const { cursorBased = false, offsetBased = true } = config

  if (offsetBased && !cursorBased) {
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        { name: "skip", type: "number", readonly: true, jsdoc: "Number of records to skip" },
        {
          name: "limit",
          type: "number",
          readonly: true,
          jsdoc: "Maximum number of records to return"
        }
      ],
      jsdoc: "Pagination options for queries"
    })
  } else if (cursorBased && !offsetBased) {
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        {
          name: "limit",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Maximum number of records to return"
        },
        {
          name: "cursor",
          type: "string",
          readonly: true,
          optional: true,
          jsdoc: "Cursor for pagination"
        }
      ],
      jsdoc: "Pagination options for queries (cursor-based)"
    })
  } else if (offsetBased && cursorBased) {
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        {
          name: "skip",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Number of records to skip (offset-based)"
        },
        {
          name: "limit",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Maximum number of records to return"
        },
        {
          name: "cursor",
          type: "string",
          readonly: true,
          optional: true,
          jsdoc: "Cursor for pagination (cursor-based)"
        }
      ],
      jsdoc: "Pagination options for queries (offset or cursor-based)"
    })
  }
}

/**
 * Paginated response configuration
 */
export interface PaginatedResponseConfig {
  readonly itemsFieldName?: "items" | "data"
  readonly includeHasMore?: boolean
  readonly includeNextCursor?: boolean
}

/**
 * Adds paginated response type definition
 */
export function addPaginatedResponse(
  builder: TypeScriptBuilder,
  config: PaginatedResponseConfig = {}
) {
  const { includeHasMore = true, includeNextCursor = false, itemsFieldName = "items" } = config

  const properties: Array<{
    name: string
    type: string
    readonly: boolean
    optional?: boolean
    jsdoc: string
  }> = [
    {
      name: itemsFieldName,
      type: "readonly T[]",
      readonly: true,
      jsdoc: "Array of items/records"
    },
    { name: "total", type: "number", readonly: true, jsdoc: "Total number of records available" }
  ]

  if (!(includeHasMore || includeNextCursor)) {
    properties.push(
      { name: "skip", type: "number", readonly: true, jsdoc: "Number of records skipped" },
      {
        name: "limit",
        type: "number",
        readonly: true,
        jsdoc: "Maximum number of records returned"
      }
    )
  }

  if (includeHasMore) {
    properties.push({
      name: "hasMore",
      type: "boolean",
      readonly: true,
      jsdoc: "Whether more records are available"
    })
  }

  if (includeNextCursor) {
    properties.push({
      name: "nextCursor",
      type: "string",
      readonly: true,
      optional: true,
      jsdoc: "Cursor for fetching next page"
    })
  }

  builder.addJSDoc("Paginated response wrapper")
  builder.addRaw(`export interface PaginatedResponse<T> {`)
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    if (!prop) continue

    if (prop.jsdoc) {
      builder.addRaw(`  /**`)
      builder.addRaw(`   * ${prop.jsdoc}`)
      builder.addRaw(`   */`)
    }
    const readonlyModifier = prop.readonly ? "readonly " : ""
    const optionalModifier = prop.optional ? "?" : ""

    // No semicolon at end of interface properties (dprint/ESLint requirement)
    builder.addRaw(`  ${readonlyModifier}${prop.name}${optionalModifier}: ${prop.type}`)
  }
  builder.addRaw(`}`)
}

/**
 * Adds both pagination types (options + response)
 */
export function addPaginationTypes(
  builder: TypeScriptBuilder,
  config: PaginationOptionsConfig & PaginatedResponseConfig = {}
) {
  addPaginationOptions(builder, config)
  builder.addBlankLine()
  addPaginatedResponse(builder, config)
}

/**
 * Adds SortDirection type alias
 */
export function addSortDirection(builder: TypeScriptBuilder) {
  builder.addRaw(`export type SortDirection = "asc" | "desc"`)
}

/**
 * Sort interface configuration
 */
export interface SortInterfaceConfig {
  readonly className: string
  readonly includeDirection?: boolean
}

/**
 * Adds sort interface for a specific entity
 */
export function addSortInterface(builder: TypeScriptBuilder, config: SortInterfaceConfig) {
  const { className, includeDirection = true } = config

  const properties = [{ name: "field", type: "string", readonly: true, jsdoc: "Field to sort by" }]

  if (includeDirection) {
    properties.push({
      name: "direction",
      type: "SortDirection",
      readonly: true,
      jsdoc: "Sort direction"
    })
  }

  builder.addInterface({
    name: `${className}Sort`,
    exported: true,
    properties,
    jsdoc: `Sort options for ${className} queries`
  })
}

/**
 * Filter interface configuration
 */
export interface FilterInterfaceConfig {
  readonly className: string
  readonly includeSearch?: boolean
  readonly dynamic?: boolean
}

/**
 * Adds filter interface for a specific entity
 */
export function addFilterInterface(builder: TypeScriptBuilder, config: FilterInterfaceConfig) {
  const { className, dynamic = false, includeSearch = true } = config

  const properties = []

  if (includeSearch) {
    properties.push({
      name: "search",
      type: "string",
      readonly: true,
      optional: true,
      jsdoc: "Search term for filtering"
    })
  }

  const jsdoc = `Filter options for ${className} queries`

  if (dynamic) {
    builder.addRaw(`/**
 * ${jsdoc}
 */
export interface ${className}Filter {
${properties.map((f) => `  readonly ${f.name}?: ${f.type}`).join("\n")}
  readonly [key: string]: unknown
}`)
  } else {
    builder.addInterface({ name: `${className}Filter`, exported: true, properties, jsdoc })
    builder.addComment("// Add domain-specific filter fields")
  }
}

/**
 * Query options configuration
 */
export interface QueryOptionsConfig {
  readonly className: string
  readonly includeSort?: boolean
  readonly includeFilter?: boolean
  readonly includePagination?: boolean
}

/**
 * Adds query options type (combines filter, sort, pagination)
 */
export function addQueryOptionsType(builder: TypeScriptBuilder, config: QueryOptionsConfig) {
  const { className, includeFilter = true, includePagination = true, includeSort = true } = config

  const fields = []

  if (includeFilter) fields.push({ name: "filter", type: `${className}Filter` })
  if (includeSort) fields.push({ name: "sort", type: `${className}Sort` })
  if (includePagination) fields.push({ name: "pagination", type: "PaginationOptions" })

  builder.addRaw(`export type ${className}QueryOptions = {
${fields.map((f) => `  readonly ${f.name}?: ${f.type}`).join("\n")}
}`)
}

/**
 * Adds all query-related types (sort, filter, options)
 */
export function addQueryTypes(
  builder: TypeScriptBuilder,
  config: FilterInterfaceConfig & SortInterfaceConfig & QueryOptionsConfig
) {
  addSortDirection(builder)
  builder.addBlankLine()
  addSortInterface(builder, config)
  builder.addBlankLine()
  addFilterInterface(builder, config)
  builder.addBlankLine()
  addQueryOptionsType(builder, config)
}

// ============================================================================
// Barrel Export Utilities
// ============================================================================

/**
 * Configuration for standard error exports
 */
export interface StandardErrorExportConfig {
  readonly className: string
  readonly importPath: string
  readonly unionTypeSuffix?: string
}

/**
 * Generates standard error exports for data-access layer
 *
 * CONTRACT-FIRST ARCHITECTURE:
 * - Domain errors (NotFound, Validation, etc.) come from contract library - NOT re-exported here
 * - Only infrastructure errors are exported from data-access layer
 *
 * Exports:
 * - Infrastructure errors: ConnectionError, TimeoutError, TransactionError
 */
export function generateStandardErrorExports(config: StandardErrorExportConfig) {
  const { className, importPath } = config

  // Only infrastructure errors - domain errors come from contract
  const infraErrors = [
    `${className}ConnectionError`,
    `${className}TimeoutError`,
    `${className}TransactionError`
  ]

  let output = `export { ${infraErrors.join(", ")} } from "${importPath}"\n`
  // Type exports - only data-access specific types
  output += `export type { ${className}DataAccessError, ${className}InfrastructureError } from "${importPath}"`

  return output
}

/**
 * Export section item configuration
 */
export interface ExportSectionItem {
  readonly comment?: string
  readonly exports: string
}

/**
 * Export section configuration
 */
export interface ExportSection {
  readonly title: string
  readonly items: ReadonlyArray<ExportSectionItem>
}

/**
 * Generates organized export sections with comments
 */
export function generateExportSections(
  builder: TypeScriptBuilder,
  sections: ReadonlyArray<ExportSection>
) {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    if (!section) continue

    builder.addSectionComment(section.title)
    builder.addBlankLine()

    for (let j = 0; j < section.items.length; j++) {
      const item = section.items[j]
      if (!item) continue

      if (item.comment) builder.addComment(item.comment)
      builder.addRaw(item.exports)

      // Only add blank line if not the last item in the section
      if (j < section.items.length - 1) {
        builder.addBlankLine()
      }
    }

    if (i < sections.length - 1) builder.addBlankLine()
  }
}

/**
 * Conditional export configuration
 */
export interface ConditionalExport {
  readonly condition: boolean
  readonly sectionTitle: string
  readonly exports: ReadonlyArray<ExportSectionItem>
}

/**
 * Adds conditional export sections based on feature flags
 */
export function addConditionalExports(
  builder: TypeScriptBuilder,
  exports: ReadonlyArray<ConditionalExport>
) {
  for (const item of exports) {
    if (item.condition) {
      builder.addBlankLine()
      builder.addSectionComment(item.sectionTitle)
      builder.addBlankLine()

      for (const exp of item.exports) {
        if (exp.comment) builder.addComment(exp.comment)
        builder.addRaw(exp.exports)
        builder.addBlankLine()
      }
    }
  }
}

/**
 * Platform-specific barrel export configuration
 */
export interface PlatformExportConfig {
  readonly packageName: string
  readonly exportType: "server" | "client" | "edge" | "main"
  readonly title?: string
  readonly module?: string
}

/**
 * Adds platform-specific barrel export file header
 */
export function addPlatformExportHeader(builder: TypeScriptBuilder, config: PlatformExportConfig) {
  const descriptions = {
    server:
      `Server-side exports for ${config.packageName}.\nContains service implementations, layers, and server-specific functionality.`,
    client:
      `Client-side exports for ${config.packageName}.\nContains React hooks, client-specific layers, and browser-safe functionality.`,
    edge:
      `Edge runtime exports for ${config.packageName}.\nContains edge-specific layers and functionality for edge runtime environments.`,
    main: `Main entry point for ${config.packageName}.`
  }

  builder.addFileHeader({
    title: config.title || `${config.packageName} - ${config.exportType}`,
    description: descriptions[config.exportType],
    module: config.module || config.packageName
  })
}

// ============================================================================
// Type-Only Export Templates
// ============================================================================

/**
 * Options for generating type-only export files
 */
export interface TypesOnlyExportOptions {
  libraryType: LibraryType
  className: string
  fileName: string
  packageName: string
  includeCQRS?: boolean
  includeClientServer?: boolean
  platform?: "server" | "client" | "universal"
}

/**
 * Generate types.ts file for data-access libraries
 */
export function generateDataAccessTypesOnly(options: TypesOnlyExportOptions) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { User, UserCreateInput } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Repository Types
// ============================================================================

export type * from "./lib/repository"

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types"

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors"

// ============================================================================
// Validation Types
// ============================================================================

export type * from "./lib/shared/validation"
`
}

/**
 * Generate types.ts file for feature libraries
 *
 * RPC types are always exported (prewired architecture)
 */
export function generateFeatureTypesOnly(options: TypesOnlyExportOptions) {
  const { includeClientServer, packageName, platform } = options
  const hasServer = platform === "server" || includeClientServer
  const hasClient = platform === "client" || includeClientServer

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { UserData, UserServiceInterface } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types"

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors"
${
    hasServer
      ? `
// ============================================================================
// Server Types
// ============================================================================

// Service interface types
export type * from "./lib/server/services/service"
`
      : ""
  }
// ============================================================================
// RPC Types (Always Prewired)
// ============================================================================

export type * from "./lib/rpc"
export type * from "./lib/rpc/errors"
${
    hasClient
      ? `
// ============================================================================
// Client Types
// ============================================================================

// Hook types (return values, parameters)
export type * from "./lib/client/hooks/index"

// Atom types (state shapes)
export type * from "./lib/client/atoms/index"
`
      : ""
  }
`
}

/**
 * Generate types.ts file for provider libraries
 *
 * Note: Provider libraries use flat lib/ structure:
 * - lib/service.ts: Service implementation with Context.Tag
 * - lib/types.ts: Type definitions
 * - lib/errors.ts: Error types
 * - lib/interface.ts: Service interface (for Kysely)
 */
export function generateProviderTypesOnly(options: TypesOnlyExportOptions) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { ServiceConfig } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Internals (types, errors)
// ============================================================================

// Types and errors are in lib/ directory (flat structure)
export type * from "./lib/types"
export type * from "./lib/errors"
`
}

/**
 * Generate types.ts file for infra libraries
 *
 * Note: Infra libraries use flat lib/ structure:
 * - lib/service.ts: Service implementation with Context.Tag
 * - lib/config.ts: Configuration types (optional)
 * - lib/errors.ts: Error types
 */
export function generateInfraTypesOnly(options: TypesOnlyExportOptions) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { ServiceConfig } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/errors"
`
}

/**
 * Generate types.ts file based on library type
 */
export function generateTypesOnlyFile(options: TypesOnlyExportOptions) {
  switch (options.libraryType) {
    case "data-access":
      return generateDataAccessTypesOnly(options)
    case "feature":
      return generateFeatureTypesOnly(options)
    case "provider":
      return generateProviderTypesOnly(options)
    case "infra":
      return generateInfraTypesOnly(options)
    case "contract":
      throw new Error("Contract libraries should use contract/templates/types-only.template.ts")
    default:
      throw new Error(`Unsupported library type: ${options.libraryType}`)
  }
}

/**
 * Get the file path for the types-only export file
 */
export function getTypesOnlyFilePath(projectRoot: string) {
  return `${projectRoot}/src/types.ts`
}

/**
 * Check if a library type should have a types-only export file
 */
export function shouldGenerateTypesOnly(libraryType: LibraryType) {
  return ["contract", "data-access", "feature", "infra", "provider"].includes(libraryType)
}
