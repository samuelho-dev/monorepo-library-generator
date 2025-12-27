/**
 * Data Access Queries Template
 *
 * Generates queries.ts file for data-access libraries with Kysely query builders.
 *
 * @module monorepo-library-generator/data-access/queries-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { DataAccessTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

/**
 * Generate queries.ts file for data-access library
 * Creates Kysely query builder functions including:
 * - Type-safe query builders
 * - Filter, sort, and pagination helpers
 * - Common query patterns
 */
export function generateQueriesFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `Kysely Query Builders for ${className}`,
    description: `Helper functions for building type-safe queries using Kysely.
Encapsulates common query patterns and SQL building logic.

@see https://kysely.dev/docs/category/queries for Kysely API reference`,
    module: `${scope}/data-access-${fileName}/server`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    {
      from: 'kysely',
      imports: ['Kysely'],
      isTypeOnly: true
    },
    {
      from: `${scope}/infra-database`,
      imports: ['Database'],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Query Type Aliases
  builder.addSectionComment('Query Type Aliases')
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Filter options for queries
 */
export type ${className}QueryFilters = Record<string, never>`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Pagination options
 */
export interface PaginationOptions {
  readonly skip: number
  readonly limit: number
}`)
  builder.addBlankLine()

  // Query Builders
  builder.addSectionComment('Query Builders')
  builder.addBlankLine()

  // buildFindAllQuery
  builder.addRaw(`/**
 * Build find all query for ${className}
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
  const query = db.selectFrom("${fileName}")
  return query
}`)
  builder.addBlankLine()

  // buildFindByIdQuery
  builder.addRaw(`/**
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
    .selectFrom("${fileName}")
    .where("id", "=", id)
}`)
  builder.addBlankLine()

  // buildCountQuery
  builder.addRaw(`/**
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
    .selectFrom("${fileName}")
    .select((eb) => eb.fn.countAll().as("count"))

  return query
}`)
  builder.addBlankLine()

  return builder.toString()
}
