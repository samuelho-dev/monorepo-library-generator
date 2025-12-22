/**
 * User Data Access Library
 *
 * Type-safe data access layer for user domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from @myorg/contract-user
 *
 * @module @myorg/data-access-user
 */

// ============================================================================
// Error Types (from shared/)
// ============================================================================

export type { UserRepositoryError } from "./lib/shared/errors";
export {
  UserConfigError,
  UserConflictError,
  UserConnectionError,
  UserError,
  UserInternalError,
  UserNotFoundError,
  UserTimeoutError,
  UserValidationError,
} from "./lib/shared/errors";

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
  UserUpdateInput,
} from "./lib/shared/types";

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
  validateUserUpdateInput,
} from "./lib/shared/validation";

// ============================================================================
// Query Builders (from queries.ts)
// ============================================================================

export type { PaginationOptions as QueryPaginationOptions, UserQueryFilters } from "./lib/queries";
export {
  buildCountQuery,
  buildFindAllQuery,
  buildFindByIdQuery,
} from "./lib/queries";

// Repository (Effect 3.0+ Pattern: Static Members)

// Export the UserRepository Context.Tag class.

// Layers are accessed via static members:

//   - UserRepository.Live  (production)

//   - UserRepository.Test  (testing)

// MIGRATION from pre-3.0 pattern:

// OLD: import { UserRepositoryLive } from "@myorg/data-access-user";

// NEW: import { UserRepository } from "@myorg/data-access-user";

//      const layer = UserRepository.Live;

export { UserRepository } from "./lib/repository";
