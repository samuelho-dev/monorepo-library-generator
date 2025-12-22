/**
 * User Shared Type Definitions
 *
 * Common types used across the data-access layer for User operations.
Re-exports entity types from contract library and provides query-specific types.
 *
 * @module @myorg/data-access-user/server
 */

// ============================================================================
// Entity Types (from Contract Library)
// ============================================================================


// Re-export entity types from contract library
export type {
  User,
  UserId,
  UserInsert as UserCreateInput,
  UserUpdate as UserUpdateInput,
} from "@myorg/contract-user";

// ============================================================================
// Filter & Query Types
// ============================================================================


/**
 * User Filter Options
 *
 * Define filterable properties for queries.
 *
 * TODO: Replace with actual filter fields based on your entity properties
 *
 * Common patterns:
 * - Equality filters: status, category, type, tag
 * - Range filters: minPrice, maxPrice, minDate, maxDate
 * - Text search: search (full-text), name (partial match), email
 * - Array filters: ids, tags, categories (multiple values)
 * - Boolean flags: isActive, isPublished, isDeleted
 * - Date ranges: createdAfter, createdBefore, updatedSince
 *
 * @example
 * ```typescript
 * export interface ProductFilter {
 *   readonly category?: string;
 *   readonly minPrice?: number;
 *   readonly maxPrice?: number;
 *   readonly inStock?: boolean;
 *   readonly tags?: readonly string[];
 *   readonly search?: string;
 *   readonly createdAfter?: Date;
 * }
 * ```
 */
export interface UserFilter {
  // TODO: Add filter properties (see JSDoc examples above)
  readonly search?: string;
}

export type SortDirection = 'asc' | 'desc';

// User Sort Options

// TODO: Add domain-specific sortable fields

// Examples: createdAt, updatedAt, name, price

export interface UserSort {
  readonly field: string; // TODO: Use union of sortable fields
  readonly direction: SortDirection;
}

// Pagination Options

// Standard pagination parameters for list queries.

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  /**
   * Number of records to skip
   */
  readonly skip: number
  /**
   * Maximum number of records to return
   */
  readonly limit: number
}


/**
 * Query Options
 *
 * Combined filter, sort, and pagination options for list queries.
 *
 * @example
 * ```typescript
 * const options: QueryOptions = {
 *   filter: { status: 'active' },
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pagination: { skip: 0, limit: 20 }
 * };
 * const results = yield* repository.findAll(options);
 * ```
 */
export interface QueryOptions {
  readonly filter?: UserFilter;
  readonly sort?: UserSort;
  readonly pagination?: PaginationOptions;
}

// ============================================================================
// Response Types
// ============================================================================


// Paginated List Response

// Standard paginated response format for list queries.

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items/records
   */
  readonly items: readonly T[];
  /**
   * Total number of records available
   */
  readonly total: number;
  /**
   * Whether more records are available
   */
  readonly hasMore: boolean;
}

// ============================================================================
// Helper Type Utilities
// ============================================================================


/**
 * Make all properties of T required
 *
 * Useful for ensuring complete entity data
 */
export type Required<T> = {
  [K in keyof T]-?: T[K];
};

/**
 * Make all properties of T readonly
 *
 * Useful for ensuring immutability
 */
export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: ReadonlyDeep<T[K]>;
};
