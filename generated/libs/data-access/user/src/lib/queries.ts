import type { Database } from "@myorg/infra-database";
import type { Kysely } from "kysely";

/**
 * Kysely Query Builders for User
 *
 * Helper functions for building type-safe queries using Kysely.
Encapsulates common query patterns and SQL building logic.

@see https://kysely.dev/docs/category/queries for Kysely API reference
 *
 * @module @myorg/data-access-user/server
 */

// ============================================================================
// Query Type Aliases
// ============================================================================

/**
 * User Filter options for queries
 */
export type UserQueryFilters = Record<string, never>;

/**
 * Pagination options
 */
export interface PaginationOptions {
  readonly skip: number;
  readonly limit: number;
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * Build find all query for User
 *
 * @example
 * ```typescript
 * const query = buildFindAllQuery(db, { status: 'active' }, { skip: 0, limit: 10 });
 * const results = await query.execute();
 * ```
 */
export function buildFindAllQuery(db: Kysely<Database>) {
  const query = db.selectFrom("user");
  return query;
}

/**
 * Build find by ID query
 *
 * @example
 * ```typescript
 * const query = buildFindByIdQuery(db, '123');
 * const result = await query.executeTakeFirst();
 * ```
 */
export function buildFindByIdQuery(db: Kysely<Database>, id: string) {
  return db.selectFrom("user").where("id", "=", id);
}

/**
 * Build count query
 *
 * @example
 * ```typescript
 * const query = buildCountQuery(db, { status: 'active' });
 * const { count } = await query.executeTakeFirstOrThrow();
 * ```
 */
export function buildCountQuery(db: Kysely<Database>) {
  const query = db.selectFrom("user").select((eb) => eb.fn.countAll().as("count"));

  return query;
}
