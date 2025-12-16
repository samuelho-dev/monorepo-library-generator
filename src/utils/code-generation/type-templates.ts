/**
 * Type Template Utilities
 *
 * Shared utilities for generating TypeScript type definitions across all generators.
 * Consolidates common patterns for pagination, sorting, filtering, and query types.
 *
 * @module monorepo-library-generator/type-template-utils
 */

import type { TypeScriptBuilder } from "../templates"

/**
 * Pagination options configuration
 */
export interface PaginationOptionsConfig {
  /**
   * Include offset-based pagination (skip/limit)
   * @default true
   */
  readonly offsetBased?: boolean

  /**
   * Include cursor-based pagination
   * @default false
   */
  readonly cursorBased?: boolean
}

/**
 * Adds pagination options type definitions
 *
 * Generates PaginationOptions interface with optional offset or cursor-based fields.
 *
 * @example
 * ```typescript
 * // Offset-based (default)
 * addPaginationOptions(builder);
 *
 * // Cursor-based
 * addPaginationOptions(builder, { offsetBased: false, cursorBased: true });
 * ```
 */
export function addPaginationOptions(
  builder: TypeScriptBuilder,
  config: PaginationOptionsConfig = {}
) {
  const { cursorBased = false, offsetBased = true } = config

  if (offsetBased && !cursorBased) {
    // Standard offset-based pagination
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        {
          name: "skip",
          type: "number",
          readonly: true,
          jsdoc: "Number of records to skip"
        },
        {
          name: "limit",
          type: "number",
          readonly: true,
          jsdoc: "Maximum number of records to return"
        }
      ],
      jsdoc: "Pagination options for queries"
    })
  } else if (cursorBased && !offsetBased) {
    // Cursor-based pagination only
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        {
          name: "limit",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Maximum number of records to return"
        },
        {
          name: "cursor",
          type: "string",
          readonly: true,
          optional: true,
          jsdoc: "Cursor for pagination"
        }
      ],
      jsdoc: "Pagination options for queries (cursor-based)"
    })
  } else if (offsetBased && cursorBased) {
    // Both offset and cursor-based
    builder.addInterface({
      name: "PaginationOptions",
      exported: true,
      properties: [
        {
          name: "skip",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Number of records to skip (offset-based)"
        },
        {
          name: "limit",
          type: "number",
          readonly: true,
          optional: true,
          jsdoc: "Maximum number of records to return"
        },
        {
          name: "cursor",
          type: "string",
          readonly: true,
          optional: true,
          jsdoc: "Cursor for pagination (cursor-based)"
        }
      ],
      jsdoc: "Pagination options for queries (offset or cursor-based)"
    })
  }
}

/**
 * Paginated response configuration
 */
export interface PaginatedResponseConfig {
  /**
   * Field name for items/data
   * @default "items"
   */
  readonly itemsFieldName?: "items" | "data"

  /**
   * Include hasMore field (cursor-based pagination indicator)
   * @default false
   */
  readonly includeHasMore?: boolean

  /**
   * Include nextCursor field (cursor-based pagination)
   * @default false
   */
  readonly includeNextCursor?: boolean
}

/**
 * Adds paginated response type definition
 *
 * Generates PaginatedResponse<T> generic type for API responses.
 *
 * @example
 * ```typescript
 * // Standard (offset-based)
 * addPaginatedResponse(builder);
 *
 * // Cursor-based
 * addPaginatedResponse(builder, {
 *   itemsFieldName: 'data',
 *   includeHasMore: true,
 *   includeNextCursor: true
 * });
 * ```
 */
