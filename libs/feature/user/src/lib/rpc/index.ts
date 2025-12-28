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
  BulkGetUserInput,
  BulkGetUsers,
  CreateUser,
  CreateUserInput,
  DeleteUser,
  GetUser,
  getRouteType,
  isProtectedRoute,
  isPublicRoute,
  isServiceRoute,
  ListUsers,
  PaginatedResponse,
  PaginationParams,
  RouteTag,
  type RouteType,
  UpdateUser,
  UpdateUserInput,
  type UserEntity,
  // Definitions
  UserId,
  // RPC Errors
  UserNotFoundRpcError,
  UserPermissionRpcError,
  type UserRpcDefinitions,
  UserRpcError,
  // Group
  UserRpcs,
  UserRpcsByRoute,
  UserSchema,
  UserValidationRpcError,
  ValidateUser,
  ValidateUserInput,
  ValidationResponse
} from '@samuelho-dev/contract-user'
// ============================================================================
// Middleware Re-exports (from infra-rpc)
// ============================================================================
// Re-export commonly used middleware for convenience
export {
  AllMiddlewareLive,
  // Combined layers
  AllMiddlewareTest,
  AuthError,
  AuthMiddleware,
  // User auth (protected routes)
  CurrentUser,
  type CurrentUserData,
  // Route selection utilities (RouteTag/RouteType re-exported from contract above)
  createMiddlewareSelector,
  // Handler context helper
  getHandlerContext,
  getHandlerContextOptional,
  type HandlerContext,
  type MiddlewareSelectorConfig,
  // Request metadata (all routes)
  RequestMeta,
  type RequestMetadata,
  RequestMetaMiddleware,
  ServiceAuthError,
  // Service auth (service routes)
  ServiceContext,
  type ServiceIdentity,
  ServiceMiddleware
} from '@samuelho-dev/infra-rpc'
// ============================================================================
// Handler Exports
// ============================================================================
export {
  UserHandlers,
  UserHandlersLayer
} from './handlers'

// ============================================================================
// Router Exports
// ============================================================================
export {
  // Layer compositions for @effect/rpc integration
  UserProductionLayer,
  UserTestLayer
} from './router'
