/**
 * Repository Index Template
 *
 * Generates repository/index.ts barrel file
 *
 * @module monorepo-library-generator/data-access/repository/repository-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/index.ts file
 *
 * Creates barrel export for repository interface and all operations
 */
export function generateRepositoryIndexFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Repository`,
    description: `Complete repository implementation with granular operation exports.

Import options (from most optimal to most convenient):

1. Granular (smallest bundle):
   import { createOperations } from '@scope/data-access-${fileName}/repository/operations/create'

2. Operation category:
   import { createOperations, readOperations } from '@scope/data-access-${fileName}/repository/operations'

3. Full repository:
   import { ${className}Repository } from '@scope/data-access-${fileName}/repository'

4. Package barrel (largest bundle):
   import { ${className}Repository } from '@scope/data-access-${fileName}'`,
    module: `@custom-repo/data-access-${fileName}/repository`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export repository interface and tag")
  builder.addBlankLine()

  builder.addRaw(`export { ${className}Repository } from "./repository"
export type { ${className}RepositoryInterface } from "./repository"`)
  builder.addBlankLine()

  builder.addSectionComment("Re-export all operations")
  builder.addBlankLine()

  builder.addRaw(`export type {
  Aggregate${className}Operations,
  Create${className}Operations,
  Delete${className}Operations,
  Read${className}Operations,
  Update${className}Operations
} from "./operations"

export {
  aggregateOperations,
  createOperations,
  deleteOperations,
  readOperations,
  updateOperations
} from "./operations"`)

  return builder.toString()
}
