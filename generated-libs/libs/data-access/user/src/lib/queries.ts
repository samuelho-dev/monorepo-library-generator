import type { Database } from "@custom-repo/types-database";
import type { Kysely, SelectQueryBuilder } from "kysely";

/**
 * Kysely Query Builders for User
 *
 * Helper functions for building type-safe queries using Kysely.
Encapsulates common query patterns and SQL building logic.

TODO: Customize this file:
1. Add query builders for frequently used queries
2. Implement filtering, sorting, and pagination helpers
3. Add aggregation queries (count, sum, average, etc.)
4. Implement complex JOIN queries for projections
5. Add search functionality if needed

@see https://kysely.dev/docs/category/queries for Kysely API reference
 *
 * @module @custom-repo/data-access-user/server
 */



// ============================================================================
// Query Type Aliases
// ============================================================================


/**
 * Type alias for query builder starting from user table
 */
type UserQueryBuilder = SelectQueryBuilder<
  Database,
  "user" | any,
  any
>;

/**
 * User Filter options for queries
 */
export interface UserQueryFilters {
  // TODO: Add filter properties based on your domain
  // Example:
  // readonly status?: 'active' | 'inactive';
  // readonly createdAfter?: Date;
  // readonly search?: string;
}

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
 * TODO: Implement filtering and pagination logic
 *
 * @example
 * ```typescript
 * const query = buildFindAllQuery(db, { status: 'active' }, { skip: 0, limit: 10 });
 * const results = await query.execute();
 * ```
 */
export function buildFindAllQuery(
  db: Kysely<Database>,
  filters?: UserQueryFilters,
  pagination?: PaginationOptions,
): UserQueryBuilder {
  let query = db.selectFrom("user");

  // TODO: Add filter conditions
  // if (filters?.status) {
  //   query = query.where('status', '=', filters.status);
  // }

  // TODO: Add pagination
  // if (pagination) {
  //   query = query.limit(pagination.limit).offset(pagination.skip);
  // }

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
export function buildFindByIdQuery(
  db: Kysely<Database>,
  id: string,
): UserQueryBuilder {
  return db
    .selectFrom("user")
    .where("id", "=", id);
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
export function buildCountQuery(
  db: Kysely<Database>,
  filters?: UserQueryFilters,
) {
  let query = db
    .selectFrom("user")
    .select((eb) => eb.fn.countAll().as("count"));

  // TODO: Add filter conditions

  return query;
}

// TODO: Add more specialized queries
//
// export function buildActiveQuery(db: Kysely<Database>) {
//   return db
//     .selectFrom("user")
//     .where("active", "=", true);
// }
//
// export function buildSearchQuery(
//   db: Kysely<Database>,
//   searchTerm: string
// ) {
//   return db
//     .selectFrom("user")
//     .where("name", "like", `%${searchTerm}%`);
// }