export function addPaginatedResponse(
  builder: TypeScriptBuilder,
  config: PaginatedResponseConfig = {}
) {
  const {
    includeHasMore = true,
    includeNextCursor = false,
    itemsFieldName = "items"
  } = config

  const properties: Array<{
    name: string
    type: string
    readonly: boolean
    optional?: boolean
    jsdoc: string
  }> = [
    {
      name: itemsFieldName,
      type: "readonly T[]",
      readonly: true,
      jsdoc: "Array of items/records"
    },
    {
      name: "total",
      type: "number",
      readonly: true,
      jsdoc: "Total number of records available"
    }
  ]

  // Add offset-based properties if not using cursor pagination
  if (!includeHasMore && !includeNextCursor) {
    properties.push(
      {
        name: "skip",
        type: "number",
        readonly: true,
        jsdoc: "Number of records skipped"
      },
      {
        name: "limit",
        type: "number",
        readonly: true,
        jsdoc: "Maximum number of records returned"
      }
    )
  }

  // Add cursor-based properties if requested
  if (includeHasMore) {
    properties.push({
      name: "hasMore",
      type: "boolean",
      readonly: true,
      jsdoc: "Whether more records are available"
    })
  }

  if (includeNextCursor) {
    properties.push({
      name: "nextCursor",
      type: "string",
      readonly: true,
      optional: true,
      jsdoc: "Cursor for fetching next page"
    })
  }

  // Build interface manually since TypeScriptBuilder doesn't support generic interfaces
  builder.addJSDoc("Paginated response wrapper")
  builder.addRaw(`export interface PaginatedResponse<T> {`)
  for (const prop of properties) {
    if (prop.jsdoc) {
      builder.addRaw(`  /**`)
      builder.addRaw(`   * ${prop.jsdoc}`)
      builder.addRaw(`   */`)
    }
    const readonlyModifier = prop.readonly ? "readonly " : ""
    const optionalModifier = prop.optional ? "?" : ""
    builder.addRaw(`  ${readonlyModifier}${prop.name}${optionalModifier}: ${prop.type};`)
  }
  builder.addRaw(`}`)
}

/**
 * Adds both pagination types (options + response)
 *
 * Convenience function to add both PaginationOptions and PaginatedResponse.
 *
 * @example
 * ```typescript
 * addPaginationTypes(builder); // Standard offset-based
 *
 * addPaginationTypes(builder, {
 *   cursorBased: true,
 *   includeHasMore: true,
 *   includeNextCursor: true
 * }); // Cursor-based
 * ```
 */
export function addPaginationTypes(
  builder: TypeScriptBuilder,
  config: PaginationOptionsConfig & PaginatedResponseConfig = {}
) {
  addPaginationOptions(builder, config)
  builder.addBlankLine()
  addPaginatedResponse(builder, config)
}

/**
 * Adds SortDirection type alias
 */
export function addSortDirection(builder: TypeScriptBuilder) {
  builder.addRaw(`export type SortDirection = 'asc' | 'desc';`)
}

/**
 * Sort interface configuration
 */
export interface SortInterfaceConfig {
  /**
   * Class name prefix (e.g., "User" for UserSort)
   */
  readonly className: string

  /**
   * Whether to include sort direction field
   * @default true
   */
  readonly includeDirection?: boolean
}

/**
 * Adds sort interface for a specific entity
 *
 * @example
 * ```typescript
 * addSortInterface(builder, { className: 'User' });
 * ```
 *
 * Generates:
 * ```typescript
 * export interface UserSort {
 *   readonly field: string;
 *   readonly direction: SortDirection;
 * }
 * ```
 */
export function addSortInterface(
  builder: TypeScriptBuilder,
  config: SortInterfaceConfig
) {
  const { className, includeDirection = true } = config

  const properties = [
    {
      name: "field",
      type: "string",
      readonly: true,
      jsdoc: "Field to sort by"
    }
  ]

  if (includeDirection) {
    properties.push({
      name: "direction",
      type: "SortDirection",
      readonly: true,
      jsdoc: "Sort direction"
    })
  }

  builder.addInterface({
    name: `${className}Sort`,
    exported: true,
    properties,
    jsdoc: `Sort options for ${className} queries`
  })
}

/**
 * Filter interface configuration
 */
export interface FilterInterfaceConfig {
  /**
   * Class name prefix (e.g., "User" for UserFilter)
   */
  readonly className: string

