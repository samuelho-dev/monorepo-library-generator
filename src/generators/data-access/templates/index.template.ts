/**
 * Data Access Index Template
 *
 * Generates index.ts file for data-access libraries with all exports.
 *
 * @module monorepo-library-generator/data-access/index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { generateStandardErrorExports } from "../../../utils/templates"
import type { DataAccessTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate index.ts file for data-access library
 *
 * Creates main entry point with all exports organized by category
 */
export function generateIndexFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Data Access Library`,
    description: `Type-safe data access layer for ${domainName} domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from ${scope}/contract-${fileName}`,
    module: `${scope}/data-access-${fileName}`
  })

  // Error Types section
  builder.addSectionComment("Error Types (from shared/)")
  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: "./lib/shared/errors",
      unionTypeSuffix: "RepositoryError"
    })
  )
  builder.addBlankLine()

  // Domain Types section
  builder.addSectionComment("Domain Types (from shared/)")
  builder.addRaw(`export type {
  ${className},
  ${className}CreateInput,
  ${className}Filter,
  ${className}Sort,
  ${className}UpdateInput
} from "./lib/shared/types"`)
  builder.addBlankLine()

  builder.addRaw(`export type {
  PaginatedResponse,
  PaginationOptions,
  QueryOptions,
  SortDirection
} from "./lib/shared/types"`)
  builder.addBlankLine()

  // Validation Functions section
  builder.addSectionComment("Validation Functions (from shared/)")
  builder.addRaw(`export {
  is${className},
  isValid${className}CreateInput,
  isValid${className}UpdateInput,
  validate${className}CreateInput,
  validate${className}Filter,
  validate${className}Id,
  validate${className}UpdateInput,
  validatePagination
} from "./lib/shared/validation"`)
  builder.addBlankLine()

  // Query Builders section
  builder.addSectionComment("Query Builders (from queries.ts)")
  builder.addRaw(`export {
  buildCountQuery,
  buildFindAllQuery,
  buildFindByIdQuery
} from "./lib/queries"`)
  builder.addBlankLine()

  builder.addRaw(`export type { ${className}QueryFilters } from "./lib/queries"`)
  builder.addBlankLine()

  builder.addRaw(
    `export type { PaginationOptions as QueryPaginationOptions } from "./lib/queries"`
  )
  builder.addBlankLine()

  // Repository section with Effect 3.0+ pattern documentation
  builder.addComment(`Repository (Effect 3.0+ Pattern: Static Members)`)
  builder.addComment(`Export the ${className}Repository Context.Tag class.`)
  builder.addComment(`Layers are accessed via static members:`)
  builder.addComment(`  - ${className}Repository.Live  (production)`)
  builder.addComment(`  - ${className}Repository.Test  (testing)`)
  builder.addBlankLine()
  builder.addComment(`MIGRATION from pre-3.0 pattern:`)
  builder.addComment(
    `OLD: import { ${className}RepositoryLive } from "${scope}/data-access-${fileName}";`
  )
  builder.addComment(
    `NEW: import { ${className}Repository } from "${scope}/data-access-${fileName}";`
  )
  builder.addComment(`     const layer = ${className}Repository.Live;`)
  builder.addBlankLine()

  builder.addRaw(`export { ${className}Repository } from "./lib/repository"`)

  return builder.toString()
}
