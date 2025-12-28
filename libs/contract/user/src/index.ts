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

// Entity types re-exported from @samuelho-dev/types-database
export type {
  DB,
  Json,
  User,
  UserInsert,
  UserSelect,
  UserTable,
  UserUpdate
} from '@samuelho-dev/types-database'
// Errors
export {
  UserAlreadyExistsError,
  UserConflictRepositoryError,
  UserDatabaseRepositoryError,
  type UserDomainError,
  type UserError,
  UserNotFoundError,
  UserNotFoundRepositoryError,
  UserPermissionError,
  type UserRepositoryError,
  UserValidationError,
  UserValidationRepositoryError
} from './lib/errors'
// Events
export {
  createAggregateMetadata,
  createEventMetadata,
  EventMetadata,
  UserAggregateMetadata,
  UserCreatedEvent,
  UserDeletedEvent,
  type UserEvent,
  UserEventSchema,
  UserUpdatedEvent
} from './lib/events'
// Ports (Repository and Service interfaces)
export {
  type OffsetPaginationParams,
  type PaginatedResult,
  type SortOptions,
  type UserFilters,
  UserRepository,
  UserService
} from './lib/ports'

// ============================================================================
// RPC Exports (Contract-First - Always Prewired)
// ============================================================================

// RPC Definitions (Rpc.make with RouteTag)
export {
  BulkGetUserInput,
  BulkGetUsers,
  CreateUser,
  CreateUserInput,
  DeleteUser,
  GetUser,
  ListUsers,
  PaginatedResponse,
  PaginationParams,
  RouteTag,
  type RouteType,
  UpdateUser,
  UpdateUserInput,
  type UserEntity,
  UserId,
  UserSchema,
  ValidateUser,
  ValidateUserInput,
  ValidationResponse
} from './lib/rpc-definitions'
// RPC Errors (Schema.TaggedError for network serialization)
export {
  UserNotFoundRpcError,
  UserPermissionRpcError,
  UserRpcError,
  UserValidationRpcError
} from './lib/rpc-errors'

// RPC Group (RpcGroup.make composition)
export {
  getRouteType,
  isProtectedRoute,
  isPublicRoute,
  isServiceRoute,
  type UserRpcDefinitions,
  UserRpcs,
  UserRpcsByRoute
} from './lib/rpc-group'

// ============================================================================
// Sub-Module Namespace Exports (Hybrid DDD Pattern)
// ============================================================================

// Sub-modules are imported as namespaces to preserve module boundaries
// Import specific items: import { Authentication } from "@scope/contract-name"
// Then use: Authentication.AuthenticationNotFoundError
