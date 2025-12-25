/**
 * Error Template Factory
 *
 * Factory functions for generating error classes from configuration objects.
 * Supports both Data.TaggedError and Schema.TaggedError patterns.
 *
 * @module monorepo-library-generator/generators/shared/factories/error-factory
 *
 * @example
 * ```typescript
 * import { createErrorFactory, createContractReExports } from './error-factory';
 * import { ERROR_SETS } from './presets/error-presets';
 *
 * const builder = new TypeScriptBuilder();
 *
 * // Re-export domain errors from contract
 * createContractReExports({
 *   className: 'User',
 *   scope: '@myorg',
 *   fileName: 'user',
 * })(builder);
 *
 * // Generate infrastructure errors
 * createErrorFactory({
 *   className: 'User',
 *   style: 'data',
 *   errors: ERROR_SETS.dataAccess('User'),
 *   includeUnionType: true,
 * })(builder);
 * ```
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type {
  ContractReExportConfig,
  DataFieldDef,
  ErrorDefinition,
  ErrorFactoryConfig,
  ErrorStyle,
  SchemaFieldDef
} from "./types"

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Generate Schema.TaggedError class definition
 */
function generateSchemaError(
  className: string,
  tagName: string,
  fields: ReadonlyArray<SchemaFieldDef>
) {
  // Build field definitions without trailing comma on last item
  const fieldLines = fields.map((f, i) => {
    const fieldDef = `    ${f.name}: ${f.optional ? `Schema.optional(${f.schema})` : f.schema}`
    // No trailing comma on last field
    return i < fields.length - 1 ? `${fieldDef},` : fieldDef
  })
  const fieldDefs = fieldLines.join("\n")

  return `export class ${className} extends Schema.TaggedError<${className}>()(
  "${tagName}",
  {
${fieldDefs}
  }
) {}`
}

/**
 * Generate Data.TaggedError class definition
 */
function generateDataError(
  className: string,
  tagName: string,
  fields: ReadonlyArray<DataFieldDef>,
  staticCreate?: string,
  additionalMethods?: ReadonlyArray<
    { name: string; params: ReadonlyArray<{ name: string; type: string; optional?: boolean }>; body: string }
  >
) {
  // Map fields to their string representations (without extra blank lines)
  const fieldLines: Array<string> = []
  for (const f of fields) {
    if (f.jsdoc) {
      fieldLines.push(`  /** ${f.jsdoc} */`)
    }
    fieldLines.push(`  readonly ${f.name}${f.optional ? "?" : ""}: ${f.type}`)
  }
  const fieldDefs = fieldLines.join("\n")

  // Build static methods
  const staticMethods: Array<string> = []
  if (staticCreate) {
    staticMethods.push(staticCreate)
  }
  if (additionalMethods) {
    for (const method of additionalMethods) {
      const params = method.params
        .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
        .join(", ")
      staticMethods.push(`  static ${method.name}(${params}) {
    ${method.body}
  }`)
    }
  }

  const body = staticMethods.length > 0 ? ` {\n${staticMethods.join("\n\n")}\n}` : " {}"

  return `export class ${className} extends Data.TaggedError(
  "${tagName}"
)<{
${fieldDefs}
}>${body}`
}

/**
 * Generate a single error class
 */
