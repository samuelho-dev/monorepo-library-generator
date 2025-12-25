import type { UserSelect as User } from "@samuelho-dev/types-database"
import { Context } from "effect"
import type { Effect, Option } from "effect"
import type { UserRepositoryError } from "./errors"

/**
 * User Ports (Interfaces)
 *
 * Defines repository and service interfaces for user domain.
 * These ports are implemented in the data-access layer using Effect's dependency injection.
 *
 * @see https://effect.website/docs/guides/context-management for dependency injection
 * @module @samuelho-dev/contract-user/ports
 */

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Filter options for querying users
 */
export interface UserFilters {
  /**
   * Filter by creation date range
   */
  readonly createdAfter?: Date
  readonly createdBefore?: Date
  /**
   * Filter by update date range
   */
  readonly updatedAfter?: Date
  readonly updatedBefore?: Date
}

/**
 * Offset-based pagination parameters (for repository layer)
 */
export interface OffsetPaginationParams {
  readonly limit: number
  readonly offset: number
}
/**
 * Sort options
 */
export interface SortOptions {
  readonly field: string
  readonly direction: "asc" | "desc"
}

/**
 * Paginated result with generic item type
 */
export interface PaginatedResult<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly limit: number
  readonly offset: number
  readonly hasMore: boolean
}

// ============================================================================
// Repository Port
// ============================================================================

/**
 * UserRepository Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * WHY INLINE INTERFACE:
 * - Preserves complete type information in Context
 * - Allows TypeScript to infer method signatures correctly
 * - Avoids circular reference when interface and tag share same name
 * - Follows Effect 3.0+ best practices
 *
 * @example
 * ```typescript
 * // In service implementation:
 * const service = Effect.gen(function*() {
 *   const repo = yield* UserRepository;
 *   const entity = yield* repo.findById("id");
 *   return entity;
 * });
 * ```
 */
export class UserRepository extends Context.Tag(
  "@samuelho-dev/contract-user/UserRepository"
)<
  UserRepository,
  {
    /**
     * Find user by ID
     *
     * Returns Option<T> to represent the presence or absence of a value:
     * - Option.some(entity) when found
     * - Option.none() when not found
     */
    readonly findById: (
      id: string
    ) => Effect.Effect<
      Option.Option<User>,
      UserRepositoryError,
      never
    >

    /**
     * Find all users matching filters
     */
    readonly findAll: (
      filters?: UserFilters,
      pagination?: OffsetPaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<User>, UserRepositoryError>

    /**
     * Count users matching filters
     */
    readonly count: (
      filters?: UserFilters
    ) => Effect.Effect<number, UserRepositoryError, never>

    /**
     * Create a new user
     */
    readonly create: (
      input: Partial<User>
    ) => Effect.Effect<User, UserRepositoryError, never>

    /**
     * Update an existing user
     */
    readonly update: (
      id: string,
      input: Partial<User>
    ) => Effect.Effect<User, UserRepositoryError, never>

    /**
     * Delete a user permanently
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, UserRepositoryError, never>

    /**
     * Check if user exists by ID
     */
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, UserRepositoryError, never>
  }
>() {}
// ============================================================================
// Service Port
// ============================================================================

/**
 * UserService Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * @example
 * ```typescript
 * // In tRPC router or API handler:
 * const handler = Effect.gen(function*() {
 *   const service = yield* UserService;
 *   const entity = yield* service.get("id");
 *   return entity;
 * });
 * ```
 */
export class UserService extends Context.Tag(
  "@samuelho-dev/contract-user/UserService"
)<
  UserService,
  {
    /**
     * Get user by ID
     */
    readonly get: (
      id: string
    ) => Effect.Effect<User, UserRepositoryError, never>

    /**
     * List users with filters and pagination
     */
    readonly list: (
      filters?: UserFilters,
      pagination?: OffsetPaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<User>, UserRepositoryError, never>

    /**
     * Create a new user
     */
    readonly create: (
      input: Partial<User>
    ) => Effect.Effect<User, UserRepositoryError, never>

    /**
     * Update an existing user
     */
    readonly update: (
      id: string,
      input: Partial<User>
    ) => Effect.Effect<User, UserRepositoryError, never>

    /**
     * Delete a user
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, UserRepositoryError, never>
  }
>() {}