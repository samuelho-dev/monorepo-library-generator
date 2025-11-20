import { Schema } from "effect";
import type { ProductId } from "./entities";

/**
 * Product Projections (CQRS Read Models)
 *
 * IMPORTANT: These are TypeScript schemas for query results from JOINs,
 * NOT separate database tables. Projections are denormalized views
 * built by querying existing tables via JOINs and caching the results.
 *
 * Implementation: Use Kysely JOINs on existing tables (e.g., products,
 * related entities) to build projection results, then cache
 * with cache-aside pattern for performance.
 *
 * TODO: Customize for your domain:
 * 1. Add denormalized fields from related tables
 * 2. Add aggregated stats (counts, averages, etc.)
 * 3. Define which tables to JOIN for each projection
 * 4. Implement cache invalidation strategy
 *
 * @module @custom-repo/contract-product/projections
 */


// ============================================================================
// Projection Schemas
// ============================================================================


/**
 * Product List Projection
 *
 * Optimized for listing queries with denormalized data from JOINs.
 * Built from: Product table LEFT JOIN related tables
 *
 * NOT a separate table - query result cached with cache-aside pattern.
 */
export class ProductListProjection extends Schema.Class<ProductListProjection>("ProductListProjection")({
  /** Unique identifier */
  productId: Schema.UUID,

  /** Name from primary table */
  name: Schema.String,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  // TODO: Add denormalized fields from JOINs
  // Example denormalized fields (from related tables):
  //
  // /** Related entity info (denormalized from related_entities table) */
  // relatedId: Schema.UUID,
  // relatedName: Schema.String,
  //
  // /** Category info (denormalized from categories table) */
  // categoryId: Schema.UUID,
  // categoryName: Schema.String,
  //
  // /** Aggregated stats */
  // itemCount: Schema.Number,
  // averageRating: Schema.optional(Schema.Number),
}) {}

/**
 * Product Detail Projection
 *
 * Optimized for single Product detail view with full information.
 * Built from: Product table INNER/LEFT JOIN related tables for complete context.
 *
 * NOT a separate table - query result cached with cache-aside pattern.
 */
export class ProductDetailProjection extends Schema.Class<ProductDetailProjection>("ProductDetailProjection")({
  /** Unique identifier */
  productId: Schema.UUID,

  /** Name from primary table */
  name: Schema.String,

  /** Description from primary table */
  description: Schema.optional(Schema.String),

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

  // TODO: Add full denormalized context from JOINs
  // Example complete denormalized structure:
  //
  // /** Related entity information (from related_entities table) */
  // relatedEntity: Schema.Struct({
  //   id: Schema.UUID,
  //   name: Schema.String,
  //   status: Schema.String,
  // }),
  //
  // /** Category hierarchy (from categories table) */
  // category: Schema.Struct({
  //   id: Schema.UUID,
  //   name: Schema.String,
  //   parentId: Schema.optional(Schema.UUID),
  //   parentName: Schema.optional(Schema.String),
  // }),
  //
  // /** Statistics (aggregated from related tables) */
  // stats: Schema.Struct({
  //   count: Schema.Number,
  //   total: Schema.Number,
  // }),
}) {}

// ============================================================================
// How Projections Work in This System
// ============================================================================


/**
 * Implementation Guide for Product Projections
 *
 * 1. QUERY CONSTRUCTION (in data-access layer):
 *    - Use Kysely to JOIN existing tables
 *    - Select and alias fields to match projection schema
 *    - Example:
 *      ```typescript
 *      db.selectFrom('products')
 *        .leftJoin('related_entities', 'products.related_id', 'related_entities.id')
 *        .select([
 *          'products.id as productId',
 *          'products.name',
 *          'related_entities.id as relatedId',
 *          'related_entities.name as relatedName',
 *        ])
 *      ```
 *
 * 2. CACHING STRATEGY (cache-aside pattern):
 *    - Check cache first (Redis/in-memory)
 *    - On cache miss: Execute JOIN query, cache result
 *    - Set appropriate TTL based on data freshness needs
 *
 * 3. CACHE INVALIDATION:
 *    - Invalidate on write operations (Create/Update/Delete)
 *    - Consider using event listeners on domain events
 *    - May need to invalidate related projection caches
 *
 * 4. WHY NOT SEPARATE TABLES:
 *    - Avoids data duplication
 *    - Single source of truth (normalized tables)
 *    - Easier to maintain consistency
 *    - Projections can be rebuilt from source tables
 *    - Simpler schema evolution
 *
 * 5. PERFORMANCE TIPS:
 *    - Add database indexes on JOIN columns
 *    - Use connection pooling
 *    - Batch cache warming for popular projections
 *    - Monitor query performance with database profiling
 */