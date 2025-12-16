/**
 * Infrastructure Edge Export Template
 *
 * Generates edge.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { generateStandardErrorExports } from "../../../utils/code-generation/barrel-exports"
import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate edge.ts file for infrastructure service
 */
export function generateEdgeFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeEdge } = options

  // Only generate if edge mode is enabled
  if (!includeEdge) {
    return ""
  }

  // File header
  builder.addFileHeader({
    title: `@custom-repo/infra-${fileName}/edge`,
    description:
      `Edge runtime exports for ${className} infrastructure service.\nContains edge-specific layers and functionality for edge runtime environments.`,
    module: `@custom-repo/infra-${fileName}/edge`
  })

  builder.addRaw(`// Edge layers (edge runtime-safe)
export { ${className}ServiceEdgeLayers } from "./lib/layers/edge-layers";

// Service interface
export { ${className}Service } from "./lib/service/service";

// Errors (universal)
`)

  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: "./lib/service/errors",
      unionTypeSuffix: "ServiceError"
    })
  )

  return builder.toString()
}
