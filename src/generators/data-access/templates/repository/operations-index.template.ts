/**
 * Repository Operations Index Template
 *
 * Generates repository/operations/index.ts barrel file
 *
 * @module monorepo-library-generator/data-access/repository/operations-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/index.ts file
 *
 * Creates barrel export for all operation modules
 */
export function generateRepositoryOperationsIndexFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Repository Operations`,
    description: `Barrel exports for all repository operations.

For optimal bundle size, import specific operations:
  import { createOperations } from '@scope/data-access-${fileName}/repository/operations/create'
  import { readOperations } from '@scope/data-access-${fileName}/repository/operations/read'

For convenience, import from this barrel:
  import { createOperations, readOperations } from '@scope/data-access-${fileName}/repository/operations'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export all operations")
  builder.addBlankLine()

  builder.addRaw(`// Create operations
export type { Create${className}Operations } from "./create"
export { createOperations } from "./create"

// Read operations
export type { Read${className}Operations } from "./read"
export { readOperations } from "./read"

// Update operations
export type { Update${className}Operations } from "./update"
export { updateOperations } from "./update"

// Delete operations
export type { Delete${className}Operations } from "./delete"
export { deleteOperations } from "./delete"

// Aggregate operations
export type { Aggregate${className}Operations } from "./aggregate"
export { aggregateOperations } from "./aggregate"`)

  return builder.toString()
}