function generateError(
  builder: TypeScriptBuilder,
  errorDef: ErrorDefinition,
  className: string,
  style: ErrorStyle,
  includeStaticCreate: boolean
) {
  const fullClassName = `${className}${errorDef.name}`

  // Add JSDoc
  builder.addRaw(`/**
 * ${errorDef.description}
 */`)

  if (style === "schema") {
    // Schema.TaggedError style
    const fields = errorDef.schemaFields ?? []
    builder.addRaw(generateSchemaError(fullClassName, fullClassName, fields))
  } else {
    // Data.TaggedError style
    const fields = errorDef.fields ?? []
    let staticCreate: string | undefined

    if (includeStaticCreate && errorDef.staticCreate) {
      const params = errorDef.staticCreate.params
        .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
        .join(", ")

      staticCreate = `  static create(${params}) {
    ${errorDef.staticCreate.body}
  }`
    }

    // Pass additionalMethods to generateDataError
    const additionalMethods = errorDef.additionalMethods

    builder.addRaw(generateDataError(fullClassName, fullClassName, fields, staticCreate, additionalMethods))
  }

  builder.addBlankLine()
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an error factory function
 *
 * Returns a function that generates error classes when called with a TypeScriptBuilder.
 *
 * @param config - Error factory configuration
 * @returns Factory function that mutates a TypeScriptBuilder
 *
 * @example
 * ```typescript
 * const factory = createErrorFactory({
 *   className: 'User',
 *   style: 'data',
 *   errors: [
 *     ERROR_DEFINITIONS.notFound('User', 'userId'),
 *     ERROR_DEFINITIONS.validation('User'),
 *   ],
 *   includeUnionType: true,
 * });
 *
 * factory(builder);
 * ```
 */
export function createErrorFactory(config: ErrorFactoryConfig) {
  const {
    className,
    errors,
    includeStaticCreate = true,
    includeUnionType = false,
    style,
    unionTypeName
  } = config

  return (builder: TypeScriptBuilder) => {
    // Generate each error class
    for (const errorDef of errors) {
      generateError(builder, errorDef, className, style, includeStaticCreate)
    }

    // Generate union type if requested
    if (includeUnionType && errors.length > 0) {
      const errorNames = errors.map((e) => `${className}${e.name}`)
      const typeName = unionTypeName ?? `${className}Error`

      // Format union type based on number of members
      const unionType = errorNames.length >= 3
        ? `\n  | ${errorNames.join("\n  | ")}`
        : errorNames.join(" | ")

      builder.addRaw(`/**
 * Union of all ${className} error types
 *
 * Use for comprehensive error handling:
 * @example
 * \`\`\`typescript
 * Effect.catchTag("${errorNames[0]}", (err) => ...)
 * \`\`\`
 */
export type ${typeName} =${unionType}`)

      builder.addBlankLine()
    }
  }
}

/**
 * Create contract error re-exports
 *
 * Generates re-export statements for domain errors from a contract library.
 * Used by data-access and feature libraries to re-export domain errors.
 *
 * @param config - Contract re-export configuration
 * @returns Factory function that generates re-exports
 *
 * @example
 * ```typescript
 * createContractReExports({
 *   className: 'User',
 *   scope: '@myorg',
 *   fileName: 'user',
 * })(builder);
 *
 * // Generates:
 * // export {
 * //   UserNotFoundError,
 * //   UserValidationError,
 * //   UserAlreadyExistsError,
 * //   UserPermissionError,
 * // } from "@myorg/contract-user";
 * ```
 */
export function createContractReExports(config: ContractReExportConfig) {
  const { className, errorTypes, fileName, scope, typeOnly = false } = config

  // Default domain errors to re-export
  const defaultErrors = [
    `${className}NotFoundError`,
    `${className}ValidationError`,
    `${className}AlreadyExistsError`,
    `${className}PermissionError`
  ]

  const errorsToExport = errorTypes ?? defaultErrors
  const importPath = `${scope}/contract-${fileName}`

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment(`Domain Errors (Re-exported from Contract)`)

    const exportKeyword = typeOnly ? "export type" : "export"
    const exportList = errorsToExport.join(",\n  ")

    builder.addRaw(`${exportKeyword} {
  ${exportList}
} from "${importPath}"`)

    builder.addBlankLine()

    // Also export the union type
    builder.addRaw(`export type { ${className}DomainError } from "${importPath}"`)
    builder.addBlankLine()
  }
}

/**
 * Configuration for data-access contract re-exports
 */
export interface DataAccessContractReExportConfig {
  readonly className: string
  readonly scope: string
  readonly fileName: string
}

/**
 * Create data-access specific contract re-exports
 *
 * Generates comprehensive re-export statements for all domain and repository errors
 * from the contract library. This is specific to data-access libraries which need
 * to re-export both domain errors and repository errors.
 *
 * @param config - Data-access contract re-export configuration
 * @returns Factory function that generates re-exports
 *
 * @example
 * ```typescript
 * createDataAccessContractReExports({
 *   className: 'User',
 *   scope: '@myorg',
 *   fileName: 'user',
 * })(builder);
 * ```
 */
