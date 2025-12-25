/**
 * Hooks Index Template
 *
 * Generates client/hooks/index.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/hooks-index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"

/**
 * Generate client/hooks/index.ts file for feature library
 *
 * Creates barrel export for client hooks.
 */
export function generateHooksIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { fileName } = options

  // Add file header
  builder.addFileHeader({
    title: "Client Hooks Barrel Export",
    description: "Barrel export for client-side hooks"
  })

  // Add export
  builder.addRaw(`export * from "./use-${fileName}";`)
  builder.addBlankLine()

  return builder.toString()
}
