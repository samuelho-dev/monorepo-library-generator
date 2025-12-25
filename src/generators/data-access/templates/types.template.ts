/**
 * Data Access Types Template
 *
 * Generates types.ts file for data-access libraries with shared type definitions.
 *
 * @module monorepo-library-generator/data-access/types-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { addPaginatedResponse, addPaginationOptions, addSortDirection } from "../../../utils/templates"
import type { DataAccessTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate types.ts file for data-access library
 *
 * Creates shared type definitions including:
 * - Re-exports from contract library
 * - Filter and query types
 * - Response types
 * - Helper type utilities
 */
export function generateTypesFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, contractLibrary, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Shared Type Definitions`,
    description: `Common types used across the data-access layer for ${className} operations.
Re-exports entity types from contract library and provides query-specific types.`,
    module: `${scope}/data-access-${fileName}/server`
  })

  // Re-export from contract library
  builder.addSectionComment("Entity Types (from Contract Library)")
  builder.addBlankLine()

  builder.addRaw(`// Re-export entity types from contract library
// Note: Contract re-exports Prisma-generated types (Select, Insert, Update)
// and defines branded ID type in rpc-definitions.ts
export type {
  ${className}Select as ${className},
  ${className}Id,
  ${className}Insert as ${className}CreateInput,
  ${className}Update as ${className}UpdateInput,
} from "${contractLibrary}";`)
  builder.addBlankLine()

  // Filter & Query Types
  builder.addSectionComment("Filter & Query Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Filter Options
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
 *   readonly category?: string;
 *   readonly minPrice?: number;
 *   readonly maxPrice?: number;
 *   readonly inStock?: boolean;
 *   readonly tags?: readonly string[];
 *   readonly search?: string;
 *   readonly createdAfter?: Date;
 * }
 * \`\`\`
 */
export interface ${className}Filter {
  // TODO: Add filter properties (see JSDoc examples above)
  readonly search?: string;
}`)
  builder.addBlankLine()

  // Add query types using utility (SortDirection, Sort, Pagination)
  addSortDirection(builder)
  builder.addBlankLine()

  builder.addComment(`${className} Sort Options`)
  builder.addComment("TODO: Add domain-specific sortable fields")
  builder.addComment("Examples: createdAt, updatedAt, name, price")
  builder.addRaw(`export interface ${className}Sort {
  readonly field: string; // TODO: Use union of sortable fields
  readonly direction: SortDirection;
}`)
  builder.addBlankLine()

  builder.addComment("Pagination Options")
  builder.addComment("Standard pagination parameters for list queries.")
  addPaginationOptions(builder)
  builder.addBlankLine()

  builder.addRaw(`/**
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
 * };
 * const results = yield* repository.findAll(options);
 * \`\`\`
 */
export interface QueryOptions {
  readonly filter?: ${className}Filter;
  readonly sort?: ${className}Sort;
  readonly pagination?: PaginationOptions;
}`)
  builder.addBlankLine()

  // Response Types
  builder.addSectionComment("Response Types")
  builder.addBlankLine()

  builder.addComment("Paginated List Response")
  builder.addComment("Standard paginated response format for list queries.")
  addPaginatedResponse(builder)
  builder.addBlankLine()

  // Note: TypeScript built-in Required<T> and Readonly<T> are available globally
  // For deep readonly, import from 'type-fest' if needed: import type { ReadonlyDeep } from 'type-fest'

  return builder.toString()
}
