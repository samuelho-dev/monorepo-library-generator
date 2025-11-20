import { Context, Effect, Option } from "effect";
import type { ProductRepositoryError } from "./errors";
import type { ProductInsert, ProductSelect, ProductUpdate } from "@custom-repo/types-database";

/**
 * Product Ports (Interfaces)
 *
 * Defines repository and service interfaces for product domain.
 * These ports are implemented in the data-access layer using Effect's dependency injection.
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific query methods to the repository
 * 2. Add domain-specific filters to ProductFilters
 * 3. Add business logic methods to the service
 * 4. Consider adding:
 *    - Bulk operations (createMany, updateMany, deleteMany)
 *    - Domain-specific queries (findByStatus, findByOwner, etc.)
 *    - Transaction support for multi-step operations
 *    - Caching strategies
 *
 * @see https://effect.website/docs/guides/context-management for dependency injection
 * @module @custom-repo/contract-product/ports
 */


// ============================================================================
// Supporting Types
// ============================================================================


/**
 * Filter options for querying products
 */
export interface ProductFilters {
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
 * ProductRepository Context Tag for dependency injection
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
 *   const repo = yield* ProductRepository;
 *   const entity = yield* repo.findById("id");
 *   return entity;
 * });
 * ```
 */
export class ProductRepository extends Context.Tag(
  "@custom-repo/contract-product/ProductRepository"
)<
  ProductRepository,
  {
    /**
     * Find product by ID
     *
     * Returns Option<T> to represent the presence or absence of a value:
     * - Option.some(entity) when found
     * - Option.none() when not found
     */
    readonly findById: (
      id: string
    ) => Effect.Effect<
      Option.Option<ProductSelect>,
      ProductRepositoryError,
      never
    >;

    /**
     * Find all products matching filters
     */
    readonly findAll: (
      filters?: ProductFilters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<ProductSelect>, ProductRepositoryError>;

    /**
     * Count products matching filters
     */
    readonly count: (
      filters?: ProductFilters
    ) => Effect.Effect<number, ProductRepositoryError>;

    /**
     * Create a new product
     */
    readonly create: (
      input: ProductInsert
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    /**
     * Update an existing product
     */
    readonly update: (
      id: string,
      input: ProductUpdate
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    /**
     * Delete a product permanently
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ProductRepositoryError>;

    /**
     * Check if product exists by ID
     */
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, ProductRepositoryError>;

    // TODO: Add domain-specific repository methods here
  }
>() {}

// ============================================================================
// Service Port
// ============================================================================


/**
 * ProductService Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * @example
 * ```typescript
 * // In tRPC router or API handler:
 * const handler = Effect.gen(function* () {
 *   const service = yield* ProductService;
 *   const entity = yield* service.get("id");
 *   return entity;
 * });
 * ```
 */
export class ProductService extends Context.Tag(
  "@custom-repo/contract-product/ProductService"
)<
  ProductService,
  {
    /**
     * Get product by ID
     */
    readonly get: (
      id: string
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    /**
     * List products with filters and pagination
     */
    readonly list: (
      filters?: ProductFilters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<ProductSelect>, ProductRepositoryError>;

    /**
     * Create a new product
     */
    readonly create: (
      input: ProductInsert
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    /**
     * Update an existing product
     */
    readonly update: (
      id: string,
      input: ProductUpdate
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    /**
     * Delete a product
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ProductRepositoryError>;

    // TODO: Add domain-specific service methods here
  }
>() {}

// ============================================================================
// Projection Repository Port (CQRS)
// ============================================================================


/**
 * ProductProjectionRepository Context Tag for CQRS read models
 *
 * Manages projections (denormalized read models) for optimized query performance.
 * Projections are materialized views updated by event handlers.
 *
 * @example
 * ```typescript
 * const projection = Effect.gen(function* () {
 *   const repo = yield* ProductProjectionRepository;
 *   const view = yield* repo.findProjection("id");
 *   return view;
 * });
 * ```
 */
export class ProductProjectionRepository extends Context.Tag(
  "@custom-repo/contract-product/ProductProjectionRepository"
)<
  ProductProjectionRepository,
  {
    /**
     * Find projection by ID
     */
    readonly findProjection: (
      id: string
    ) => Effect.Effect<Option.Option<unknown>, ProductRepositoryError>;

    /**
     * List projections with filters
     */
    readonly listProjections: (
      filters?: Record<string, unknown>,
      pagination?: PaginationParams
    ) => Effect.Effect<PaginatedResult<unknown>, ProductRepositoryError>;

    /**
     * Update projection (called by event handlers)
     */
    readonly updateProjection: (
      id: string,
      data: unknown
    ) => Effect.Effect<void, ProductRepositoryError>;

    /**
     * Rebuild projection from event stream
     */
    readonly rebuildProjection: (
      id: string
    ) => Effect.Effect<void, ProductRepositoryError>;

    // TODO: Add domain-specific projection methods
  }
>() {}
