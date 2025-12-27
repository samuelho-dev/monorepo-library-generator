/**
 * Data Access Types Template Definition
 *
 * Declarative template for generating types.ts in data-access libraries.
 * Contains shared type definitions for query, filter, and response types.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/types
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Data Access Types Template Definition
 *
 * Generates a complete types.ts file with:
 * - Re-exports from contract library
 * - Filter and query types
 * - Pagination and sort types
 * - Response types
 */
export const dataAccessTypesTemplate: TemplateDefinition = {
  id: "data-access/types",
  meta: {
    title: "{className} Shared Type Definitions",
    description: `Common types used across the data-access layer for {className} operations.
Re-exports entity types from contract library and provides query-specific types.`,
    module: "{scope}/data-access-{fileName}/server"
  },
  imports: [],
  sections: [
    // Entity Types from Contract
    {
      title: "Entity Types (from Contract Library)",
      content: {
        type: "raw",
        value: `// Re-export entity types from contract library
// Note: Contract re-exports Prisma-generated types (Select, Insert, Update)
// and defines branded ID type in rpc-definitions.ts
export type {
  {className}Id,
  {className}Insert as {className}CreateInput,
  {className}Select as {className},
  {className}Update as {className}UpdateInput
} from "{contractLibrary}"`
      }
    },
    // Filter & Query Types
    {
      title: "Filter & Query Types",
      content: {
        type: "raw",
        value: `/**
 * {className} Filter Options
 *
 * Define filterable properties for queries.
 *
 * TODO: Replace with actual filter fields based on your entity properties
 *
 * Common patterns:
 * - Equality filters: status, category, type, tag
 * - Range filters: minPrice, maxPrice, minDate, maxDate
 * - Text search: search (full-text), name (partial match), email
 * - Array filters: ids, tags, categories (multiple values)
 * - Boolean flags: isActive, isPublished, isDeleted
 * - Date ranges: createdAfter, createdBefore, updatedSince
 *
 * @example
 * \`\`\`typescript
 * export interface ProductFilter {
 *   readonly category?: string
 *   readonly minPrice?: number
 *   readonly maxPrice?: number
 *   readonly inStock?: boolean
 *   readonly tags?: readonly string[]
 *   readonly search?: string
 *   readonly createdAfter?: Date
 * }
 * \`\`\`
 */
export interface {className}Filter {
  // TODO: Add filter properties (see JSDoc examples above)
  readonly search?: string
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Sort direction for queries
 */
export type SortDirection = "asc" | "desc"

/**
 * {className} Sort Options
 *
 * TODO: Add domain-specific sortable fields
 * Examples: createdAt, updatedAt, name, price
 */
export interface {className}Sort {
  readonly field: string // TODO: Use union of sortable fields
  readonly direction: SortDirection
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Pagination Options
 *
 * Standard pagination parameters for list queries.
 */
export interface PaginationOptions {
  readonly skip: number
  readonly limit: number
}

/**
 * Query Options
 *
 * Combined filter, sort, and pagination options for list queries.
 *
 * @example
 * \`\`\`typescript
 * const options: QueryOptions = {
 *   filter: { status: 'active' },
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pagination: { skip: 0, limit: 20 }
 * }
 * const results = yield* repository.findAll(options)
 * \`\`\`
 */
export interface QueryOptions {
  readonly filter?: {className}Filter
  readonly sort?: {className}Sort
  readonly pagination?: PaginationOptions
}`
      }
    },
    // Response Types
    {
      title: "Response Types",
      content: {
        type: "raw",
        value: `/**
 * Paginated List Response
 *
 * Standard paginated response format for list queries.
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly skip: number
  readonly limit: number
  readonly hasMore: boolean
}`
      }
    }
  ]
}

export default dataAccessTypesTemplate
