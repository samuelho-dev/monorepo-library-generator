/**
 * effect-logger - Type Definitions
 *
 * Common types used across the service
 */

/**
 * EffectLogger Configuration
 */
export interface EffectLoggerConfig {
  readonly apiKey: string;
  readonly timeout?: number;
}

/**
 * Resource - customize based on your service
 */
export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * List Parameters
 */
export interface ListParams {
  readonly page?: number;
  readonly limit?: number;
}

/**
 * Paginated Result
 */
export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  readonly status: "healthy" | "unhealthy";
  readonly timestamp?: Date;
}

/**
 * Service Metadata
 */
export interface ServiceMetadata {
  /**
   * Service name
   */
  readonly name: string
  /**
   * Service version
   */
  readonly version: string
  /**
   * Environment
   */
  readonly environment: "production" | "development" | "test"
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  /**
   * Maximum number of items to return
   */
  readonly limit?: number
  /**
   * Number of items to skip
   */
  readonly offset?: number
  /**
   * Cursor for cursor-based pagination
   */
  readonly cursor?: string
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  /**
   * Data items
   */
  readonly data: readonly T[]
  /**
   * Total number of items
   */
  readonly total: number
  /**
   * Whether there are more items
   */
  readonly hasMore: boolean
  /**
   * Cursor for next page
   */
  readonly nextCursor?: string
}

/**
 * Sort Options
 */
export interface SortOptions {
  /**
   * Field to sort by
   */
  readonly field: string
  /**
   * Sort direction
   */
  readonly direction: "asc" | "desc"
}

/**
 * Filter Options
 */
export interface FilterOptions {
  /**
   * Dynamic filter fields
   */
  [key: string]: unknown
}

/**
 * Query Options
 */
export interface QueryOptions {
  /**
   * Pagination options
   */
  readonly pagination?: PaginationOptions
  /**
   * Sort options
   */
  readonly sort?: SortOptions
  /**
   * Filter options
   */
  readonly filters?: FilterOptions
}
