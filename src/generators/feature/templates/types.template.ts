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

  // Add Config interface
  builder.addRaw(`/**
 * Service configuration
 *
 * Add configuration fields as needed for your service
 */
export type ${className}Config = Record<string, never>;`)
  builder.addBlankLine()

  // Add Result interface
  builder.addRaw(`/**
 * Service operation result
 *
 * Add result fields as needed for your service operations
 */
export type ${className}Result = Record<string, never>;`)
  builder.addBlankLine()

  return builder.toString()
}
