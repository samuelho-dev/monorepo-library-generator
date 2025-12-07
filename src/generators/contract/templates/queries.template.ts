/**
 * Contract Queries Template
 *
 * Generates queries.ts file for contract libraries with CQRS query
 * definitions using Schema.Class for read operations.
 *
 * @module monorepo-library-generator/contract/queries-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ContractTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate queries.ts file for contract library
 *
 * Creates CQRS query definitions with:
 * - CRUD queries (Get, List, Search)
 * - Pagination support
 * - Filter and sort options
 * - Query union types
 */
export function generateQueriesFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName

  // Add file header
  builder.addRaw(createFileHeader(className, fileName))
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])

  builder.addImports([
    { from: "./entities", imports: [`${className}Id`], isTypeOnly: true }
  ])

  builder.addBlankLine()

  // ============================================================================
  // SECTION 1: CRUD Queries
  // ============================================================================

  builder.addSectionComment("CRUD Queries")
  builder.addBlankLine()

  // Get query
  builder.addRaw(createGetQuery(className, propertyName))
  builder.addBlankLine()

  // List query
  builder.addRaw(createListQuery(className))
  builder.addBlankLine()

  // Search query
  builder.addRaw(createSearchQuery(className))
  builder.addBlankLine()

  // TODO comment for custom queries
  builder.addComment("TODO: Add domain-specific queries here")
  builder.addComment("Example - Get by slug query:")
  builder.addComment("")
  builder.addComment(
    `export class Get${className}BySlugQuery extends Schema.Class<Get${className}BySlugQuery>("Get${className}BySlugQuery")({`
  )
  builder.addComment("  slug: Schema.String,")
  builder.addComment("}) {")
  builder.addComment("  static create(slug: string) { ... }")
  builder.addComment("}")
  builder.addBlankLine()

  // ============================================================================
  // SECTION 2: Query Union Type
  // ============================================================================

  builder.addSectionComment("Query Union Type")
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}Query`,
    type: `
  | Get${className}Query
  | List${className}sQuery
  | Search${className}sQuery`,
    exported: true,
    jsdoc: `Union of all ${domainName} queries`
  })

  builder.addComment("TODO: Add custom queries to this union")
  builder.addBlankLine()

  // Query schema union
  builder.addRaw(`/**
 * Schema for ${className}Query union
 */
export const ${className}QuerySchema = Schema.Union(
  Get${className}Query,
  List${className}sQuery,
  Search${className}sQuery
  // TODO: Add custom query schemas
);
`)

  return builder.toString()
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  fileName: string
) {
  return `/**
 * ${className} Queries (CQRS Read Operations)
 *
 * Queries represent read intentions without side effects.
 * They define what data to fetch and how to filter it.
 *
 * TODO: Customize for your domain:
 * 1. Add domain-specific query parameters
 * 2. Add filter and sort options
 * 3. Add Schema.annotations() for OpenAPI/documentation
 * 4. Add Schema.filter() for parameter validation
 * 5. Add Schema.transform() for search term normalization
 * 6. Create custom queries for common patterns
 * 7. Add pagination support
 *
 * @module @custom-repo/contract-${fileName}/queries
 */`
}

/**
 * Create Get query
 */
function createGetQuery(className: string, propertyName: string) {
  return `/**
 * Query to get a single ${className} by ID
 */
