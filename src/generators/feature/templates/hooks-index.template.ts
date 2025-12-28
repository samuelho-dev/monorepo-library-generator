/**
 * Hooks Index Template
 *
 * Generates client/hooks/index.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/hooks-index-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { FeatureTemplateOptions } from '../../../utils/types'

/**
 * Generate client/hooks/index.ts file for feature library
 *
 * Creates named exports for client hooks to comply with biome rules.
 */
export function generateHooksIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // Add file header
  builder.addFileHeader({
    title: 'Client Hooks Barrel Export',
    description: 'Barrel export for client-side hooks'
  })

  // Add named export
  builder.addRaw(`export { use${className}, type Use${className}Return } from "./use-${fileName}"`)
  builder.addBlankLine()

  return builder.toString()
}