export function createDataAccessContractReExports(config: DataAccessContractReExportConfig) {
  const { className, fileName, scope } = config
  const importPath = `${scope}/contract-${fileName}`

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Domain Errors (Re-exported from Contract)")
    builder.addComment("Contract library is the SINGLE SOURCE OF TRUTH for domain errors.")
    builder.addComment("Data-access and feature layers should import from contract.")
    builder.addBlankLine()

    builder.addRaw(`/**
 * Re-export all domain errors from contract library
 *
 * CONTRACT-FIRST: These errors are defined in ${importPath}
 * and re-exported here for convenience. The contract library is the
 * single source of truth for all domain error definitions.
 */
export {
  // Domain Errors
  ${className}NotFoundError,
  ${className}ValidationError,
  ${className}AlreadyExistsError,
  ${className}PermissionError,
  type ${className}DomainError,

  // Repository Errors
  ${className}NotFoundRepositoryError,
  ${className}ValidationRepositoryError,
  ${className}ConflictRepositoryError,
  ${className}DatabaseRepositoryError,
  type ${className}RepositoryError,

  // Combined Error Type
  type ${className}Error
} from "${importPath}"`)
    builder.addBlankLine()
  }
}

/**
 * Generate a complete error file
 *
 * Convenience function that generates a complete error file with:
 * - File header
 * - Imports
 * - Optional contract re-exports
 * - Error classes
 * - Union type
 *
 * @param config - Error factory configuration with additional options
 * @returns Complete file content
 *
 * @example
 * ```typescript
 * const content = generateErrorFile({
 *   className: 'User',
 *   fileName: 'user',
 *   scope: '@myorg',
 *   style: 'data',
 *   libraryType: 'data-access',
 *   errors: ERROR_SETS.dataAccess('User'),
 *   contractReExports: true,
 * });
 * ```
 */
export function generateErrorFile(config: {
  readonly className: string
  readonly fileName: string
  readonly scope: string
  readonly style: ErrorStyle
  readonly libraryType: "contract" | "data-access" | "feature" | "infra" | "provider"
  readonly errors: ReadonlyArray<ErrorDefinition>
  readonly contractReExports?: boolean
  readonly includeUnionType?: boolean
  readonly unionTypeName?: string
}) {
  const builder = new TypeScriptBuilder()
  const {
    className,
    contractReExports = false,
    errors,
    fileName,
    includeUnionType = true,
    libraryType,
    scope,
    style,
    unionTypeName
  } = config

  // File header
  builder.addFileHeader({
    title: `${className} ${libraryType.charAt(0).toUpperCase() + libraryType.slice(1)} Errors`,
    description: `Error types for ${className} ${libraryType} library.`,
    module: `${scope}/${libraryType}-${fileName}/errors`
  })
  builder.addBlankLine()

  // Imports
  if (style === "schema") {
    builder.addImports([{ from: "@effect/schema/Schema", imports: ["Schema"] }])
  } else {
    builder.addImports([{ from: "effect", imports: ["Data"] }])
  }
  builder.addBlankLine()

  // Contract re-exports (if applicable)
  if (contractReExports && libraryType !== "contract") {
    createContractReExports({ className, scope, fileName })(builder)
  }

  // Generate errors
  createErrorFactory({
    className,
    style,
    errors,
    includeUnionType,
    unionTypeName
  })(builder)

  return builder.toString()
}

// ============================================================================
// Contract Error Factories
// ============================================================================

/**
 * Configuration for contract domain error generation
 */
export interface ContractDomainErrorConfig {
  readonly className: string
  readonly propertyName: string
}

/**
 * Create contract domain errors factory
 *
 * Generates all domain errors with full static methods for contract libraries.
 * This includes NotFoundError, ValidationError, AlreadyExistsError, and PermissionError
 * with their complete static factory methods.
 *
 * @param config - Contract domain error configuration
 * @returns Factory function that generates domain errors
 */
