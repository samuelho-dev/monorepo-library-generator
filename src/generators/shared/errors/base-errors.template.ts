/**
 * Shared Error Template Utilities
 *
 * Common error pattern generators used by both provider and infra templates.
 * Supports both Data.TaggedError (provider) and Schema.TaggedError (infra) patterns.
 *
 * @module monorepo-library-generator/shared/errors
 */

import type { TypeScriptBuilder } from "../../../utils/code-builder"

/**
 * Error style options
 *
 * - 'data': Uses Data.TaggedError (simpler, for providers)
 * - 'schema': Uses Schema.TaggedError (serializable, for infra)
 */
export type ErrorStyle = "data" | "schema"

/**
 * Error generator configuration
 */
export interface ErrorGeneratorConfig {
  /** Class name prefix (e.g., "Cache" -> "CacheError") */
  readonly className: string
  /** Error style: 'data' for Data.TaggedError, 'schema' for Schema.TaggedError */
  readonly style?: ErrorStyle
  /** Whether to include static create() helper methods (only for 'data' style) */
  readonly includeStaticCreate?: boolean
}

/**
 * Generate Schema.TaggedError class definition
 */
function schemaError(
  className: string,
  tagName: string,
  fields: ReadonlyArray<{ name: string; schema: string; optional?: boolean }>
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
function dataError(
  className: string,
  tagName: string,
  fields: ReadonlyArray<{ name: string; type: string; optional?: boolean; jsdoc?: string }>,
  staticCreate?: string
) {
  const fieldDefs = fields
    .map((f) => {
      const docLine = f.jsdoc ? `  /** ${f.jsdoc} */\n` : ""
      return `${docLine}  readonly ${f.name}${f.optional ? "?" : ""}: ${f.type}`
    })
    .join("\n")

  const body = staticCreate ? ` {\n${staticCreate}\n}` : " {}"

  return `export class ${className} extends Data.TaggedError(
  "${tagName}"
)<{
${fieldDefs}
}>${body}`
}

/**
 * Generate base error class
 *
 * Creates the root tagged error class that all other errors extend.
 */
export function generateBaseError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Base ${className} error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}Error`, `${className}Error`, [
        { name: "message", schema: "Schema.String" },
        { name: "cause", schema: "Schema.Unknown", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(message: string, cause?: unknown) {
    return new ${className}Error({
      message,
      ...(cause !== undefined ? { cause } : {})
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}Error`,
        `${className}Error`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "cause", type: "unknown", optional: true, jsdoc: "Optional underlying cause" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate NotFoundError class
 */
