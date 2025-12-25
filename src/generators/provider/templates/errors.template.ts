/**
 * Provider Generator - Errors Template
 *
 * Generates error types for provider libraries using Data.TaggedError pattern.
 * Uses the error factory pattern for consistent, maintainable error generation.
 *
 * Includes specialized error types for external service integration:
 * - API errors with status codes
 * - Connection and timeout errors
 * - Rate limiting errors
 * - Authentication errors
 * - Safe error mapping from SDK errors
 *
 * @module monorepo-library-generator/provider/templates/errors
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ProviderTemplateOptions, ProviderType } from "../../../utils/types"

/**
 * Generate provider-specific error classes based on provider type
 */
function generateProviderErrors(
  builder: TypeScriptBuilder,
  className: string,
  providerType: ProviderType
) {
  // Always generate base error
  builder.addRaw(`/**
 * Base ${className} Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class ${className}Error extends Data.TaggedError("${className}Error")<{
  readonly message: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  if (providerType === "cli") {
    // CLI-specific errors
    builder.addRaw(`/**
 * Command Error - for CLI command execution failures
 */
export class ${className}CommandError extends Data.TaggedError("${className}CommandError")<{
  readonly message: string
  readonly exitCode?: number
  readonly stderr?: string
  readonly cause?: unknown
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Command Not Found Error - when CLI command is not available
 */
export class ${className}NotFoundError extends Data.TaggedError("${className}NotFoundError")<{
  readonly message: string
  readonly command: string
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Timeout Error - for CLI command timeouts
 */
export class ${className}TimeoutError extends Data.TaggedError("${className}TimeoutError")<{
  readonly message: string
  readonly timeout: number
}> {}`)
    builder.addBlankLine()
  }

  if (providerType === "http" || providerType === "graphql") {
    // HTTP-specific errors
    builder.addRaw(`/**
 * HTTP Error - for HTTP status code errors
 */
export class ${className}HttpError extends Data.TaggedError("${className}HttpError")<{
  readonly message: string
  readonly statusCode: number
  readonly method: string
  readonly url: string
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Network Error - for connection/network failures
 */
export class ${className}NetworkError extends Data.TaggedError("${className}NetworkError")<{
  readonly message: string
  readonly cause?: unknown
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Rate Limit Error - for API rate limiting
 */
export class ${className}RateLimitError extends Data.TaggedError("${className}RateLimitError")<{
  readonly message: string
  readonly retryAfter?: number
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Timeout Error - for request timeouts
 */
export class ${className}TimeoutError extends Data.TaggedError("${className}TimeoutError")<{
  readonly message: string
  readonly timeout: number
}> {}`)
    builder.addBlankLine()
  }

  if (providerType === "graphql") {
    // GraphQL-specific errors
    builder.addRaw(`/**
 * GraphQL Error - for GraphQL operation errors
 */
export class ${className}GraphQLError extends Data.TaggedError("${className}GraphQLError")<{
  readonly message: string
  readonly errors: readonly unknown[]
}> {}`)
    builder.addBlankLine()

    builder.addRaw(`/**
 * Validation Error - for input validation failures
 */
export class ${className}ValidationError extends Data.TaggedError("${className}ValidationError")<{
  readonly message: string
  readonly field?: string
  readonly value?: unknown
}> {}`)
    builder.addBlankLine()
  }

  if (providerType === "sdk") {
    // SDK-specific errors using factory pattern
    const sdkErrors = [
      {
        name: "ApiError",
        description: "API failures",
        fields: ["statusCode?: number", "errorCode?: string", "cause?: unknown"]
      },
      {
        name: "ConnectionError",
        description: "network/connectivity failures",
        fields: ["cause?: unknown"]
      },
      {
        name: "RateLimitError",
        description: "API rate limiting",
        fields: ["retryAfter?: number", "limit?: number", "remaining?: number"]
      },
      {
        name: "ValidationError",
        description: "input validation failures",
        fields: ["field?: string", "value?: unknown"]
      },
      {
        name: "TimeoutError",
        description: "request timeouts",
        fields: ["timeout: number"]
      },
      {
        name: "AuthenticationError",
        description: "auth failures",
        fields: ["cause?: unknown"]
      },
      {
        name: "NotFoundError",
        description: "404 responses",
        fields: ["resourceId?: string", "resourceType?: string"]
      },
      {
        name: "ConflictError",
        description: "409 conflicts",
        fields: ["conflictingField?: string"]
      },
      {
        name: "ConfigError",
        description: "configuration failures",
        fields: ["configKey?: string"]
      },
      {
        name: "InternalError",
        description: "5xx server errors",
        fields: ["statusCode?: number", "cause?: unknown"]
      }
    ]

    for (const error of sdkErrors) {
      const fieldList = ["readonly message: string", ...error.fields.map((f) => `readonly ${f}`)]
      builder.addRaw(`/**
 * ${error.name.replace("Error", "")} Error - for ${error.description}
 */
export class ${className}${error.name} extends Data.TaggedError("${className}${error.name}")<{
  ${fieldList.join("\n  ")}
}> {}`)
      builder.addBlankLine()
    }
  }
}

/**
 * Generate error union type based on provider type
 */
function generateErrorUnionType(
  builder: TypeScriptBuilder,
  className: string,
  providerType: ProviderType
) {
  builder.addRaw(`/**
 * Union of all ${className} service errors
 */`)

  const errorTypes = [`${className}Error`]

  switch (providerType) {
    case "cli":
      errorTypes.push(
        `${className}CommandError`,
        `${className}NotFoundError`,
        `${className}TimeoutError`
      )
      break
    case "http":
      errorTypes.push(
        `${className}HttpError`,
        `${className}NetworkError`,
        `${className}RateLimitError`,
        `${className}TimeoutError`
      )
      break
    case "graphql":
      errorTypes.push(
        `${className}HttpError`,
        `${className}NetworkError`,
        `${className}GraphQLError`,
        `${className}ValidationError`
      )
      break
    default:
      errorTypes.push(
        `${className}ApiError`,
        `${className}AuthenticationError`,
        `${className}RateLimitError`,
        `${className}TimeoutError`,
        `${className}ConnectionError`,
        `${className}ValidationError`,
        `${className}NotFoundError`,
        `${className}ConflictError`,
        `${className}ConfigError`,
        `${className}InternalError`
      )
      break
  }

  builder.addRaw(`export type ${className}ServiceError =
  | ${errorTypes.join("\n  | ")}`)
  builder.addBlankLine()
}

/**
 * Generate error mapping function for SDK providers
 */
function generateErrorMapping(builder: TypeScriptBuilder, className: string) {
  // SDK Error Schema
  builder.addRaw(`/**
 * Schema for parsing SDK error objects
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without type guards
 */
const SdkErrorSchema = Schema.Struct({
  message: Schema.optional(Schema.String),
  statusCode: Schema.optional(Schema.Number),
  code: Schema.optional(Schema.String),
  resourceId: Schema.optional(Schema.String),
  field: Schema.optional(Schema.String),
  retryAfter: Schema.optional(Schema.Number)
})

/**
 * Parse SDK error using Schema
 */
function parseSdkError(error: unknown) {
  const result = Schema.decodeUnknownOption(SdkErrorSchema)(error)
  return Option.isSome(result) ? result.value : {}
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Error Mapping Function
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing
 */
export function map${className}Error(error: unknown) {
  const parsed = parseSdkError(error)
  const { message, statusCode, code, resourceId, field, retryAfter } = parsed

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new ${className}AuthenticationError({
      message: message ?? "Authentication failed",
      cause: error
    })
  }

  // Not found errors
  if (statusCode === 404) {
    return new ${className}NotFoundError({
      message: message ?? "Resource not found",
      ...(resourceId !== undefined ? { resourceId } : {})
    })
  }

  // Conflict errors
  if (statusCode === 409) {
    return new ${className}ConflictError({
      message: message ?? "Resource conflict",
      ...(field !== undefined ? { conflictingField: field } : {})
    })
  }

  // Rate limit errors
  if (statusCode === 429) {
    return new ${className}RateLimitError({
      message: message ?? "Rate limit exceeded",
      ...(retryAfter !== undefined ? { retryAfter } : {})
    })
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new ${className}TimeoutError({
      message: message ?? "Request timeout",
      timeout: 20000
    })
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new ${className}ConnectionError({
      message: message ?? "Connection failed",
      cause: error
    })
  }

  // Internal server errors (5xx)
  if (statusCode !== undefined && statusCode >= 500) {
    return new ${className}InternalError({
      message: message ?? "Internal server error",
      statusCode,
      cause: error
    })
  }

  // API errors (other 4xx)
  if (statusCode !== undefined && statusCode >= 400) {
    return new ${className}ApiError({
      message: message ?? "API error",
      statusCode,
      ...(code !== undefined ? { errorCode: code } : {}),
      cause: error
    })
  }

  // Generic error
  return new ${className}Error({
    message: message ?? "Unknown error",
    cause: error
  })
}`)
  builder.addBlankLine()
}

/**
 * Generate errors.ts file for provider library
 *
 * Creates Data.TaggedError-based error types and mapping functions
 * for wrapping external service errors in Effect-friendly types.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, name: projectClassName, providerType = "sdk" } = options

  // File header
  builder.addFileHeader({
    title: `${projectClassName} - Error Types`,
    description: `Error types for ${externalService} provider.

CRITICAL: Use Data.TaggedError (NOT manual classes)
Provider Type: ${providerType}`,
    module: `provider/${projectClassName.toLowerCase()}/errors`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Data", "Effect", "Option"] },
    { from: "@effect/schema", imports: ["Schema"] }
  ])
  builder.addBlankLine()

  // Generate provider-specific errors
  generateProviderErrors(builder, className, providerType)

  // Generate union type
  generateErrorUnionType(builder, className, providerType)

  // Generate error mapping (only for SDK type)
  if (providerType === "sdk") {
    generateErrorMapping(builder, className)

    // Helper function
    builder.addRaw(`/**
 * Helper: Run ${externalService} operation with error mapping
 */
export function run${className}Operation<A>(
  operation: () => Promise<A>,
) {
  return Effect.tryPromise({
    try: operation,
    catch: map${className}Error,
  })
}`)
    builder.addBlankLine()
  }

  return builder.toString()
}
