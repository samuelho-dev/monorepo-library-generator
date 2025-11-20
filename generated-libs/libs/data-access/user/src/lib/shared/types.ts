/**
 * User Shared Type Definitions
 *
 * Common types used across the data-access layer for User operations.
Provides shared domain types, filters, and query options.

TODO: Customize this file:
1. Define domain-specific types (entity, DTOs, etc.)
2. Create filter and search interfaces
3. Define query options and sort criteria
4. Add type-safe builder patterns if needed
 *
 * @module @custom-repo/data-access-user/server
 */

// ============================================================================
// Core Entity Types
// ============================================================================


/**
 * User Entity
 *
 * TODO: Replace with actual entity type/interface
 * Should include:
 * - id: unique identifier
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - domain-specific properties
 *
 * @example
 * ```typescript
 * interface Product {
 *   id: string;
 *   name: string;
 *   price: number;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 * ```
 */
export interface User {
  readonly id: string;
  // TODO: Add entity properties
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * User Creation Input
 *
 * DTO for creating new User entities.
 * Omits auto-generated fields (id, createdAt, updatedAt).
 *
 * TODO: Replace with actual creation input type
 * Should include domain-specific properties but exclude:
 * - id (auto-generated)
 * - createdAt (auto-generated)
 * - updatedAt (auto-generated)
 *
 * @example
 * ```typescript
 * interface CreateProductInput {
 *   name: string;
 *   price: number;
 * }
 * ```
 */
export type UserCreateInput = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * User Update Input
 *
 * DTO for updating existing User entities.
 * All properties are optional for partial updates.
 *
 * TODO: Replace with actual update input type
 * Can include any subset of entity properties.
 *
 * @example
 * ```typescript
 * interface UpdateProductInput {
 *   name?: string;
 *   price?: number;
 * }
 * ```
 */
export type UserUpdateInput = Partial<
  Omit<User, 'id' | 'createdAt' | 'updatedAt'>
>;

// ============================================================================
// Filter & Query Types
// ============================================================================


/**
 * User Filter Options
 *
 * TODO: Add domain-specific filter properties
 * Examples:
 * - status?: 'active' | 'inactive'
 * - search?: string
 * - createdAfter?: Date
 * - categories?: string[]
 *
 * @example
 * ```typescript
 * interface ProductFilter {
 *   status?: 'active' | 'inactive';
 *   minPrice?: number;
 *   maxPrice?: number;
 *   categoryId?: string;
 * }
 * ```
 */
export interface UserFilter {
  // TODO: Add filter properties
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
  readonly skip: number;
  /**
   * Maximum number of records to return
   */
  readonly limit: number;
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
   * Number of records skipped
   */
  readonly skip: number;
  /**
   * Maximum number of records returned
   */
  readonly limit: number;
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
