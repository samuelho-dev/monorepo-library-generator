/**
 * Data Access Queries Template
 *
 * Generates queries.ts file for data-access libraries with Kysely query builders.
 *
 * @module monorepo-library-generator/data-access/queries-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate queries.ts file for data-access library
 *
 * Creates Kysely query builder functions including:
 * - Type-safe query builders
 * - Filter, sort, and pagination helpers
 * - Common query patterns
 */
export function generateQueriesFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // Add file header
  builder.addFileHeader({
    title: `Kysely Query Builders for ${className}`,
    description: `Helper functions for building type-safe queries using Kysely.
Encapsulates common query patterns and SQL building logic.

TODO: Customize this file:
1. Add query builders for frequently used queries
2. Implement filtering, sorting, and pagination helpers
3. Add aggregation queries (count, sum, average, etc.)
4. Implement complex JOIN queries for projections
5. Add search functionality if needed

@see https://kysely.dev/docs/category/queries for Kysely API reference`,
    module: `@custom-repo/data-access-${fileName}/server`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    {
      from: "kysely",
      imports: ["Kysely", "SelectQueryBuilder"],
      isTypeOnly: true
    },
    {
      from: "@custom-repo/types-database",
      imports: ["Database"],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Query Type Aliases
  builder.addSectionComment("Query Type Aliases")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Type alias for query builder starting from ${fileName} table
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _${className}QueryBuilder = SelectQueryBuilder<
  Database,
  "${fileName}" | any,
  any
>;`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Filter options for queries
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ${className}QueryFilters {
  // TODO: Add filter properties based on your domain
  // Example:
  // readonly status?: 'active' | 'inactive';
  // readonly createdAfter?: Date;
  // readonly search?: string;
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Pagination options
 */
export interface PaginationOptions {
  readonly skip: number;
  readonly limit: number;
}`)
  builder.addBlankLine()

  // Query Builders
  builder.addSectionComment("Query Builders")
  builder.addBlankLine()

  // buildFindAllQuery
  builder.addRaw(`/**
 * Build find all query for ${className}
 *
 * TODO: Implement filtering and pagination logic
 *
 * @example
 * \`\`\`typescript
 * const query = buildFindAllQuery(db, { status: 'active' }, { skip: 0, limit: 10 });
 * const results = await query.execute();
 * \`\`\`
 */
export function buildFindAllQuery(
  db: Kysely<Database>,
  _filters?: ${className}QueryFilters,
  _pagination?: PaginationOptions,
) {
  const query = db.selectFrom("${fileName}");

  // TODO: Add filter conditions
  // if (_filters?.status) {
  //   query = query.where('status', '=', _filters.status);
  // }

  // TODO: Add pagination
  // if (_pagination) {
  //   query = query.limit(_pagination.limit).offset(_pagination.skip);
  // }

  return query;
}`)
  builder.addBlankLine()

  // buildFindByIdQuery
  builder.addRaw(`/**
 * Build find by ID query
 *
 * @example
 * \`\`\`typescript
 * const query = buildFindByIdQuery(db, '123');
 * const result = await query.executeTakeFirst();
 * \`\`\`
 */
export function buildFindByIdQuery(
  db: Kysely<Database>,
  id: string,
) {
  return db
    .selectFrom("${fileName}")
    .where("id", "=", id);
}`)
  builder.addBlankLine()

  // buildCountQuery
  builder.addRaw(`/**
 * Build count query
 *
 * @example
 * \`\`\`typescript
 * const query = buildCountQuery(db, { status: 'active' });
 * const { count } = await query.executeTakeFirstOrThrow();
 * \`\`\`
 */
export function buildCountQuery(
  db: Kysely<Database>,
  _filters?: ${className}QueryFilters,
) {
  const query = db
    .selectFrom("${fileName}")
    .select((eb) => eb.fn.countAll().as("count"));

  // TODO: Add filter conditions

  return query;
}`)
  builder.addBlankLine()

  // Add TODO comment for additional queries
  builder.addRaw(`// TODO: Add more specialized queries
//
// export function buildActiveQuery(db: Kysely<Database>) {
//   return db
//     .selectFrom("${fileName}")
//     .where("active", "=", true);
// }
//
// export function buildSearchQuery(
//   db: Kysely<Database>,
//   searchTerm: string
// ) {
//   return db
//     .selectFrom("${fileName}")
//     .where("name", "like", \`%\${searchTerm}%\`);
// }
`)

  return builder.toString()
}
