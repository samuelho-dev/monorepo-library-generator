/**
 * Repository Operations Index Template
 *
 * Generates repository/operations/index.ts barrel file
 *
 * @module monorepo-library-generator/data-access/repository/operations-index-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { DataAccessTemplateOptions } from '../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

/**
 * Generate repository/operations/index.ts file
 *
 * Creates barrel export for all operation modules
 */
export function generateRepositoryOperationsIndexFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Repository Operations`,
    description: `Barrel exports for all repository operations.

For optimal bundle size, import specific operations:
  import { createOperations } from '@scope/data-access-${fileName}/repository/operations/create'
  import { readOperations } from '@scope/data-access-${fileName}/repository/operations/read'

For convenience, import from this barrel:
  import { createOperations, readOperations } from '@scope/data-access-${fileName}/repository/operations'`,
    module: `${scope}/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addSectionComment('Re-export all operations')
  builder.addBlankLine()

  builder.addRaw(`export { aggregateOperations, type Aggregate${className}Operations } from "./aggregate"
export { createOperations, type Create${className}Operations } from "./create"
export { deleteOperations, type Delete${className}Operations } from "./delete"
export { readOperations, type Read${className}Operations } from "./read"
export { updateOperations, type Update${className}Operations } from "./update"`)

  return builder.toString()
}
