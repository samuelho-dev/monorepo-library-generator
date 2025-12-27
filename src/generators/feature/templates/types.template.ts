/**
 * Shared Types Template
 *
 * Generates shared/types.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/types-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { FeatureTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

/**
 * Generate shared/types.ts file for feature library
 *
 * Creates shared type definitions for the domain.
 */
export function generateTypesFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Types`,
    description: `Shared type definitions for ${name} domain.`,
    module: `${scope}/feature-${fileName}/shared/types`
  })

  // Add Config interface
  builder.addRaw(`/**
 * Service configuration
 *
 * Add configuration fields as needed for your service
 */
export type ${className}Config = Record<string, never>`)
  builder.addBlankLine()

  // Note about types - no explicit Result type needed
  builder.addRaw(`// Types are inferred from service implementation.
// The repository's return types flow through naturally.
// See server/services/service.ts for the implementation.`)

  return builder.toString()
}