  /**
   * Include search field
   * @default true
   */
  readonly includeSearch?: boolean

  /**
   * Use dynamic index signature (Provider-style)
   * @default false
   */
  readonly dynamic?: boolean
}

/**
 * Adds filter interface for a specific entity
 *
 * @example
 * ```typescript
 * addFilterInterface(builder, { className: 'User', includeSearch: true });
 * ```
 *
 * Generates:
 * ```typescript
 * export interface UserFilter {
 *   readonly search?: string;
 *   // Add domain-specific filters
 * }
 * ```
 */
export function addFilterInterface(
  builder: TypeScriptBuilder,
  config: FilterInterfaceConfig
) {
  const { className, dynamic = false, includeSearch = true } = config

  const properties = []

  if (includeSearch) {
    properties.push({
      name: "search",
      type: "string",
      readonly: true,
      optional: true,
      jsdoc: "Search term for filtering"
    })
  }

  const jsdoc = `Filter options for ${className} queries`
  const additionalComment = dynamic
    ? undefined
    : "// Add domain-specific filter fields"

  if (dynamic) {
    // Provider-style with index signature
    builder.addRaw(`/**
 * ${jsdoc}
 */
export interface ${className}Filter {
${properties.map((f) => `  readonly ${f.name}?: ${f.type};`).join("\n")}
  readonly [key: string]: unknown;
}`)
  } else {
    // Standard interface
    builder.addInterface({
      name: `${className}Filter`,
      exported: true,
      properties,
      jsdoc
    })

    if (additionalComment) {
      builder.addComment(additionalComment)
    }
  }
}

/**
 * Query options configuration
 */
export interface QueryOptionsConfig {
  /**
   * Class name prefix (e.g., "User" for UserQueryOptions)
   */
  readonly className: string

  /**
   * Include sort field
   * @default true
   */
  readonly includeSort?: boolean

  /**
   * Include filter field
   * @default true
   */
  readonly includeFilter?: boolean

  /**
   * Include pagination field
   * @default true
   */
  readonly includePagination?: boolean
}

/**
 * Adds query options type (combines filter, sort, pagination)
 *
 * @example
 * ```typescript
 * addQueryOptionsType(builder, { className: 'User' });
 * ```
 *
 * Generates:
 * ```typescript
 * export type UserQueryOptions = {
 *   readonly filter?: UserFilter;
 *   readonly sort?: UserSort;
 *   readonly pagination?: PaginationOptions;
 * };
 * ```
 */
export function addQueryOptionsType(
  builder: TypeScriptBuilder,
  config: QueryOptionsConfig
) {
  const {
    className,
    includeFilter = true,
    includePagination = true,
    includeSort = true
  } = config

  const fields = []

  if (includeFilter) {
    fields.push({
      name: "filter",
      type: `${className}Filter`,
      readonly: true,
      optional: true
    })
  }

  if (includeSort) {
    fields.push({
      name: "sort",
      type: `${className}Sort`,
      readonly: true,
      optional: true
    })
  }

  if (includePagination) {
    fields.push({
      name: "pagination",
      type: "PaginationOptions",
      readonly: true,
      optional: true
    })
  }

  builder.addRaw(`export type ${className}QueryOptions = {
${fields.map((f) => `  readonly ${f.name}?: ${f.type};`).join("\n")}
};`)
}

/**
 * Adds all query-related types (sort, filter, options)
 *
 * Convenience function to add SortDirection, Sort, Filter, and QueryOptions types.
 *
 * @example
 * ```typescript
 * addQueryTypes(builder, { className: 'User' });
 * ```
 */
export function addQueryTypes(
  builder: TypeScriptBuilder,
  config: FilterInterfaceConfig & SortInterfaceConfig & QueryOptionsConfig
) {
  addSortDirection(builder)
  builder.addBlankLine()

  addSortInterface(builder, config)
  builder.addBlankLine()

  addFilterInterface(builder, config)
  builder.addBlankLine()

  addQueryOptionsType(builder, config)
}
