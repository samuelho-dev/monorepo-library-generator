/**
 * Infrastructure Errors Template Definition
 *
 * Declarative template for generating errors.ts in infra libraries.
 * Uses Data.TaggedError for internal service errors.
 *
 * @module monorepo-library-generator/templates/definitions/infra/errors
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Infrastructure Errors Template Definition
 *
 * Generates a complete errors.ts file with:
 * - Base error type
 * - NotFound, Validation, Conflict errors
 * - Config, Connection, Timeout errors
 * - Internal error type
 * - Error union type
 */
export const infraErrorsTemplate: TemplateDefinition = {
  id: "infra/errors",
  meta: {
    title: "{className} Service Errors",
    description: `Domain errors using Data.TaggedError for proper Effect integration.
These errors are NOT serializable (use in internal operations).
For RPC/network boundaries, use Schema.TaggedError instead.`,
    module: "{scope}/infra-{fileName}/errors"
  },
  imports: [{ from: "effect", items: ["Data"] }],
  sections: [
    // Core Service Errors
    {
      title: "Core Service Errors",
      content: {
        type: "raw",
        value: `/**
 * Base error for {className} service
 */
export class {className}BaseError extends Data.TaggedError(
  "{className}BaseError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {
  static create(message: string, cause?: unknown) {
    return new {className}BaseError({
      message,
      ...(cause !== undefined && { cause })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when resource is not found
 */
export class {className}NotFoundError extends Data.TaggedError(
  "{className}NotFoundError"
)<{
  readonly message: string
  readonly resourceId: string
  readonly resourceType: string
}> {
  static create(resourceId: string, resourceType: string) {
    return new {className}NotFoundError({
      message: \`\${resourceType} not found: \${resourceId}\`,
      resourceId,
      resourceType
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when validation fails
 */
export class {className}ValidationError extends Data.TaggedError(
  "{className}ValidationError"
)<{
  readonly message: string
  readonly field?: string
  readonly constraint?: string
}> {
  static create(params: {
    message: string
    field?: string
    constraint?: string
  }) {
    return new {className}ValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when resource conflicts (already exists)
 */
export class {className}ConflictError extends Data.TaggedError(
  "{className}ConflictError"
)<{
  readonly message: string
  readonly resourceId?: string
}> {
  static create(resourceId?: string) {
    return new {className}ConflictError({
      message: resourceId
        ? \`Resource already exists: \${resourceId}\`
        : "Resource already exists",
      ...(resourceId !== undefined && { resourceId })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when configuration is invalid
 */
export class {className}ConfigError extends Data.TaggedError(
  "{className}ConfigError"
)<{
  readonly message: string
  readonly configKey?: string
}> {
  static create(configKey?: string) {
    return new {className}ConfigError({
      message: configKey
        ? \`Invalid configuration: \${configKey}\`
        : "Invalid configuration",
      ...(configKey !== undefined && { configKey })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when connection fails
 */
export class {className}ConnectionError extends Data.TaggedError(
  "{className}ConnectionError"
)<{
  readonly message: string
  readonly cause?: string
}> {
  static create(cause?: string) {
    return new {className}ConnectionError({
      message: cause
        ? \`Connection failed: \${cause}\`
        : "Connection failed",
      ...(cause !== undefined && { cause })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when operation times out
 */
export class {className}TimeoutError extends Data.TaggedError(
  "{className}TimeoutError"
)<{
  readonly message: string
  readonly operation: string
  readonly timeoutMs?: number
}> {
  static create(params: {
    operation: string
    timeoutMs?: number
  }) {
    return new {className}TimeoutError({
      message: params.timeoutMs
        ? \`Operation '\${params.operation}' timed out after \${params.timeoutMs}ms\`
        : \`Operation '\${params.operation}' timed out\`,
      operation: params.operation,
      ...(params.timeoutMs !== undefined && { timeoutMs: params.timeoutMs })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown for internal service failures
 */
export class {className}InternalError extends Data.TaggedError(
  "{className}InternalError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {
  static create(message: string, cause?: unknown) {
    return new {className}InternalError({
      message,
      ...(cause !== undefined && { cause })
    })
  }
}`
      }
    },

    // Error Type Union
    {
      title: "Error Type Union",
      content: {
        type: "raw",
        value: `/**
 * Union of all {className} service errors
 *
 * Use this type for service method signatures.
 */
export type {className}ServiceError =
  | {className}BaseError
  | {className}NotFoundError
  | {className}ValidationError
  | {className}ConflictError
  | {className}ConfigError
  | {className}ConnectionError
  | {className}TimeoutError
  | {className}InternalError`
      }
    }
  ]
}

export default infraErrorsTemplate