export class Get${className}Query extends Schema.Class<Get${className}Query>("Get${className}Query")({
  /** ${className} ID to fetch (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to retrieve"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Get${className}Query",
    title: "Get ${className}",
    description: "Query to fetch a single ${className} by ID"
  })
) {
  static create(${propertyName}Id: ${className}Id) {
    return new Get${className}Query({
      ${propertyName}Id,
    });
  }
}`
}

/**
 * Create List query
 */
function createListQuery(className: string) {
  return `/**
 * Query to list ${className}s with filters and pagination
 */
export class List${className}sQuery extends Schema.Class<List${className}sQuery>("List${className}sQuery")({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Page Number",
    description: "Page number (1-indexed) for pagination",
    examples: [1],
    jsonSchema: { minimum: 1 }
  }),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ).annotations({
    title: "Page Limit",
    description: "Number of items per page (max 100)",
    examples: [20],
    jsonSchema: { minimum: 1, maximum: 100 }
  }),

  /** Sort field */
  sortBy: Schema.optional(Schema.String).annotations({
    title: "Sort Field",
    description: "Field name to sort by"
  }),

  /** Sort direction */
  sortDirection: Schema.optional(Schema.Literal("asc", "desc")).annotations({
    title: "Sort Direction",
    description: "Sort direction (ascending or descending)",
    examples: ["asc"]
  }),

  // TODO: Add domain-specific filter fields with Schema.annotations()
  // Example filters:
  //
  // /** Filter by status */
  // status: Schema.optional(Schema.String).annotations({
  //   title: "Status Filter",
  //   description: "Filter by status"
  // }),
  //
  // /** Filter by owner */
  // ownerId: Schema.optional(Schema.UUID).annotations({
  //   title: "Owner Filter",
  //   description: "Filter by owner UUID"
  // }),
  //
  // /** Search term */
  // search: Schema.optional(Schema.String).annotations({
  //   title: "Search Term",
  //   description: "Text search filter"
  // }),
}).pipe(
  // TODO: Add pagination validation with Schema.filter()
  // Example:
  // Schema.filter((query) => {
  //   if (query.page < 1) {
  //     return { path: ["page"], message: "Page must be >= 1" };
  //   }
  //   if (query.limit > 100) {
  //     return { path: ["limit"], message: "Limit cannot exceed 100" };
  //   }
  //   return true;
  // }),

  // Class-level annotations
  Schema.annotations({
    identifier: "List${className}sQuery",
    title: "List ${className}s",
    description: "Query to list ${className}s with pagination and filtering"
  })
) {
  static create(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    // TODO: Add filter parameters
  }) {
    return new List${className}sQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.sortBy !== undefined && { sortBy: params.sortBy }),
      ...(params.sortDirection !== undefined && { sortDirection: params.sortDirection }),
      // TODO: Add filter fields
    });
  }
}`
}

/**
 * Create Search query
 */
function createSearchQuery(className: string) {
  return `/**
 * Query to search ${className}s by text
 */
export class Search${className}sQuery extends Schema.Class<Search${className}sQuery>("Search${className}sQuery")({
  /** Search term */
  searchTerm: Schema.String.pipe(
    Schema.minLength(1)
  ).annotations({
    title: "Search Term",
    description: "Text to search for in ${className}s",
    examples: ["example search"],
    jsonSchema: { minLength: 1 }
  }),

  /** Page number (1-indexed) */
  page: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Page Number",
    description: "Page number for paginated search results",
    examples: [1],
    jsonSchema: { minimum: 1 }
  }),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ).annotations({
    title: "Results Limit",
    description: "Number of search results per page (max 100)",
    examples: [20],
    jsonSchema: { minimum: 1, maximum: 100 }
  }),
}).pipe(
  // TODO: Add search term normalization with Schema.transform()
  // Example:
  // Schema.transform(
  //   Schema.Struct({ /* same fields */ }),
  //   {
  //     decode: (query) => ({
  //       ...query,
  //       searchTerm: query.searchTerm.trim().toLowerCase(), // Normalize
  //     }),
  //     encode: (query) => query
  //   }
  // ),

  // Class-level annotations
  Schema.annotations({
    identifier: "Search${className}sQuery",
    title: "Search ${className}s",
    description: "Query to search ${className}s by text with pagination"
  })
) {
  static create(params: {
    searchTerm: string;
    page?: number;
    limit?: number;
  }) {
    return new Search${className}sQuery({
      searchTerm: params.searchTerm,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });
  }
}`
}
