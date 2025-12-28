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

export type { PaginationOptions as QueryPaginationOptions, UserQueryFilters } from './lib/queries'
// ============================================================================
// Query Builders (from queries.ts)
// ============================================================================
export {
  buildCountQuery,
  buildFindAllQuery,
  buildFindByIdQuery
} from './lib/queries'
export type { UserDataAccessError, UserInfrastructureError } from './lib/shared/errors'
export { UserConnectionError, UserTimeoutError, UserTransactionError } from './lib/shared/errors'
// ============================================================================
// Domain Types (from shared/)
// ============================================================================
export type {
  PaginatedResponse,
  PaginationOptions,
  QueryOptions,
  SortDirection,
  User,
  UserCreateInput,
  UserFilter,
  UserSort,
  UserUpdateInput
} from './lib/shared/types'
// ============================================================================
// Validation Functions (from shared/)
// ============================================================================
export {
  isUser,
  isValidUserCreateInput,
  isValidUserUpdateInput,
  validatePagination,
  validateUserCreateInput,
  validateUserFilter,
  validateUserId,
  validateUserUpdateInput
} from './lib/shared/validation'

// Repository (Effect 3.0+ Pattern: Static Members)
// Export the UserRepository Context.Tag class.
// Layers are accessed via static members:
//   - UserRepository.Live  (production)
//   - UserRepository.Test  (testing)

// MIGRATION from pre-3.0 pattern:
// OLD: import { UserRepositoryLive } from "@samuelho-dev/data-access-user";
// NEW: import { UserRepository } from "@samuelho-dev/data-access-user";
//      const layer = UserRepository.Live;

export { UserRepository } from './lib/repository'
