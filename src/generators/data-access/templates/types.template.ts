/**
 * Data Access Types Template
 *
 * Generates types.ts file for data-access libraries with shared type definitions.
 *
 * @module monorepo-library-generator/data-access/types-template
 */

import {
  addPaginatedResponse,
  addPaginationOptions,
  addSortDirection,
} from '../../../utils/code-generation/type-template-utils';
import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { DataAccessTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate types.ts file for data-access library
 *
 * Creates shared type definitions including:
 * - Core entity types
 * - Filter and query types
 * - Response types
 * - Helper type utilities
 */
export function generateTypesFile(options: DataAccessTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} Shared Type Definitions`,
    description: `Common types used across the data-access layer for ${className} operations.
Provides shared domain types, filters, and query options.

TODO: Customize this file:
1. Define domain-specific types (entity, DTOs, etc.)
2. Create filter and search interfaces
3. Define query options and sort criteria
4. Add type-safe builder patterns if needed`,
    module: `@custom-repo/data-access-${fileName}/server`,
  });

  // Core Entity Types
  builder.addSectionComment('Core Entity Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Entity
 *
 * TODO: Replace with actual entity type/interface
 * Should include:
 * - id: unique identifier
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - domain-specific properties
 *
 * @example
 * \`\`\`typescript
 * interface Product {
 *   id: string;
 *   name: string;
 *   price: number;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 * \`\`\`
 */
export interface ${className} {
  readonly id: string;
  // TODO: Add entity properties
  readonly createdAt: Date;
  readonly updatedAt: Date;
}`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Creation Input
 *
 * DTO for creating new ${className} entities.
 * Omits auto-generated fields (id, createdAt, updatedAt).
 *
 * TODO: Replace with actual creation input type
 * Should include domain-specific properties but exclude:
 * - id (auto-generated)
 * - createdAt (auto-generated)
 * - updatedAt (auto-generated)
 *
 * @example
 * \`\`\`typescript
 * interface CreateProductInput {
 *   name: string;
 *   price: number;
 * }
 * \`\`\`
 */
export type ${className}CreateInput = Omit<
  ${className},
  'id' | 'createdAt' | 'updatedAt'
>;`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Update Input
 *
 * DTO for updating existing ${className} entities.
 * All properties are optional for partial updates.
 *
 * TODO: Replace with actual update input type
 * Can include any subset of entity properties.
 *
 * @example
 * \`\`\`typescript
 * interface UpdateProductInput {
 *   name?: string;
 *   price?: number;
 * }
 * \`\`\`
 */
export type ${className}UpdateInput = Partial<
  Omit<${className}, 'id' | 'createdAt' | 'updatedAt'>
>;`);
  builder.addBlankLine();

  // Filter & Query Types
  builder.addSectionComment('Filter & Query Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Filter Options
 *
 * TODO: Add domain-specific filter properties
 * Examples:
 * - status?: 'active' | 'inactive'
 * - search?: string
 * - createdAfter?: Date
 * - categories?: string[]
 *
 * @example
 * \`\`\`typescript
 * interface ProductFilter {
 *   status?: 'active' | 'inactive';
 *   minPrice?: number;
 *   maxPrice?: number;
 *   categoryId?: string;
 * }
 * \`\`\`
 */
export interface ${className}Filter {
  // TODO: Add filter properties
  readonly search?: string;
}`);
  builder.addBlankLine();

  // Add query types using utility (SortDirection, Sort, Pagination)
  addSortDirection(builder);
  builder.addBlankLine();

  builder.addComment(`${className} Sort Options`);
  builder.addComment('TODO: Add domain-specific sortable fields');
  builder.addComment('Examples: createdAt, updatedAt, name, price');
  builder.addRaw(`export interface ${className}Sort {
  readonly field: string; // TODO: Use union of sortable fields
  readonly direction: SortDirection;
}`);
  builder.addBlankLine();

  builder.addComment('Pagination Options');
  builder.addComment('Standard pagination parameters for list queries.');
  addPaginationOptions(builder);
  builder.addBlankLine();

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
}`);
  builder.addBlankLine();

  // Response Types
  builder.addSectionComment('Response Types');
  builder.addBlankLine();

  builder.addComment('Paginated List Response');
  builder.addComment('Standard paginated response format for list queries.');
  addPaginatedResponse(builder);
  builder.addBlankLine();

  // Helper Type Utilities
  builder.addSectionComment('Helper Type Utilities');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Make all properties of T required
 *
 * Useful for ensuring complete entity data
 */
export type Required<T> = {
  [K in keyof T]-?: T[K];
};`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * Make all properties of T readonly
 *
 * Useful for ensuring immutability
 */
export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: ReadonlyDeep<T[K]>;
};
`);

  return builder.toString();
}
