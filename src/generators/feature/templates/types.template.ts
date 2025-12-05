/**
 * Shared Types Template
 *
 * Generates shared/types.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/types-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate shared/types.ts file for feature library
 *
 * Creates shared type definitions for the domain.
 */
export function generateTypesFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Types`,
    description: `Shared type definitions for ${name} domain.`,
    module: `@custom-repo/feature-${name}/shared/types`
  })

  // Add TODO comment
  builder.addComment("TODO: Add domain types")

  // Add Config interface with eslint-disable
  builder.addRaw(`/**
 * TODO: Add configuration fields
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ${className}Config {
}`)
  builder.addBlankLine()

  // Add Result interface with eslint-disable
  builder.addRaw(`/**
 * TODO: Add result fields
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ${className}Result {
}`)
  builder.addBlankLine()

  return builder.toString()
}
