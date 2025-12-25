import { RpcConflictError, RpcForbiddenError, RpcInternalError, RpcNotFoundError, RpcValidationError } from "@samuelho-dev/infra-rpc"
import { Effect } from "effect"
import type { UserFeatureError } from "../shared/errors"

/**
 * User RPC Errors
 *
 * RPC error exports and domain-specific error boundary.

This file provides:
- RPC errors (Schema.TaggedError) from infra-rpc for serialization
- Domain errors (Data.TaggedError) from shared/errors for Effect.catchTag
- Domain-specific RPC boundary wrapper for error transformation

Error Flow:
  Domain Error (Data.TaggedError) → withUserRpcBoundary → RPC Error (Schema.TaggedError)
 *
 * @module @samuelho-dev/feature-user/rpc/errors
 * @see infra-rpc for RPC error types
 * @see shared/errors for domain errors
 */
// ============================================================================
// Import Notes
// ============================================================================
// NOTE: For RPC errors (Schema.TaggedError), import directly from @samuelho-dev/infra-rpc:
// import { RpcNotFoundError, RpcValidationError, ... } from "@samuelho-dev/infra-rpc"
//
// For domain errors (Data.TaggedError), import directly from ../shared/errors:
// import { UserNotFoundError, ... } from "../shared/errors"
// ============================================================================
// Domain-Specific RPC Boundary
// ============================================================================
/**
 * Transform User domain errors to RPC errors
 *
 * Use this at RPC handler boundaries to transform domain-specific
 * errors into serializable RPC errors with proper HTTP status codes.
 *
 * @example
 * ```typescript
 * const handler = userService.get(id).pipe(
 *   withUserRpcBoundary
 * );
 * ```
 *
 * For custom transformations, use Effect.catchTag directly:
 * @example
 * ```typescript
 * const handler = userService.get(id).pipe(
 *   Effect.catchTag("UserNotFoundError", (e) =>
 *     Effect.fail(new RpcNotFoundError({
 *       message: e.message,
 *       resource: "User",
 *       id: e.userId
 *     }))
 *   )
 * );
 * ```
 */
export const withUserRpcBoundary = <A, R>(
  effect: Effect.Effect<A, UserFeatureError, R>
) =>
  effect.pipe(
    // Domain Errors → RPC Errors
    Effect.catchTag("UserNotFoundError", (e) =>
      Effect.fail(new RpcNotFoundError({
        message: e.message,
        resource: "User"
      }))
    ),
    Effect.catchTag("UserValidationError", (e) =>
      Effect.fail(new RpcValidationError({
        message: e.message,
        issues: []
      }))
    ),
    Effect.catchTag("UserAlreadyExistsError", (e) =>
      Effect.fail(new RpcConflictError({
        message: e.message
      }))
    ),
    Effect.catchTag("UserPermissionError", (e) =>
      Effect.fail(new RpcForbiddenError({
        message: e.message
      }))
    ),
    // Repository Errors → RPC Errors
    Effect.catchTag("UserNotFoundRepositoryError", (e) =>
      Effect.fail(new RpcNotFoundError({
        message: e.message,
        resource: "User"
      }))
    ),
    Effect.catchTag("UserConflictRepositoryError", (e) =>
      Effect.fail(new RpcConflictError({
        message: e.message
      }))
    ),
    // Service/Infrastructure Errors → RPC Internal Error
    Effect.catchAll(() =>
      Effect.fail(new RpcInternalError({
        message: "An unexpected error occurred"
      }))
    )
  )