export function generateNotFoundError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Resource not found error
 *
 * Raised when requested resource doesn't exist.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}NotFoundError`, `${className}NotFoundError`, [
        { name: "message", schema: "Schema.String" },
        { name: "id", schema: "Schema.String" }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(id: string) {
    return new ${className}NotFoundError({
      message: \`${className} not found: \${id}\`,
      id
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}NotFoundError`,
        `${className}NotFoundError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "id", type: "string", jsdoc: "Identifier that was not found" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate ValidationError class
 */
export function generateValidationError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Validation error
 *
 * Raised when input data fails validation.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}ValidationError`, `${className}ValidationError`, [
        { name: "message", schema: "Schema.String" },
        { name: "errors", schema: "Schema.Array(Schema.String)" }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(errors: readonly string[]) {
    return new ${className}ValidationError({
      message: "Validation failed",
      errors
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}ValidationError`,
        `${className}ValidationError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "errors", type: "readonly string[]", jsdoc: "List of validation errors" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate ConflictError class
 */
export function generateConflictError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Conflict error
 *
 * Raised when operation conflicts with existing state (e.g., duplicate).
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}ConflictError`, `${className}ConflictError`, [
        { name: "message", schema: "Schema.String" },
        { name: "conflictingId", schema: "Schema.String", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(conflictingId?: string) {
    return new ${className}ConflictError({
      message: conflictingId
        ? \`Resource already exists: \${conflictingId}\`
        : "Resource already exists",
      ...(conflictingId !== undefined ? { conflictingId } : {})
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}ConflictError`,
        `${className}ConflictError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          {
            name: "conflictingId",
            type: "string",
            optional: true,
            jsdoc: "Identifier of conflicting resource"
          }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate ConfigError class
 */
export function generateConfigError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Configuration error
 *
 * Raised when service is misconfigured.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}ConfigError`, `${className}ConfigError`, [
        { name: "message", schema: "Schema.String" },
        { name: "field", schema: "Schema.String", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(property: string, reason: string) {
    return new ${className}ConfigError({
      message: \`Invalid configuration for \${property}: \${reason}\`,
      property
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}ConfigError`,
        `${className}ConfigError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "property", type: "string", jsdoc: "Configuration property that is invalid" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate ConnectionError class
 */
export function generateConnectionError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Connection error
 *
 * Raised when connection to external service fails.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}ConnectionError`, `${className}ConnectionError`, [
        { name: "message", schema: "Schema.String" },
        { name: "endpoint", schema: "Schema.String", optional: true },
        { name: "cause", schema: "Schema.Unknown", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(target: string, cause: unknown) {
    return new ${className}ConnectionError({
      message: \`Failed to connect to \${target}\`,
      target,
      cause
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}ConnectionError`,
        `${className}ConnectionError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "target", type: "string", jsdoc: "Connection target (service name, host, etc.)" },
          { name: "cause", type: "unknown", jsdoc: "Underlying connection error" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate TimeoutError class
 */
export function generateTimeoutError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Timeout error
 *
 * Raised when operation exceeds timeout.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}TimeoutError`, `${className}TimeoutError`, [
        { name: "message", schema: "Schema.String" },
        { name: "timeoutMs", schema: "Schema.Number", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(operation: string, timeoutMs: number) {
    return new ${className}TimeoutError({
      message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
      timeoutMs,
      operation
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}TimeoutError`,
        `${className}TimeoutError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "timeoutMs", type: "number", jsdoc: "Timeout duration in milliseconds" },
          { name: "operation", type: "string", jsdoc: "Operation that timed out" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate InternalError class
 */
export function generateInternalError(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  const { className, includeStaticCreate = true, style = "data" } = config

  builder.addRaw(`/**
 * Internal error
 *
 * Raised when unexpected internal error occurs.
 */`)

  if (style === "schema") {
    builder.addRaw(
      schemaError(`${className}InternalError`, `${className}InternalError`, [
        { name: "message", schema: "Schema.String" },
        { name: "cause", schema: "Schema.Unknown", optional: true }
      ])
    )
  } else {
    const staticCreate = includeStaticCreate
      ? `  static create(reason: string, cause: unknown) {
    return new ${className}InternalError({
      message: \`Internal error: \${reason}\`,
      cause
    })
  }`
      : undefined

    builder.addRaw(
      dataError(
        `${className}InternalError`,
        `${className}InternalError`,
        [
          { name: "message", type: "string", jsdoc: "Human-readable error message" },
          { name: "cause", type: "unknown", jsdoc: "Underlying error cause" }
        ],
        staticCreate
      )
    )
  }

  builder.addBlankLine()
}

/**
 * Generate all common error types
 *
 * Convenience function to generate the standard set of errors used by both
 * provider and infra templates.
 */
export function generateCommonErrors(builder: TypeScriptBuilder, config: ErrorGeneratorConfig) {
  generateBaseError(builder, config)
  generateNotFoundError(builder, config)
  generateValidationError(builder, config)
  generateConflictError(builder, config)
  generateConfigError(builder, config)
  generateConnectionError(builder, config)
  generateTimeoutError(builder, config)
  generateInternalError(builder, config)
}

/**
 * Get list of common error class names for union type generation
 */
export function getCommonErrorNames(className: string) {
  return [
    `${className}Error`,
    `${className}NotFoundError`,
    `${className}ValidationError`,
    `${className}ConflictError`,
    `${className}ConfigError`,
    `${className}ConnectionError`,
    `${className}TimeoutError`,
    `${className}InternalError`
  ]
}

/**
 * Generate error type union
 */
export function generateErrorUnion(
  builder: TypeScriptBuilder,
  className: string,
  additionalErrors: ReadonlyArray<string> = []
) {
  const allErrors = [...getCommonErrorNames(className), ...additionalErrors]

  builder.addRaw(`/**
 * Union of all ${className} error types
 *
 * Use for comprehensive error handling:
 * @example
 * \`\`\`typescript
 * Effect.catchTag("${className}InternalError", (err) => ...)
 * Effect.catchTag("${className}TimeoutError", (err) => ...)
 * \`\`\`
 */
export type ${className}ServiceError = ${allErrors.join(" | ")}`)

  builder.addBlankLine()
}
