import { RpcGroup } from "@effect/rpc"
import { BulkGetUsers, CreateUser, DeleteUser, GetUser, ListUsers, RouteTag, UpdateUser, ValidateUser } from "./rpc-definitions"
import type { RouteType } from "./rpc-definitions"

/**
 * User RPC Group
 *
 * Unified RPC group combining all User operations.
 * This is the primary export for handler registration.
 *
 * Usage in feature handlers:
 * ```typescript
 * import { UserRpcs } from "@samuelho-dev/contract-user";
 * import { UserService } from "./service";
 *
 * export const UserHandlers = UserRpcs.toLayer({
 *   GetUser: (input) => Effect.flatMap(UserService, s => s.get(input.id)),
 *   ListUsers: (input) => Effect.flatMap(UserService, s => s.list(input)),
 *   CreateUser: (input) => Effect.flatMap(UserService, s => s.create(input)),
 *   UpdateUser: (input) => Effect.flatMap(UserService, s => s.update(input.id, input.data)),
 *   DeleteUser: (input) => Effect.flatMap(UserService, s => s.delete(input.id)),
 *   ValidateUser: (input) => Effect.flatMap(UserService, s => s.validate(input)),
 *   BulkGetUsers: (input) => Effect.flatMap(UserService, s => s.bulkGet(input.ids)),
 * })
 * ```
 *
 * @module @samuelho-dev/contract-user/rpc-group
 */

// ============================================================================
// RPC Definition Imports
// ============================================================================
// ============================================================================
// Re-export Route System
// ============================================================================
// biome-ignore lint/performance/noBarrelFile: Contract-First Architecture requires re-exporting route system
export { RouteTag, type RouteType } from "./rpc-definitions"
// ============================================================================
// RPC Group Composition
// ============================================================================
/**
 * User RPC Group
 *
 * Combines all User RPC definitions into a single group.
 * Use `.toLayer()` to create handlers with type-safe implementation.
 *
 * @example
 * ```typescript
 * // Full handler implementation
 * const handlers = UserRpcs.toLayer({
 *   GetUser: (input) => service.get(input.id),
 *   ListUsers: (input) => service.list(input),
 *   // ... other handlers
 * })
 *
 * // Merge with router
 * const app = RouterBuilder.make(UserRpcs).handle(handlers)
 * ```
 */
export const UserRpcs = RpcGroup.make(BulkGetUsers, CreateUser, DeleteUser, GetUser, ListUsers, UpdateUser, ValidateUser)
// ============================================================================
// Type Exports
// ============================================================================
/**
 * Type of the User RPC group
 */
export type UserRpcs = typeof UserRpcs

/**
 * All User RPC definition types (for handler typing)
 */
export type UserRpcDefinitions = {
  GetUser: typeof GetUser
  ListUsers: typeof ListUsers
  CreateUser: typeof CreateUser
  UpdateUser: typeof UpdateUser
  DeleteUser: typeof DeleteUser
  ValidateUser: typeof ValidateUser
  BulkGetUsers: typeof BulkGetUsers
}
// ============================================================================
// Re-export Individual RPCs
// ============================================================================
export {
  GetUser,
  ListUsers,
  CreateUser,
  UpdateUser,
  DeleteUser,
  ValidateUser,
  BulkGetUsers
} from "./rpc-definitions"
// ============================================================================
// Route Helpers
// ============================================================================
/**
 * Get route type for an RPC definition
 *
 * @example
 * ```typescript
 * const routeType = getRouteType(GetUser) // "public"
 * ```
 */
export function getRouteType<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag]
}

/**
 * Check if an RPC requires user authentication
 */
export function isProtectedRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "protected"
}

/**
 * Check if an RPC is for service-to-service communication
 */
export function isServiceRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "service"
}

/**
 * Check if an RPC is public (no auth required)
 */
export function isPublicRoute<T extends { [RouteTag]: RouteType }>(rpc: T) {
  return rpc[RouteTag] === "public"
}

/**
 * Map of all RPCs organized by route type
 *
 * Useful for middleware configuration.
 */
export const UserRpcsByRoute = {
  public: [GetUser, ListUsers] as const,
  protected: [CreateUser, UpdateUser, DeleteUser] as const,
  service: [ValidateUser, BulkGetUsers] as const
} as const