/**
 * kysely - Type Definitions
 *
 * Common types used across the service
 */

/**
 * Service Metadata
 */
export interface ServiceMetadata {
  /**
   * Service name
   */
  readonly name: string;
  /**
   * Service version
   */
  readonly version: string;
  /**
   * Environment
   */
  readonly environment: "production" | "development" | "test";
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  /**
   * Maximum number of items to return
   */
  readonly limit?: number;
  /**
   * Number of items to skip
   */
  readonly offset?: number;
  /**
   * Cursor for cursor-based pagination
   */
  readonly cursor?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  /**
   * Data items
   */
  readonly data: readonly T[];
  /**
   * Total number of items
   */
  readonly total: number;
  /**
   * Whether there are more items
   */
  readonly hasMore: boolean;
  /**
   * Cursor for next page
   */
  readonly nextCursor?: string;
}

/**
 * Sort Options
 */
export interface SortOptions {
  /**
   * Field to sort by
   */
  readonly field: string;
  /**
   * Sort direction
   */
  readonly direction: "asc" | "desc";
}

/**
 * Filter Options
 */
export interface FilterOptions {
  /**
   * Dynamic filter fields
   */
  [key: string]: unknown;
}

/**
 * Query Options
 */
export interface QueryOptions {
  /**
   * Pagination options
   */
  readonly pagination?: PaginationOptions;
  /**
   * Sort options
   */
  readonly sort?: SortOptions;
  /**
   * Filter options
   */
  readonly filters?: FilterOptions;
}
