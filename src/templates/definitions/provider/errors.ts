/**
 * Provider Errors Template Definition
 *
 * Declarative template for generating errors.ts in provider libraries.
 * External service provider errors using Data.TaggedError.
 *
 * @module monorepo-library-generator/templates/definitions/provider/errors
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Provider Errors Template Definition
 *
 * Generates a complete errors.ts file with:
 * - Base provider error
 * - NotFound, Validation, Conflict errors
 * - Rate limit, Authentication, Authorization errors
 * - Network, Timeout, Internal errors
 * - Error union type
 */
export const providerErrorsTemplate: TemplateDefinition = {
  id: "provider/errors",
  meta: {
    title: "{className} Provider Errors",
    description: `Provider errors for {externalService} integration using Data.TaggedError.
These errors are NOT serializable (use in internal operations).
For RPC/network boundaries, use Schema.TaggedError instead.`,
    module: "{scope}/provider-{fileName}/errors"
  },
  imports: [{ from: "effect", items: ["Data"] }],
  sections: [
    // Base Provider Error
    {
      title: "Provider Errors",
      content: {
        type: "raw",
        value: `/**
 * Base error for {className} provider
 */
export class {className}Error extends Data.TaggedError(
  "{className}Error"
)<{
  readonly message: string
  readonly cause?: unknown
}> {
  static create(message: string, cause?: unknown) {
    return new {className}Error({
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
 * Error thrown when resource is not found in external service
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
 * Error thrown when request validation fails
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
 * Error thrown when rate limit is exceeded
 */
export class {className}RateLimitError extends Data.TaggedError(
  "{className}RateLimitError"
)<{
  readonly message: string
  readonly retryAfterMs?: number
  readonly limit?: number
}> {
  static create(params?: {
    retryAfterMs?: number
    limit?: number
  }) {
    return new {className}RateLimitError({
      message: params?.retryAfterMs
        ? \`Rate limit exceeded. Retry after \${params.retryAfterMs}ms\`
        : "Rate limit exceeded",
      ...(params?.retryAfterMs !== undefined && { retryAfterMs: params.retryAfterMs }),
      ...(params?.limit !== undefined && { limit: params.limit })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when authentication fails
 */
export class {className}AuthenticationError extends Data.TaggedError(
  "{className}AuthenticationError"
)<{
  readonly message: string
  readonly reason?: string
}> {
  static create(reason?: string) {
    return new {className}AuthenticationError({
      message: reason
        ? \`Authentication failed: \${reason}\`
        : "Authentication failed",
      ...(reason !== undefined && { reason })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when authorization fails
 */
export class {className}AuthorizationError extends Data.TaggedError(
  "{className}AuthorizationError"
)<{
  readonly message: string
  readonly resource?: string
  readonly action?: string
}> {
  static create(params?: {
    resource?: string
    action?: string
  }) {
    return new {className}AuthorizationError({
      message: params?.resource
        ? \`Not authorized to \${params.action || "access"} \${params.resource}\`
        : "Not authorized",
      ...(params?.resource !== undefined && { resource: params.resource }),
      ...(params?.action !== undefined && { action: params.action })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when network request fails
 */
export class {className}NetworkError extends Data.TaggedError(
  "{className}NetworkError"
)<{
  readonly message: string
  readonly url?: string
  readonly cause?: string
}> {
  static create(params?: {
    url?: string
    cause?: string
  }) {
    return new {className}NetworkError({
      message: params?.cause
        ? \`Network request failed: \${params.cause}\`
        : "Network request failed",
      ...(params?.url !== undefined && { url: params.url }),
      ...(params?.cause !== undefined && { cause: params.cause })
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Error thrown when request times out
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
 * Error thrown for internal provider failures
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
 * Union of all {className} provider errors
 *
 * Use this type for service method signatures.
 */
export type {className}ServiceError =
  | {className}Error
  | {className}NotFoundError
  | {className}ValidationError
  | {className}RateLimitError
  | {className}AuthenticationError
  | {className}AuthorizationError
  | {className}NetworkError
  | {className}TimeoutError
  | {className}InternalError`
      }
    }
  ]
}

export default providerErrorsTemplate
