/**
 * Data Access Index Template Definition
 *
 * Declarative template for generating index.ts barrel export in data-access libraries.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/index-barrel
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Data Access Index Template Definition
 *
 * Generates a complete index.ts file with exports for:
 * - Error types (from shared/)
 * - Domain types (from shared/)
 * - Validation functions (from shared/)
 * - Query builders (from queries.ts)
 * - Repository (Effect 3.0+ pattern)
 */
export const dataAccessIndexTemplate: TemplateDefinition = {
  id: "data-access/index",
  meta: {
    title: "{className} Data Access Library",
    description: `Type-safe data access layer for {propertyName} domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from {scope}/contract-{fileName}`,
    module: "{scope}/data-access-{fileName}"
  },
  imports: [],
  sections: [
    // Error Types
    {
      title: "Error Types (from shared/)",
      content: {
        type: "raw",
        value: `export {
  {className}ConnectionError,
  {className}TimeoutError,
  {className}TransactionError,
  type {className}InfrastructureError,
  type {className}DataAccessError
} from "./lib/shared/errors"`
      }
    },
    // Domain Types
    {
      title: "Domain Types (from shared/)",
      content: {
        type: "raw",
        value: `export type {
  {className},
  {className}CreateInput,
  {className}Filter,
  {className}Sort,
  {className}UpdateInput
} from "./lib/shared/types"`
      }
    },
    {
      content: {
        type: "raw",
        value: `export type {
  PaginatedResponse,
  PaginationOptions,
  QueryOptions,
  SortDirection
} from "./lib/shared/types"`
      }
    },
    // Validation Functions
    {
      title: "Validation Functions (from shared/)",
      content: {
        type: "raw",
        value: `export {
  is{className},
  isValid{className}CreateInput,
  isValid{className}UpdateInput,
  validate{className}CreateInput,
  validate{className}Filter,
  validate{className}Id,
  validate{className}UpdateInput,
  validatePagination
} from "./lib/shared/validation"`
      }
    },
    // Query Builders
    {
      title: "Query Builders (from queries.ts)",
      content: {
        type: "raw",
        value: `export {
  buildCountQuery,
  buildFindAllQuery,
  buildFindByIdQuery
} from "./lib/queries"`
      }
    },
    {
      content: {
        type: "raw",
        value: `export type { {className}QueryFilters } from "./lib/queries"

export type { PaginationOptions as QueryPaginationOptions } from "./lib/queries"`
      }
    },
    // Repository
    {
      title: "Repository (Effect 3.0+ Pattern)",
      content: {
        type: "raw",
        value: `// Repository (Effect 3.0+ Pattern: Static Members)
// Export the {className}Repository Context.Tag class.
// Layers are accessed via static members:
//   - {className}Repository.Live  (production)
//   - {className}Repository.Test  (testing)
//
// MIGRATION from pre-3.0 pattern:
// OLD: import { {className}RepositoryLive } from "{scope}/data-access-{fileName}";
// NEW: import { {className}Repository } from "{scope}/data-access-{fileName}";
//      const layer = {className}Repository.Live;

export { {className}Repository } from "./lib/repository"`
      }
    }
  ]
}

export default dataAccessIndexTemplate
