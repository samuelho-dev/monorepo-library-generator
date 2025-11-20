/**
 * Contract Queries Template
 *
 * Generates queries.ts file for contract libraries with CQRS query
 * definitions using Schema.Class for read operations.
 *
 * @module monorepo-library-generator/contract/queries-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ContractTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate queries.ts file for contract library
 *
 * Creates CQRS query definitions with:
 * - CRUD queries (Get, List, Search)
 * - Pagination support
 * - Filter and sort options
 * - Query union types
 */
export function generateQueriesFile(options: ContractTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);

  builder.addImports([
    { from: './entities', imports: [`${className}Id`], isTypeOnly: true },
  ]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: CRUD Queries
  // ============================================================================

  builder.addSectionComment('CRUD Queries');
  builder.addBlankLine();

  // Get query
  builder.addRaw(createGetQuery(className, propertyName));
  builder.addBlankLine();

  // List query
  builder.addRaw(createListQuery(className));
  builder.addBlankLine();

  // Search query
  builder.addRaw(createSearchQuery(className));
  builder.addBlankLine();

  // TODO comment for custom queries
  builder.addComment('TODO: Add domain-specific queries here');
  builder.addComment('Example - Get by slug query:');
  builder.addComment('');
  builder.addComment(
    `export class Get${className}BySlugQuery extends Schema.Class<Get${className}BySlugQuery>("Get${className}BySlugQuery")({`,
  );
  builder.addComment('  slug: Schema.String,');
  builder.addComment('}) {');
  builder.addComment('  static create(slug: string) { ... }');
  builder.addComment('}');
  builder.addBlankLine();

  // ============================================================================
  // SECTION 2: Query Union Type
  // ============================================================================

  builder.addSectionComment('Query Union Type');
  builder.addBlankLine();

  builder.addTypeAlias({
    name: `${className}Query`,
    type: `
  | Get${className}Query
  | List${className}sQuery
  | Search${className}sQuery`,
    exported: true,
    jsdoc: `Union of all ${domainName} queries`,
  });

  builder.addComment('TODO: Add custom queries to this union');
  builder.addBlankLine();

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
`);

  return builder.toString();
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string,
): string {
  return `/**
 * ${className} Queries (CQRS Read Operations)
 *
 * Queries represent read intentions without side effects.
 * They define what data to fetch and how to filter it.
 *
 * TODO: Customize for your domain:
 * 1. Add domain-specific query parameters
 * 2. Add filter and sort options
 * 3. Create custom queries for common patterns
 * 4. Add pagination support
 *
 * @module @custom-repo/contract-${fileName}/queries
 */`;
}

/**
 * Create Get query
 */
function createGetQuery(className: string, propertyName: string): string {
  return `/**
 * Query to get a single ${className} by ID
 */
export class Get${className}Query extends Schema.Class<Get${className}Query>("Get${className}Query")({
  /** ${className} ID to fetch */
  ${propertyName}Id: Schema.UUID,
}) {
  static create(${propertyName}Id: ${className}Id) {
    return new Get${className}Query({
      ${propertyName}Id,
    });
  }
}`;
}

/**
 * Create List query
 */
function createListQuery(className: string): string {
  return `/**
 * Query to list ${className}s with filters and pagination
 */
export class List${className}sQuery extends Schema.Class<List${className}sQuery>("List${className}sQuery")({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(Schema.int(), Schema.positive()),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ),

  /** Sort field */
  sortBy: Schema.optional(Schema.String),

  /** Sort direction */
  sortDirection: Schema.optional(Schema.Literal("asc", "desc")),

  // TODO: Add domain-specific filter fields
  // Example filters:
  //
  // /** Filter by status */
  // status: Schema.optional(Schema.String),
  //
  // /** Filter by owner */
  // ownerId: Schema.optional(Schema.UUID),
  //
  // /** Search term */
  // search: Schema.optional(Schema.String),
}) {
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
}`;
}

/**
 * Create Search query
 */
function createSearchQuery(className: string): string {
  return `/**
 * Query to search ${className}s by text
 */
export class Search${className}sQuery extends Schema.Class<Search${className}sQuery>("Search${className}sQuery")({
  /** Search term */
  searchTerm: Schema.String.pipe(Schema.minLength(1)),

  /** Page number (1-indexed) */
  page: Schema.Number.pipe(Schema.int(), Schema.positive()),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ),
}) {
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
}`;
}
