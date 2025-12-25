import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import type { Effect } from "effect"

/**
 * Rpc Core
 *
 * RPC core utilities and re-exports.

This module provides:
- Re-exports from @effect/rpc for convenience
- RPC utilities for common patterns
- Type helpers for RPC definitions

Middleware is defined in middleware.ts.
Router utilities are in router.ts.
 *
 * @module @samuelho-dev/infra-rpc/core
 * @see @effect/rpc documentation
 */

// ============================================================================
// Re-exports from @effect/rpc
// ============================================================================

// Re-export core RPC primitives for convenience
export { Rpc, RpcGroup } from "@effect/rpc"

// ============================================================================
// RPC Definition Helpers
// ============================================================================

/**
 * Helper to create an RPC definition with proper typing
 *
 * This is a passthrough for Rpc.make with better DX.
 *
 * @example
 * ```typescript
 * import { defineRpc } from "@scope/infra-rpc/core";
 * import { AuthMiddleware, AuthError } from "@scope/infra-rpc/middleware";
 *
 * // Protected RPC
 * export class GetUser extends defineRpc("GetUser", {
 *   payload: GetUserRequest,
 *   success: UserResponse,
 *   failure: Schema.Union(UserError, AuthError),
 * }).middleware(AuthMiddleware) {}
 *
 * // Public RPC
 * export class HealthCheck extends defineRpc("HealthCheck", {
 *   payload: Schema.Struct({}),
 *   success: Schema.Struct({ status: Schema.String }),
 * }) {}
 * ```
 */
export const defineRpc = Rpc.make

/**
 * Helper to create an RPC group
 *
 * @example
 * ```typescript
 * import { defineRpcGroup } from "@scope/infra-rpc/core";
 *
 * export const UserRpcs = defineRpcGroup(
 *   GetUser,
 *   CreateUser,
 *   UpdateUser,
 *   DeleteUser
 * );
 * ```
 */
export const defineRpcGroup = RpcGroup.make

// ============================================================================
// Handler Creation Helpers
// ============================================================================

/**
 * Create a handler layer from an RPC group
 *
 * Type-safe wrapper around RpcGroup.toLayer.
 *
 * @example
 * ```typescript
 * import { createHandlers } from "@scope/infra-rpc/core";
 * import { UserRpcs } from "@scope/contract-user/rpc";
 * import { CurrentUser } from "@scope/infra-rpc/middleware";
 * import { UserRepository } from "@scope/data-access-user";
 *
 * export const UserHandlers = createHandlers(UserRpcs, {
 *   GetUser: ({ id }) =>
 *     Effect.gen(function*() {
 *       const user = yield* CurrentUser; // From AuthMiddleware
 *       const repo = yield* UserRepository;
 *       return yield* repo.findById(id);
 *     }),
 *
 *   CreateUser: (input) =>
 *     Effect.gen(function*() {
 *       const user = yield* CurrentUser;
 *       const repo = yield* UserRepository;
 *       return yield* repo.create({ ...input, createdBy: user.id });
 *     }),
 * });
 * ```
 */
/**
 * Create handlers for an RPC group
 *
 * Note: This is a simple identity function that helps with type inference.
 * Use directly with your handler implementations.
 */
export const createHandlers = <T extends Record<string, unknown>>(handlers: T): T => handlers

/**
 * Type helper for RPC handler function
 */
export type RpcHandler<Payload, Success, Failure, Deps> = (
  payload: Payload
) => Effect.Effect<Success, Failure, Deps>

/**
 * Type helper to extract handler requirements from an RPC group
 *
 * Note: For simpler handler typing, use RpcGroup.toLayer directly
 * which provides full type inference.
 */
export type HandlersFor<G> =
  G extends RpcGroup.RpcGroup<infer Rpcs>
    ? {
        [K in keyof Rpcs]: Rpcs[K] extends Rpc.Rpc<infer _Tag, infer Payload, infer Success, infer Failure>
          ? (payload: Schema.Schema.Type<Payload>) => Effect.Effect<Schema.Schema.Type<Success>, Schema.Schema.Type<Failure>>
          : never
      }
    : never

// ============================================================================
// Schema Helpers
// ============================================================================

/**
 * Create a paginated response schema
 *
 * @example
 * ```typescript
 * const UsersPage = paginatedResponse(UserSchema);
 * // { items: User[], total: number, page: number, pageSize: number }
 * ```
 */
export const paginatedResponse = <T extends Schema.Schema.Any>(itemSchema: T) =>
  Schema.Struct({
    items: Schema.Array(itemSchema),
    total: Schema.Number,
    page: Schema.Number,
    pageSize: Schema.Number
  })

/**
 * Create pagination request fields
 *
 * @example
 * ```typescript
 * const ListUsersRequest = Schema.Struct({
 *   ...paginationRequest,
 *   filter: Schema.optional(Schema.String)
 * });
 * ```
 */
export const paginationRequest = {
  page: Schema.optionalWith(Schema.Number, { default: () => 1 }),
  pageSize: Schema.optionalWith(Schema.Number, { default: () => 20 })
}

/**
 * Standard ID request schema
 */
export const IdRequest = Schema.Struct({
  id: Schema.String
})

/**
 * Standard success response (for mutations without return value)
 */
export const SuccessResponse = Schema.Struct({
  success: Schema.Literal(true)
})

/**
 * Standard empty request (for operations with no input)
 */
export const EmptyRequest = Schema.Struct({})

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Domain Error Pattern
 *
 * Use Schema.TaggedError directly to create domain errors for RPC:
 *
 * @example
 * ```typescript
 * // Define a domain error
 * export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
 *   "UserNotFoundError",
 *   { userId: Schema.String }
 * ) {}
 *
 * // Use in RPC definition
 * export class GetUser extends defineRpc("GetUser", {
 *   payload: GetUserRequest,
 *   success: UserResponse,
 *   failure: Schema.Union(UserNotFoundError, AuthError),
 * }).middleware(AuthMiddleware) {}
 * ```
 */
// Schema.TaggedError is re-exported from effect/Schema for convenience
