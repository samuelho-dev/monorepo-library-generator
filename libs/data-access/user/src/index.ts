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


export {
  // Domain errors (from contract)
  UserNotFoundError,
  UserValidationError,
  UserAlreadyExistsError,
  UserPermissionError,
  // Infrastructure errors
  UserConnectionError,
  UserTimeoutError,
  UserTransactionError,
} from "./lib/shared/errors";
export type { UserRepositoryError, UserDataAccessError, UserInfrastructureError } from "./lib/shared/errors";

// ============================================================================
// Domain Types (from shared/)
// ============================================================================


export type {
  User,
  UserCreateInput,
  UserUpdateInput,
  UserFilter,
  SortDirection,
  UserSort,
  PaginationOptions,
  QueryOptions,
  PaginatedResponse,
} from "./lib/shared/types";

// ============================================================================
// Validation Functions (from shared/)
// ============================================================================


export {
  validateUserCreateInput,
  validateUserUpdateInput,
  validateUserFilter,
  validateUserId,
  validatePagination,
  isUser,
  isValidUserCreateInput,
  isValidUserUpdateInput,
} from "./lib/shared/validation";

// ============================================================================
// Query Builders (from queries.ts)
// ============================================================================


export {
  buildFindAllQuery,
  buildFindByIdQuery,
  buildCountQuery,
} from "./lib/queries";

export type { UserQueryFilters, PaginationOptions as QueryPaginationOptions } from "./lib/queries";

// Repository (Effect 3.0+ Pattern: Static Members)


// Export the UserRepository Context.Tag class.

// Layers are accessed via static members:

//   - UserRepository.Live  (production)

//   - UserRepository.Test  (testing)


// MIGRATION from pre-3.0 pattern:

// OLD: import { UserRepositoryLive } from "@samuelho-dev/data-access-user";

// NEW: import { UserRepository } from "@samuelho-dev/data-access-user";

//      const layer = UserRepository.Live;


export { UserRepository } from "./lib/repository";


// ============================================================================
// Aggregate Root Export (Hybrid DDD Pattern)
// ============================================================================

export {
  UserAggregate,
  UserAggregateLive,
  UserAggregateTestLayer,
  UserAggregateLayer,
  type UserAggregateInterface,
} from "./lib/aggregate";

// ============================================================================
// Sub-Module Repository Exports
// ============================================================================

export * as Authentication from "./lib/authentication";
export * as Profile from "./lib/profile";