export function createContractDomainErrors(config: ContractDomainErrorConfig) {
  const { className, propertyName } = config

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Domain Errors (Data.TaggedError)")
    builder.addComment("Use Data.TaggedError for domain-level errors that occur in business logic.")
    builder.addComment("These errors are NOT serializable over RPC by default.")
    builder.addBlankLine()

    // NotFoundError
    builder.addRaw(`/**
 * Error thrown when ${propertyName} is not found
 */
export class ${className}NotFoundError extends Data.TaggedError(
  "${className}NotFoundError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Identifier that was not found */
  readonly ${propertyName}Id: string
}> {
  static create(${propertyName}Id: string) {
    return new ${className}NotFoundError({
      message: \`${className} not found: \${${propertyName}Id}\`,
      ${propertyName}Id
    })
  }
}`)
    builder.addBlankLine()

    // ValidationError with multiple static methods
    builder.addRaw(`/**
 * Error thrown when ${propertyName} validation fails
 */
export class ${className}ValidationError extends Data.TaggedError(
  "${className}ValidationError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Field that failed validation */
  readonly field?: string

  /** Constraint that was violated */
  readonly constraint?: string

  /** Invalid value */
  readonly value?: unknown
}> {
  static create(params: {
    message: string
    field?: string
    constraint?: string
    value?: unknown
  }) {
    return new ${className}ValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value })
    })
  }

  static fieldRequired(field: string) {
    return new ${className}ValidationError({
      message: \`\${field} is required\`,
      field,
      constraint: "required"
    })
  }

  static fieldInvalid(field: string, constraint: string, value?: unknown) {
    return new ${className}ValidationError({
      message: \`\${field} is invalid: \${constraint}\`,
      field,
      constraint,
      ...(value !== undefined && { value })
    })
  }
}`)
    builder.addBlankLine()

    // AlreadyExistsError
    builder.addRaw(`/**
 * Error thrown when ${propertyName} already exists
 */
export class ${className}AlreadyExistsError extends Data.TaggedError(
  "${className}AlreadyExistsError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Identifier of existing resource */
  readonly identifier?: string
}> {
  static create(identifier?: string) {
    return new ${className}AlreadyExistsError({
      message: identifier
        ? \`${className} already exists: \${identifier}\`
        : "${className} already exists",
      ...(identifier !== undefined && { identifier })
    })
  }
}`)
    builder.addBlankLine()

    // PermissionError (with conditional userId field based on entity type)
    const hasUserId = propertyName !== "user"
    const userIdField = hasUserId ? `\n\n  /** User who attempted the operation */\n  readonly userId?: string` : ""
    const userIdParam = hasUserId ? `\n    userId?: string` : ""
    const userIdSpread = hasUserId ? `,\n    ...(params.userId !== undefined && { userId: params.userId })` : ""

    builder.addRaw(`/**
 * Error thrown when ${propertyName} operation is not permitted
 */
export class ${className}PermissionError extends Data.TaggedError(
  "${className}PermissionError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Operation that was denied */
  readonly operation: string

  /** Resource identifier */
  readonly ${propertyName}Id: string${userIdField}
}> {
  static create(params: {
    operation: string
    ${propertyName}Id: string${userIdParam}
  }) {
    return new ${className}PermissionError({
      message: \`Operation '\${params.operation}' not permitted on ${propertyName} \${params.${propertyName}Id}\`,
      operation: params.operation,
      ${propertyName}Id: params.${propertyName}Id${userIdSpread}
    })
  }
}`)
    builder.addBlankLine()

    // Domain error union type
    builder.addRaw(`/**
 * Union of all domain errors
 */
export type ${className}DomainError =
  | ${className}NotFoundError
  | ${className}ValidationError
  | ${className}AlreadyExistsError
  | ${className}PermissionError`)
    builder.addBlankLine()
  }
}

/**
 * Create contract repository errors factory
 *
 * Generates all repository errors for contract libraries.
 * This includes NotFoundRepositoryError, ValidationRepositoryError,
 * ConflictRepositoryError, and DatabaseRepositoryError.
 *
 * @param config - Contract domain error configuration
 * @returns Factory function that generates repository errors
 */
