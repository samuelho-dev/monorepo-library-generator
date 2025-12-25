import { Data, Effect, Schema } from "effect"

/**
 * Rpc Errors
 *
 * RPC infrastructure errors.

These are infrastructure-level errors for RPC operations.
Feature-specific RPC errors should be defined in each feature library.

Error Boundaries:
- Schema.TaggedError: For errors that cross RPC boundaries (serializable)
- Data.TaggedError: For domain errors that stay within the service

Note: AuthError is defined in middleware.ts for co-location with AuthMiddleware.
 *
 * @module @samuelho-dev/infra-rpc/errors
 * @see EFFECT_PATTERNS.md for error patterns
 */
// ============================================================================
// RPC Infrastructure Errors (Schema.TaggedError)
// ============================================================================
/**
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

// ============================================================================
// Domain-Level Errors (Data.TaggedError)
// ============================================================================
/**
 * Internal infrastructure error (domain-level, non-serializable)
 *
 * Use for errors that stay within the service layer.
 * These are NOT serializable and should not cross RPC boundaries.
 * For RPC boundary errors, use RpcInternalError (Schema.TaggedError) above.
 */
export class RpcInternalDomainError extends Data.TaggedError(
  "RpcInternalDomainError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Configuration error
 */
export class RpcConfigError extends Data.TaggedError(
  "RpcConfigError"
)<{
  readonly message: string
  readonly key?: string
}> {}

/**
 * Connection error
 */
export class RpcConnectionError extends Data.TaggedError(
  "RpcConnectionError"
)<{
  readonly message: string
  readonly endpoint?: string
  readonly cause?: unknown
}> {}

// ============================================================================
// HTTP Status Mapping
// ============================================================================
/**
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

// ============================================================================
// Error Boundary (Effect-native)
// ============================================================================
/**
 * Wrap effect with RPC error boundary using Effect.catchTag
 *
 * Uses Effect-native error handling to transform domain errors
 * to RPC-serializable errors at handler boundaries.
 *
 * For custom error transformations, use Effect.catchTag directly:
 * @example
 * ```typescript
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
 * ```
 *
 * For catch-all transformation to RpcInternalError:
 * @example
 * ```typescript
 * const handler = userService.get(id).pipe(
 *   Effect.catchAll(() =>
 *     Effect.fail(new RpcInternalError({ message: "An error occurred" }))
 *   )
 * );
 * ```
 */
export const withRpcErrorBoundary = <A, E, R>(
  effect: Effect.Effect<A, E, R>
) =>
  effect.pipe(
    Effect.catchAll(() =>
      Effect.fail(new RpcInternalError({ message: "An unexpected error occurred" }))
    )
  )
