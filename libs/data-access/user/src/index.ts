/**
 * User Data Access Library
 *
 * Type-safe data access layer for user domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from @samuelho-dev/contract-user
 *
 * @module @samuelho-dev/data-access-user
 */
// ============================================================================
// Error Types (from shared/)
// ============================================================================
export { UserAlreadyExistsError, UserConnectionError, UserNotFoundError, UserPermissionError, UserTimeoutError, UserTransactionError, UserValidationError } from "./lib/shared/errors"
export type { UserDataAccessError, UserInfrastructureError, UserRepositoryError } from "./lib/shared/errors"

// ============================================================================
// Domain Types (from shared/)
// ============================================================================
export type {
  User,
  UserCreateInput,
  UserFilter,
  UserSort,
  UserUpdateInput
} from "./lib/shared/types"

export type {
  PaginatedResponse,
  PaginationOptions,
  QueryOptions,
  SortDirection
} from "./lib/shared/types"

// ============================================================================
// Validation Functions (from shared/)
// ============================================================================
export {
  isUser,
  isValidUserCreateInput,
  isValidUserUpdateInput,
  validateUserCreateInput,
  validateUserFilter,
  validateUserId,
  validateUserUpdateInput,
  validatePagination
} from "./lib/shared/validation"

// ============================================================================
// Query Builders (from queries.ts)
// ============================================================================
export {
  buildCountQuery,
  buildFindAllQuery,
  buildFindByIdQuery
} from "./lib/queries"

export type { UserQueryFilters } from "./lib/queries"

export type { PaginationOptions as QueryPaginationOptions } from "./lib/queries"

// Repository (Effect 3.0+ Pattern: Static Members)
// Export the UserRepository Context.Tag class.
// Layers are accessed via static members:
//   - UserRepository.Live  (production)
//   - UserRepository.Test  (testing)

// MIGRATION from pre-3.0 pattern:
// OLD: import { UserRepositoryLive } from "@samuelho-dev/data-access-user";
// NEW: import { UserRepository } from "@samuelho-dev/data-access-user";
//      const layer = UserRepository.Live;

export { UserRepository } from "./lib/repository"