export function createContractRepositoryErrors(config: ContractDomainErrorConfig) {
  const { className, propertyName } = config

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Repository Errors (Data.TaggedError)")
    builder.addComment("Repository errors use Data.TaggedError for domain-level operations.")
    builder.addComment("These errors do NOT cross RPC boundaries - use rpc.ts for network errors.")
    builder.addBlankLine()

    // NotFoundRepositoryError
    builder.addRaw(`/**
 * Repository error for ${propertyName} not found
 */
export class ${className}NotFoundRepositoryError extends Data.TaggedError(
  "${className}NotFoundRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Identifier that was not found */
  readonly ${propertyName}Id: string
}> {
  static create(${propertyName}Id: string) {
    return new ${className}NotFoundRepositoryError({
      message: \`${className} not found: \${${propertyName}Id}\`,
      ${propertyName}Id
    })
  }
}`)
    builder.addBlankLine()

    // ValidationRepositoryError
    builder.addRaw(`/**
 * Repository error for ${propertyName} validation failures
 */
export class ${className}ValidationRepositoryError extends Data.TaggedError(
  "${className}ValidationRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Field that failed validation */
  readonly field?: string

  /** Constraint that was violated */
  readonly constraint?: string
}> {
  static create(params: {
    message: string
    field?: string
    constraint?: string
  }) {
    return new ${className}ValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint })
    })
  }
}`)
    builder.addBlankLine()

    // ConflictRepositoryError
    builder.addRaw(`/**
 * Repository error for ${propertyName} conflicts
 */
export class ${className}ConflictRepositoryError extends Data.TaggedError(
  "${className}ConflictRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Identifier of conflicting resource */
  readonly identifier?: string
}> {
  static create(identifier?: string) {
    return new ${className}ConflictRepositoryError({
      message: identifier
        ? \`${className} already exists: \${identifier}\`
        : "${className} already exists",
      ...(identifier !== undefined && { identifier })
    })
  }
}`)
    builder.addBlankLine()

    // DatabaseRepositoryError
    builder.addRaw(`/**
 * Repository error for ${propertyName} database failures
 */
export class ${className}DatabaseRepositoryError extends Data.TaggedError(
  "${className}DatabaseRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string

  /** Database operation that failed */
  readonly operation: string

  /** Underlying database error */
  readonly cause?: string
}> {
  static create(params: {
    message: string
    operation: string
    cause?: string
  }) {
    return new ${className}DatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause })
    })
  }
}`)
    builder.addBlankLine()

    // Repository error union type
    builder.addRaw(`/**
 * Union of all repository errors
 */
export type ${className}RepositoryError =
  | ${className}NotFoundRepositoryError
  | ${className}ValidationRepositoryError
  | ${className}ConflictRepositoryError
  | ${className}DatabaseRepositoryError`)
    builder.addBlankLine()
  }
}

/**
 * Create combined contract error type factory
 *
 * Generates the combined error type that includes both domain and repository errors.
 *
 * @param className - Class name for the error type
 * @returns Factory function that generates combined error type
 */
export function createContractCombinedErrorType(className: string) {
  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Error Union Types")
    builder.addBlankLine()

    builder.addRaw(`/**
 * All possible ${className.toLowerCase()} errors
 */
export type ${className}Error = ${className}DomainError | ${className}RepositoryError`)
    builder.addBlankLine()
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all error class names from a factory config
 *
 * Useful for generating union types or export lists.
 */
export function getErrorNames(config: ErrorFactoryConfig) {
  return config.errors.map((e) => `${config.className}${e.name}`)
}

/**
 * Validate error factory configuration
 *
 * Returns validation errors if configuration is invalid.
 */
export function validateErrorFactoryConfig(config: ErrorFactoryConfig) {
  const errors: Array<{ field: string; message: string }> = []

  if (!config.className || config.className.trim() === "") {
    errors.push({ field: "className", message: "className is required" })
  }

  if (!config.style || (config.style !== "data" && config.style !== "schema")) {
    errors.push({ field: "style", message: "style must be \"data\" or \"schema\"" })
  }

  if (!config.errors || config.errors.length === 0) {
    errors.push({ field: "errors", message: "at least one error definition is required" })
  }

  for (let i = 0; i < (config.errors?.length ?? 0); i++) {
    const error = config.errors?.[i]
    if (!error) continue
    if (!error.name) {
      errors.push({ field: `errors[${i}].name`, message: "error name is required" })
    }
    if (!error.description) {
      errors.push({ field: `errors[${i}].description`, message: "error description is required" })
    }
    if (config.style === "data" && (!error.fields || error.fields.length === 0)) {
      errors.push({ field: `errors[${i}].fields`, message: "fields required for data style" })
    }
    if (config.style === "schema" && (!error.schemaFields || error.schemaFields.length === 0)) {
      errors.push({ field: `errors[${i}].schemaFields`, message: "schemaFields required for schema style" })
    }
  }

  return errors
}
