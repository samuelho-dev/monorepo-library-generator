/**
 * User Data Access Library
 *
 * Type-safe data access layer for user domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from @custom-repo/contract-user
 *
 * @module @custom-repo/data-access-user
 */

// ============================================================================
// Error Types (from shared/)
// ============================================================================


export {
  UserError,
  UserNotFoundError,
  UserValidationError,
  UserConflictError,
  UserConfigError,
  UserConnectionError,
  UserTimeoutError,
  UserInternalError,
} from "./lib/shared/errors.js";
export type { UserRepositoryError } from "./lib/shared/errors.js";

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
} from "./lib/shared/types.js";

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
} from "./lib/shared/validation.js";

// ============================================================================
// Query Builders (from queries.ts)
// ============================================================================


export {
  buildFindAllQuery,
  buildFindByIdQuery,
  buildCountQuery,
} from "./lib/queries.js";

export type { UserQueryFilters, PaginationOptions as QueryPaginationOptions } from "./lib/queries.js";

// Repository (Effect 3.0+ Pattern: Static Members)


// Export the UserRepository Context.Tag class.

// Layers are accessed via static members:

//   - UserRepository.Live  (production)

//   - UserRepository.Test  (testing)

//   - UserRepository.Dev   (development)

//   - UserRepository.Auto  (environment-based)


// MIGRATION from pre-3.0 pattern:

// OLD: import { UserRepositoryLive } from "@custom-repo/data-access-user";

// NEW: import { UserRepository } from "@custom-repo/data-access-user";

//      const layer = UserRepository.Live;


export { UserRepository } from "./lib/repository.js";
