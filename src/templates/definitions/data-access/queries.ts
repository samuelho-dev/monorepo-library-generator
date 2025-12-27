/**
 * Data Access Queries Template Definition
 *
 * Declarative template for generating queries.ts in data-access libraries.
 * Contains Kysely query builder functions.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/queries
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Data Access Queries Template Definition
 *
 * Generates a complete queries.ts file with:
 * - Query type aliases
 * - Type-safe query builders (findAll, findById, count)
 * - Filter, sort, and pagination helpers
 */
export const dataAccessQueriesTemplate: TemplateDefinition = {
  id: 'data-access/queries',
  meta: {
    title: 'Kysely Query Builders for {className}',
    description: `Helper functions for building type-safe queries using Kysely.
Encapsulates common query patterns and SQL building logic.

@see https://kysely.dev/docs/category/queries for Kysely API reference`,
    module: '{scope}/data-access-{fileName}/server'
  },
  imports: [
    { from: 'kysely', items: ['Kysely'], isTypeOnly: true },
    { from: '{scope}/infra-database', items: ['Database'], isTypeOnly: true }
  ],
  sections: [
    // Query Type Aliases
    {
      title: 'Query Type Aliases',
      content: {
        type: 'raw',
        value: `/**
 * {className} Filter options for queries
 */
export type {className}QueryFilters = Record<string, never>`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Pagination options
 */
export interface PaginationOptions {
  readonly skip: number
  readonly limit: number
}`
      }
    },
    // Query Builders
    {
      title: 'Query Builders',
      content: {
        type: 'raw',
        value: `/**
 * Build find all query for {className}
 *
 * @example
 * \`\`\`typescript
 * const query = buildFindAllQuery(db, { status: 'active' }, { skip: 0, limit: 10 })
 * const results = await query.execute()
 * \`\`\`
 */
export function buildFindAllQuery(
  db: Kysely<Database>
) {
  const query = db.selectFrom("{fileName}")
  return query
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Build find by ID query
 *
 * @example
 * \`\`\`typescript
 * const query = buildFindByIdQuery(db, '123')
 * const result = await query.executeTakeFirst()
 * \`\`\`
 */
export function buildFindByIdQuery(
  db: Kysely<Database>,
  id: string
) {
  return db
    .selectFrom("{fileName}")
    .where("id", "=", id)
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Build count query
 *
 * @example
 * \`\`\`typescript
 * const query = buildCountQuery(db, { status: 'active' })
 * const { count } = await query.executeTakeFirstOrThrow()
 * \`\`\`
 */
export function buildCountQuery(
  db: Kysely<Database>
) {
  const query = db
    .selectFrom("{fileName}")
    .select((eb) => eb.fn.countAll().as("count"))

  return query
}`
      }
    }
  ]
}

export default dataAccessQueriesTemplate
