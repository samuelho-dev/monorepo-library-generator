/**
 * User RPC Module
 *
 * RPC exports for user feature library.

Contract-First Architecture:
- RPC definitions re-exported from contract library (single source of truth)
- Handlers implement the contract RPCs
- Middleware re-exported from infra-rpc

Usage:
  import { UserHandlers, UserHandlersLayer } from "@samuelho-dev/feature-user/rpc";
  import { UserRpcs, GetUser, CreateUser } from "@samuelho-dev/feature-user/rpc";
 *
 */
// ============================================================================
// Contract Re-exports (Single Source of Truth)
// ============================================================================
// Re-export all RPC definitions from contract
// This includes: Rpc classes, RpcGroup, RouteTag, errors, types
export {
  // RPC Errors
  UserNotFoundRpcError,
  UserValidationRpcError,
  UserPermissionRpcError,
  UserRpcError,
  // Definitions
  UserId,
  RouteTag,
  type RouteType,
  UserSchema,
  type UserEntity,
  PaginationParams,
  PaginatedResponse,
  CreateUserInput,
  UpdateUserInput,
  ValidateUserInput,
  ValidationResponse,
  BulkGetUserInput,
  GetUser,
  ListUsers,
  CreateUser,
  UpdateUser,
  DeleteUser,
  ValidateUser,
  BulkGetUsers,
  // Group
  UserRpcs,
  type UserRpcDefinitions,
  getRouteType,
  isProtectedRoute,
  isServiceRoute,
  isPublicRoute,
  UserRpcsByRoute
} from "@samuelho-dev/contract-user"

// ============================================================================
// Handler Exports
// ============================================================================
export {
  UserHandlers,
  AllUserHandlers,
  UserHandlersLayer
} from "./handlers"

// ============================================================================
// Middleware Re-exports (from infra-rpc)
// ============================================================================
// Re-export commonly used middleware for convenience
export {
  // User auth (protected routes)
  CurrentUser,
  AuthMiddleware,
  AuthError,
  type CurrentUserData,

  // Service auth (service routes)
  ServiceContext,
  ServiceMiddleware,
  ServiceAuthError,
  type ServiceIdentity,

  // Request metadata (all routes)
  RequestMeta,
  RequestMetaMiddleware,
  type RequestMetadata,

  // Handler context helper
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,

  // Route selection utilities (RouteTag/RouteType re-exported from contract above)
  createMiddlewareSelector,
  type MiddlewareSelectorConfig,

  // Combined layers
  AllMiddlewareTest,
  AllMiddlewareLive
} from "@samuelho-dev/infra-rpc"

// ============================================================================
// Router Exports
// ============================================================================
export {
  // Layer compositions for @effect/rpc integration
  UserProductionLayer,
  UserTestLayer
} from "./router"

// ============================================================================
// Sub-Module Handler Exports
// ============================================================================
export { AuthenticationHandlers } from "../server/services/authentication/handlers"
export { ProfileHandlers } from "../server/services/profile/handlers"