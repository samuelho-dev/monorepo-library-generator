/**
 * User Contract Library
 *
 * Domain interfaces, ports, entities, errors, and events for User.

This library defines the contract between layers:
- Entities: Domain models with runtime validation
- Errors: Domain and repository errors
- Ports: Repository and service interfaces
- Events: Domain events for event-driven architecture
- RPC: Request/Response schemas for network boundaries
 *
 */
// ============================================================================
// Core Exports
// ============================================================================

// Errors
export {
  UserNotFoundError,
  UserValidationError,
  UserAlreadyExistsError,
  UserPermissionError,
  UserNotFoundRepositoryError,
  UserValidationRepositoryError,
  UserConflictRepositoryError,
  UserDatabaseRepositoryError,
  type UserDomainError,
  type UserRepositoryError,
  type UserError
} from "./lib/errors"

// Entity types re-exported from @samuelho-dev/types-database
export type {
  UserTable,
  User,
  UserSelect,
  UserInsert,
  UserUpdate,
  DB,
  Json
} from "@samuelho-dev/types-database"

// Ports (Repository and Service interfaces)
export {
  UserRepository,
  UserService,
  type UserFilters,
  type OffsetPaginationParams,
  type SortOptions,
  type PaginatedResult
} from "./lib/ports"

// Events
export {
  EventMetadata,
  AggregateMetadata,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  type UserDomainEvent
} from "./lib/events"

// ============================================================================
// RPC Exports (Contract-First - Always Prewired)
// ============================================================================

// RPC Errors (Schema.TaggedError for network serialization)
export {
  UserNotFoundRpcError,
  UserValidationRpcError,
  UserPermissionRpcError,
  UserRpcError
} from "./lib/rpc-errors"

// RPC Definitions (Rpc.make with RouteTag)
export {
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
  BulkGetUsers
} from "./lib/rpc-definitions"

// RPC Group (RpcGroup.make composition)
export {
  UserRpcs,
  type UserRpcDefinitions,
  getRouteType,
  isProtectedRoute,
  isServiceRoute,
  isPublicRoute,
  UserRpcsByRoute
} from "./lib/rpc-group"

// ============================================================================
// Sub-Module Namespace Exports (Hybrid DDD Pattern)
// ============================================================================

// Sub-modules are imported as namespaces to preserve module boundaries
// Import specific items: import { Authentication } from "@scope/contract-name"
// Then use: Authentication.AuthenticationNotFoundError


// ============================================================================
// Sub-Module Namespace Exports (Hybrid DDD Pattern)
// ============================================================================

import * as AuthenticationModule from "./authentication"
import * as ProfileModule from "./profile"

export { AuthenticationModule as Authentication }
export { ProfileModule as Profile }
