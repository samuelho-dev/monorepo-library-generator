import { UserError } from "./errors"
import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"

/**
 * User RPC Group
 *
 * RPC interface for user operations.

Uses native @effect/rpc patterns:
- Rpc.make() for RPC definitions with typed payloads
- .middleware(AuthMiddleware) for protected routes
- RpcGroup.make() to group related operations

Protected vs Public Routes:
- Protected: Uses protectedHandler in handlers.ts - requires auth
- Public: Uses publicHandler in handlers.ts - no auth required

Note: Middleware is applied at the handler level via handler factories,
not at the RPC definition level. This gives more flexibility.
 *
 */

// Import auth errors for protected routes
import { AuthError } from "@myorg/infra-auth";


// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Get request - fetch by ID
 */
export const GetUserRequest = Schema.Struct({
  id: Schema.String,
})

/**
 * Response schema for user
 */
export const UserResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateFromString,
})

/**
 * List request with pagination
 */
export const ListUserRequest = Schema.Struct({
  page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 1,
  }),
  pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 20,
  }),
})

/**
 * List response with pagination metadata
 */
export const ListUserResponse = Schema.Struct({
  items: Schema.Array(UserResponse),
  total: Schema.Number,
  page: Schema.Number,
  pageSize: Schema.Number,
})

/**
 * Create request
 */
export const CreateUserRequest = Schema.Struct({
  name: Schema.String,
})

/**
 * Update request
 */
export const UpdateUserRequest = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})

/**
 * Delete request
 */
export const DeleteUserRequest = Schema.Struct({
  id: Schema.String,
})

/**
 * Standard success response for mutations
 */
export const SuccessResponse = Schema.Struct({
  success: Schema.Literal(true),
})

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * RPC operations for user
 *
 * Each operation is defined with Rpc.make().
 * Handler factories (protectedHandler/publicHandler) determine auth.
 *
 * Error Types:
 * - Public routes: Only UserError
 * - Protected routes: Schema.Union(UserError, AuthError)
 *   (AuthError can occur if auth middleware fails)
 *
 * @example
 * ```typescript
 * // Handler for public route (no auth required)
 * GetUser: publicHandler(({ ctx, input }) =>
 *   Effect.gen(function* () {
 *     const { id } = input;
 *     // ctx.user is null for public routes
 *     return yield* fetchById(id);
 *   })
 * )
 *
 * // Handler for protected route (auth required)
 * CreateUser: protectedHandler(({ ctx, input }) =>
 *   Effect.gen(function* () {
 *     const { name } = input;
 *     const userId = ctx.user.id; // Guaranteed to exist
 *     return yield* createWithOwner(name, userId);
 *   })
 * )
 * ```
 */

/**
 * Get user by ID (Public)
 *
 * No authentication required.
 */
export class GetUser extends Rpc.make("GetUser", {
  payload: GetUserRequest,
  success: UserResponse,
  error: UserError,
}) {}

/**
 * List users with pagination (Public)
 *
 * No authentication required.
 */
export class ListUser extends Rpc.make("ListUser", {
  payload: ListUserRequest,
  success: ListUserResponse,
  error: UserError,
}) {}

/**
 * Create new user (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class CreateUser extends Rpc.make("CreateUser", {
  payload: CreateUserRequest,
  success: UserResponse,
  error: Schema.Union(UserError, AuthError),
}) {}

/**
 * Update user (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class UpdateUser extends Rpc.make("UpdateUser", {
  payload: UpdateUserRequest,
  success: UserResponse,
  error: Schema.Union(UserError, AuthError),
}) {}

/**
 * Delete user (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class DeleteUser extends Rpc.make("DeleteUser", {
  payload: DeleteUserRequest,
  success: SuccessResponse,
  error: Schema.Union(UserError, AuthError),
}) {}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * User RPC Group
 *
 * Groups all user RPC operations for registration with the router.
 *
 * @example
 * ```typescript
 * import { RpcRouter } from "@effect/rpc";
 * import { createNextHandler } from "@myorg/infra-rpc/transport";
 * import { UserRpcs } from "@myorg/feature-user/rpc";
 * import { UserHandlers } from "@myorg/feature-user/rpc/handlers";
 *
 * // Create Next.js handler
 * export const { POST } = createNextHandler({
 *   groups: [UserRpcs],
 *   handlers: UserHandlers,
 *   layers: Layer.mergeAll(
 *     AuthMiddlewareLive,
 *     UserService.Live
 *   )
 * });
 * ```
 */
export const UserRpcs = RpcGroup.make(
  GetUser,
  ListUser,
  CreateUser,
  UpdateUser,
  DeleteUser
)

// ============================================================================
// Type Exports
// ============================================================================

// Type exports for consumers
export type GetUserRequestType = typeof GetUserRequest.Type
export type UserResponseType = typeof UserResponse.Type
export type ListUserRequestType = typeof ListUserRequest.Type
export type ListUserResponseType = typeof ListUserResponse.Type
export type CreateUserRequestType = typeof CreateUserRequest.Type
export type UpdateUserRequestType = typeof UpdateUserRequest.Type
export type DeleteUserRequestType = typeof DeleteUserRequest.Type
