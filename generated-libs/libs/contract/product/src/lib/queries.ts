import { Schema } from "effect";
import type { ProductId } from "./entities";

/**
 * Product Queries (CQRS Read Operations)
 *
 * Queries represent read intentions without side effects.
 * They define what data to fetch and how to filter it.
 *
 * TODO: Customize for your domain:
 * 1. Add domain-specific query parameters
 * 2. Add filter and sort options
 * 3. Create custom queries for common patterns
 * 4. Add pagination support
 *
 * @module @custom-repo/contract-product/queries
 */


// ============================================================================
// CRUD Queries
// ============================================================================


/**
 * Query to get a single Product by ID
 */
export class GetProductQuery extends Schema.Class<GetProductQuery>("GetProductQuery")({
  /** Product ID to fetch */
  productId: Schema.UUID,
}) {
  static create(productId: ProductId) {
    return new GetProductQuery({
      productId,
    });
  }
}

/**
 * Query to list Products with filters and pagination
 */
export class ListProductsQuery extends Schema.Class<ListProductsQuery>("ListProductsQuery")({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(Schema.int(), Schema.positive()),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ),

  /** Sort field */
  sortBy: Schema.optional(Schema.String),

  /** Sort direction */
  sortDirection: Schema.optional(Schema.Literal("asc", "desc")),

  // TODO: Add domain-specific filter fields
  // Example filters:
  //
  // /** Filter by status */
  // status: Schema.optional(Schema.String),
  //
  // /** Filter by owner */
  // ownerId: Schema.optional(Schema.UUID),
  //
  // /** Search term */
  // search: Schema.optional(Schema.String),
}) {
  static create(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    // TODO: Add filter parameters
  }) {
    return new ListProductsQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.sortBy !== undefined && { sortBy: params.sortBy }),
      ...(params.sortDirection !== undefined && { sortDirection: params.sortDirection }),
      // TODO: Add filter fields
    });
  }
}

/**
 * Query to search Products by text
 */
export class SearchProductsQuery extends Schema.Class<SearchProductsQuery>("SearchProductsQuery")({
  /** Search term */
  searchTerm: Schema.String.pipe(Schema.minLength(1)),

  /** Page number (1-indexed) */
  page: Schema.Number.pipe(Schema.int(), Schema.positive()),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ),
}) {
  static create(params: {
    searchTerm: string;
    page?: number;
    limit?: number;
  }) {
    return new SearchProductsQuery({
      searchTerm: params.searchTerm,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });
  }
}

// TODO: Add domain-specific queries here

// Example - Get by slug query:

// 

// export class GetProductBySlugQuery extends Schema.Class<GetProductBySlugQuery>("GetProductBySlugQuery")({

//   slug: Schema.String,

// }) {

//   static create(slug: string) { ... }

// }


// ============================================================================
// Query Union Type
// ============================================================================


/**
 * Union of all product queries
 */
export type ProductQuery = 
  | GetProductQuery
  | ListProductsQuery
  | SearchProductsQuery;

// TODO: Add custom queries to this union


/**
 * Schema for ProductQuery union
 */
export const ProductQuerySchema = Schema.Union(
  GetProductQuery,
  ListProductsQuery,
  SearchProductsQuery
  // TODO: Add custom query schemas
);
