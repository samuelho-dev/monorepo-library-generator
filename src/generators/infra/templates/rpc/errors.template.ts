/**
 * RPC Errors Template
 *
 * Generates RPC infrastructure error types.
 *
 * Error Boundaries:
 * - Schema.TaggedError: For errors that cross RPC boundaries (serializable)
 * - Data.TaggedError: For domain errors that stay within the service
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate RPC errors file
 *
 * Creates infrastructure-level errors for RPC operations.
 */
export function generateRpcErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Errors`,
    description: `RPC infrastructure errors.

These are infrastructure-level errors for RPC operations.
Feature-specific RPC errors should be defined in each feature library.

Error Boundaries:
- Schema.TaggedError: For errors that cross RPC boundaries (serializable)
- Data.TaggedError: For domain errors that stay within the service

Note: AuthError is defined in middleware.ts for co-location with AuthMiddleware.`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ["EFFECT_PATTERNS.md for error patterns"]
  })

  builder.addImports([{ from: "effect", imports: ["Schema", "Data"] }])

  builder.addSectionComment("RPC Infrastructure Errors (Schema.TaggedError)")

  builder.addRaw(`/**
 * Base RPC infrastructure error
 *
 * Use for errors that need to cross RPC boundaries.
 * This is serializable and can be sent over the wire.
 */
export class RpcInfraError extends Schema.TaggedError<RpcInfraError>()(
  "RpcInfraError",
  {
    message: Schema.String,
    code: Schema.String,
    details: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
  }
) {}

/**
 * Rate limit error
 */
export class RpcRateLimitError extends Schema.TaggedError<RpcRateLimitError>()(
  "RpcRateLimitError",
  {
    message: Schema.String,
    retryAfter: Schema.Number // Seconds until retry allowed
  }
) {}

/**
 * Validation error for invalid request payloads
 */
export class RpcValidationError extends Schema.TaggedError<RpcValidationError>()(
  "RpcValidationError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    issues: Schema.Array(
      Schema.Struct({
        path: Schema.Array(Schema.String),
        message: Schema.String
      })
    )
  }
) {}

/**
 * Not found error
 */
export class RpcNotFoundError extends Schema.TaggedError<RpcNotFoundError>()(
  "RpcNotFoundError",
  {
    message: Schema.String,
    resource: Schema.String,
    id: Schema.optional(Schema.String)
  }
) {}

/**
 * Timeout error
 */
export class RpcTimeoutError extends Schema.TaggedError<RpcTimeoutError>()(
  "RpcTimeoutError",
  {
    message: Schema.String,
    operation: Schema.String,
    timeoutMs: Schema.Number
  }
) {}

/**
 * Forbidden/Permission error
 */
export class RpcForbiddenError extends Schema.TaggedError<RpcForbiddenError>()(
  "RpcForbiddenError",
  {
    message: Schema.String,
    operation: Schema.optional(Schema.String)
  }
) {}

/**
 * Conflict error (resource already exists)
 */
export class RpcConflictError extends Schema.TaggedError<RpcConflictError>()(
  "RpcConflictError",
  {
    message: Schema.String,
    conflictingId: Schema.optional(Schema.String)
  }
) {}

/**
 * Service error (internal service failures)
 */
export class RpcServiceError extends Schema.TaggedError<RpcServiceError>()(
  "RpcServiceError",
  {
    message: Schema.String,
    code: Schema.Literal("INTERNAL_ERROR", "SERVICE_UNAVAILABLE", "ORCHESTRATION_FAILED")
  }
) {}

/**
 * Internal error (catch-all for unexpected errors)
 */
export class RpcInternalError extends Schema.TaggedError<RpcInternalError>()(
  "RpcInternalError",
  {
    message: Schema.String
  }
) {}

/**
 * Union of all RPC infrastructure errors (excluding AuthError which is in middleware.ts)
 */
export type RpcError =
  | RpcInfraError
  | RpcRateLimitError
  | RpcValidationError
  | RpcNotFoundError
  | RpcTimeoutError
  | RpcForbiddenError
  | RpcConflictError
  | RpcServiceError
  | RpcInternalError
`)

  builder.addSectionComment("Domain-Level Errors (Data.TaggedError)")

  builder.addRaw(`/**
 * Internal infrastructure error (domain-level, non-serializable)
 *
 * Use for errors that stay within the service layer.
 * These are NOT serializable and should not cross RPC boundaries.
 * For RPC boundary errors, use RpcInternalError (Schema.TaggedError) above.
 */
export class ${className}InternalDomainError extends Data.TaggedError(
  "${className}InternalDomainError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Configuration error
 */
export class ${className}ConfigError extends Data.TaggedError(
  "${className}ConfigError"
)<{
  readonly message: string
  readonly key?: string
}> {}

/**
 * Connection error
 */
export class ${className}ConnectionError extends Data.TaggedError(
  "${className}ConnectionError"
)<{
  readonly message: string
  readonly endpoint?: string
  readonly cause?: unknown
}> {}
`)

  builder.addImports([{ from: "effect", imports: ["Effect", "Match"] }])

  builder.addSectionComment("HTTP Status Mapping")

  builder.addRaw(`/**
 * HTTP status codes mapped to RPC error tags
 *
 * Each Schema.TaggedError has an associated HTTP status.
 * This is the single source of truth for error → HTTP status mapping.
 */
export const RpcHttpStatus = {
  RpcNotFoundError: 404,
  RpcValidationError: 400,
  RpcForbiddenError: 403,
  RpcTimeoutError: 504,
  RpcConflictError: 409,
  RpcRateLimitError: 429,
  RpcServiceError: 503,
  RpcInfraError: 500,
  RpcInternalError: 500,
} as const

/**
 * Get HTTP status from RPC error
 *
 * Uses the error's _tag to determine HTTP status code.
 * All RPC errors extend Schema.TaggedError so _tag is always present.
 */
export const getHttpStatus = (error: RpcError): number =>
  RpcHttpStatus[error._tag] ?? 500
`)

  builder.addSectionComment("Error Boundary (Effect-native)")

  builder.addRaw(`/**
 * Wrap effect with RPC error boundary using Effect.catchTag
 *
 * Uses Effect-native error handling to transform domain errors
 * to RPC-serializable errors at handler boundaries.
 *
 * For custom error transformations, use Effect.catchTag directly:
 * @example
 * \`\`\`typescript
 * const handler = userService.get(id).pipe(
 *   Effect.catchTag("UserNotFoundError", (e) =>
 *     Effect.fail(new RpcNotFoundError({
 *       message: e.message,
 *       resource: "User",
 *       id: e.userId
 *     }))
 *   ),
 *   Effect.catchTag("ValidationError", (e) =>
 *     Effect.fail(new RpcValidationError({
 *       message: e.message,
 *       issues: e.issues
 *     }))
 *   )
 * );
 * \`\`\`
 *
 * For catch-all transformation to RpcInternalError:
 * @example
 * \`\`\`typescript
 * const handler = userService.get(id).pipe(
 *   Effect.catchAll(() =>
 *     Effect.fail(new RpcInternalError({ message: "An error occurred" }))
 *   )
 * );
 * \`\`\`
 */
export const withRpcErrorBoundary = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, RpcInternalError, R> =>
  effect.pipe(
    Effect.catchAll(() =>
      Effect.fail(new RpcInternalError({ message: "An unexpected error occurred" }))
    )
  )
`)

  return builder.toString()
}
