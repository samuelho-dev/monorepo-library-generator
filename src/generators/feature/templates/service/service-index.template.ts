/**
 * Feature Service Index Template
 *
 * Generates server/services/index.ts barrel file
 *
 * @module monorepo-library-generator/feature/service/service-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { createNamingVariants } from "../../../../utils/naming"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/services/index.ts file
 *
 * Creates barrel export for main service and sub-modules
 */
export function generateFeatureServiceIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Services`,
    description: `Services barrel exports for ${className} domain.

Import options:

1. Main service:
   import { ${className}Service } from '${scope}/feature-${fileName}/server/services'

2. Type-only:
   import type { ${className}ServiceInterface } from '${scope}/feature-${fileName}/server/services'

3. Sub-modules:
   import { AuthenticationService, ProfileService } from '${scope}/feature-${fileName}/server/services'`,
    module: `${scope}/feature-${fileName}/server/services`
  })

  builder.addSectionComment("Main Service")

  builder.addRaw(`export { ${className}Service } from "./service"
export type { ${className}ServiceInterface } from "./service"
`)
  builder.addBlankLine()

  // Export sub-modules if present
  if (options.subModules && options.subModules.length > 0) {
    builder.addSectionComment("Sub-Module Services")

    for (const subModule of options.subModules) {
      const subClassName = createNamingVariants(subModule).className
      builder.addRaw(
        `export { ${subClassName}Service, ${subClassName}Live, ${subClassName}Test } from "./${subModule}"
`
      )
    }
  }

  return builder.toString()
}
