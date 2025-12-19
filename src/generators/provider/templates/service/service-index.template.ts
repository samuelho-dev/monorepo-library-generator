/**
 * Provider Service Index Template
 *
 * Generates service/index.ts barrel file
 *
 * @module monorepo-library-generator/provider/service/service-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/index.ts file
 *
 * Creates barrel export for service interface and operations
 */
export function generateProviderServiceIndexFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-${fileName}/service/operations/create'

2. Service tag:
   import { ${className} } from '@scope/provider-${fileName}/service'

3. Type-only:
   import type { ${className}ServiceInterface } from '@scope/provider-${fileName}/service'

4. Package barrel (largest):
   import { ${className} } from '@scope/provider-${fileName}'`,
    module: `@custom-repo/provider-${fileName}/service`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export service interface and tag")
  builder.addBlankLine()

  builder.addRaw(`export { ${className} } from "./service";
export type { ${className}ServiceInterface } from "./service";`)

  return builder.toString()
}
