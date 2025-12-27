/**
 * Contract Queries Template Definition
 *
 * Declarative template for generating queries.ts in contract libraries.
 * Contains CQRS query patterns using Schema.Class.
 *
 * @module monorepo-library-generator/templates/definitions/contract/queries
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Queries Template Definition
 *
 * Generates a complete queries.ts file with:
 * - CRUD queries (Get, List, Search)
 * - Pagination support
 * - Query union types
 * - Schema union for validation
 */
export const contractQueriesTemplate: TemplateDefinition = {
  id: "contract/queries",
  meta: {
    title: "{className} Queries (CQRS Read Operations)",
    description: `Queries represent read intentions without side effects.
They define what data to fetch and how to filter it.

TODO: Customize for your domain:
1. Add domain-specific query parameters
2. Add filter and sort options
3. Add Schema.annotations() for OpenAPI/documentation
4. Add Schema.filter() for parameter validation
5. Add Schema.transform() for search term normalization
6. Create custom queries for common patterns
7. Add pagination support`,
    module: "{scope}/contract-{fileName}/queries"
  },
  imports: [
    { from: "effect", items: ["Schema"] },
    { from: "./rpc-definitions", items: ["{className}Id"] }
  ],
  sections: [
    // Get Query
    {
      title: "CRUD Queries",
      content: {
        type: "raw",
        value: `/**
 * Query to get a single {className} by ID
 *
 * @example
 * \`\`\`typescript
 * const query = Get{className}Query.create("..." as {className}Id)
 * \`\`\`
 */
export class Get{className}Query extends Schema.Class<Get{className}Query>("Get{className}Query")({
  /** {className} ID to fetch (branded type for type safety) */
  {propertyName}Id: {className}Id.annotations({
    title: "{className} ID",
    description: "Branded UUID of the {className} to retrieve"
  })
}) {
  /**
   * Create a get query for the specified ID
   */
  static create({propertyName}Id: {className}Id) {
    return new Get{className}Query({ {propertyName}Id })
  }
}`
      }
    },
    // List Query
    {
      content: {
        type: "raw",
        value: `/**
 * Query to list {className}s with filters and pagination
 *
 * @example
 * \`\`\`typescript
 * const query = List{className}sQuery.create({ page: 1, limit: 20 })
 * \`\`\`
 */
export class List{className}sQuery extends Schema.Class<List{className}sQuery>("List{className}sQuery")({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Page Number",
    description: "Page number (1-indexed) for pagination"
  }),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ).annotations({
    title: "Page Limit",
    description: "Number of items per page (max 100)"
  }),

  /** Sort field */
  sortBy: Schema.optional(Schema.String).annotations({
    title: "Sort Field",
    description: "Field name to sort by"
  }),

  /** Sort direction */
  sortDirection: Schema.optional(Schema.Literal("asc", "desc")).annotations({
    title: "Sort Direction",
    description: "Sort direction (ascending or descending)"
  }),

  // TODO: Add domain-specific filter fields
  // status: Schema.optional(Schema.String),
  // ownerId: Schema.optional(Schema.UUID)
}) {
  /**
   * Create a list query with pagination
   */
  static create(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc"
  } = {}) {
    return new List{className}sQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.sortBy !== undefined && { sortBy: params.sortBy }),
      ...(params.sortDirection !== undefined && { sortDirection: params.sortDirection }),
    })
  }
}`
      }
    },
    // Search Query
    {
      content: {
        type: "raw",
        value: `/**
 * Query to search {className}s by text
 *
 * @example
 * \`\`\`typescript
 * const query = Search{className}sQuery.create({ searchTerm: "example" })
 * \`\`\`
 */
export class Search{className}sQuery extends Schema.Class<Search{className}sQuery>("Search{className}sQuery")({
  /** Search term */
  searchTerm: Schema.String.pipe(
    Schema.minLength(1)
  ).annotations({
    title: "Search Term",
    description: "Text to search for in {className}s"
  }),

  /** Page number (1-indexed) */
  page: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Page Number",
    description: "Page number for paginated search results"
  }),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ).annotations({
    title: "Results Limit",
    description: "Number of search results per page (max 100)"
  })
}) {
  /**
   * Create a search query with pagination
   */
  static create(params: {
    searchTerm: string;
    page?: number;
    limit?: number
  }) {
    return new Search{className}sQuery({
      searchTerm: params.searchTerm,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    })
  }
}`
      }
    },
    // TODO comment for custom queries
    {
      content: {
        type: "raw",
        value: `// TODO: Add domain-specific queries here
// Example - Get by slug query:
//
// export class Get{className}BySlugQuery extends Schema.Class<Get{className}BySlugQuery>("Get{className}BySlugQuery")({
//   slug: Schema.String,
// }) {
//   static create(slug: string) { ... }
// }`
      }
    },
    // Query Union Type Section
    {
      title: "Query Union Type",
      content: {
        type: "raw",
        value: `/**
 * Union of all {propertyName} queries
 */
export type {className}Query =
  | Get{className}Query
  | List{className}sQuery
  | Search{className}sQuery

// TODO: Add custom queries to this union`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Schema for {className}Query union
 */
export const {className}QuerySchema = Schema.Union(
  Get{className}Query,
  List{className}sQuery,
  Search{className}sQuery
  // TODO: Add custom query schemas
)`
      }
    }
  ]
}

export default contractQueriesTemplate
