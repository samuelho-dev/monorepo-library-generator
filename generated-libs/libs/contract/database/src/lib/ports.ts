import { Context, Effect, Option } from "effect";
import type { DatabaseRepositoryError } from "./errors";
import type { DatabaseInsert, DatabaseSelect, DatabaseUpdate } from "@custom-repo/types-database";

/**
 * Database Ports (Interfaces)
 *
 * Defines repository and service interfaces for database domain.
 * These ports are implemented in the data-access layer using Effect's dependency injection.
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific query methods to the repository
 * 2. Add domain-specific filters to DatabaseFilters
 * 3. Add business logic methods to the service
 * 4. Consider adding:
 *    - Bulk operations (createMany, updateMany, deleteMany)
 *    - Domain-specific queries (findByStatus, findByOwner, etc.)
 *    - Transaction support for multi-step operations
 *    - Caching strategies
 *
 * @see https://effect.website/docs/guides/context-management for dependency injection
 * @module @custom-repo/contract-database/ports
 */


// ============================================================================
// Supporting Types
// ============================================================================


/**
 * Filter options for querying databases
 */
export interface DatabaseFilters {
  /**
   * Filter by creation date range
   */
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  /**
   * Filter by update date range
   */
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;
}

// TODO: Add domain-specific filters here

// Example filters:

// 

// /** Filter by unique slug */

// readonly slug?: string;

// 

// /** Filter by status */

// readonly status?: string | readonly string[];

// 

// /** Filter by owner */

// readonly ownerId?: string;


/**
 * Pagination parameters
 */
export interface PaginationParams {
  readonly limit: number;
  readonly offset: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  readonly field: string;
  readonly direction: "asc" | "desc";
}


/**
 * Paginated result with generic item type
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

// ============================================================================
// Repository Port
// ============================================================================


/**
 * DatabaseRepository Context Tag for dependency injection
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
 * const service = Effect.gen(function* () {
 *   const repo = yield* DatabaseRepository;
 *   const entity = yield* repo.findById("id");
 *   return entity;
 * });
 * ```
 */
export class DatabaseRepository extends Context.Tag(
  "@custom-repo/contract-database/DatabaseRepository"
)<
  DatabaseRepository,
  {
    /**
     * Find database by ID
     *
     * Returns Option<T> to represent the presence or absence of a value:
     * - Option.some(entity) when found
     * - Option.none() when not found
     */
    readonly findById: (
      id: string
    ) => Effect.Effect<
      Option.Option<DatabaseSelect>,
      DatabaseRepositoryError,
      never
    >;

    /**
     * Find all databases matching filters
     */
    readonly findAll: (
      filters?: DatabaseFilters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<DatabaseSelect>, DatabaseRepositoryError>;

    /**
     * Count databases matching filters
     */
    readonly count: (
      filters?: DatabaseFilters
    ) => Effect.Effect<number, DatabaseRepositoryError>;

    /**
     * Create a new database
     */
    readonly create: (
      input: DatabaseInsert
    ) => Effect.Effect<DatabaseSelect, DatabaseRepositoryError>;

    /**
     * Update an existing database
     */
    readonly update: (
      id: string,
      input: DatabaseUpdate
    ) => Effect.Effect<DatabaseSelect, DatabaseRepositoryError>;

    /**
     * Delete a database permanently
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, DatabaseRepositoryError>;

    /**
     * Check if database exists by ID
     */
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, DatabaseRepositoryError>;

    // TODO: Add domain-specific repository methods here
  }
>() {}

// ============================================================================
// Service Port
// ============================================================================


/**
 * DatabaseService Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * @example
 * ```typescript
 * // In tRPC router or API handler:
 * const handler = Effect.gen(function* () {
 *   const service = yield* DatabaseService;
 *   const entity = yield* service.get("id");
 *   return entity;
 * });
 * ```
 */
export class DatabaseService extends Context.Tag(
  "@custom-repo/contract-database/DatabaseService"
)<
  DatabaseService,
  {
    /**
     * Get database by ID
     */
    readonly get: (
      id: string
    ) => Effect.Effect<DatabaseSelect, DatabaseRepositoryError>;

    /**
     * List databases with filters and pagination
     */
    readonly list: (
      filters?: DatabaseFilters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<DatabaseSelect>, DatabaseRepositoryError>;

    /**
     * Create a new database
     */
    readonly create: (
      input: DatabaseInsert
    ) => Effect.Effect<DatabaseSelect, DatabaseRepositoryError>;

    /**
     * Update an existing database
     */
    readonly update: (
      id: string,
      input: DatabaseUpdate
    ) => Effect.Effect<DatabaseSelect, DatabaseRepositoryError>;

    /**
     * Delete a database
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, DatabaseRepositoryError>;

    // TODO: Add domain-specific service methods here
  }
>() {}
