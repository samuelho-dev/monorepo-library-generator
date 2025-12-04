/**
 * Provider Edge Export Template
 *
 * Generates edge.ts export file for provider libraries.
 *
 * @module monorepo-library-generator/provider-templates
 */

import { generateStandardErrorExports } from "../../../utils/code-generation/barrel-export-utils"
import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate edge.ts file for provider service
 */
export function generateEdgeFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName } = options

  // File header
  builder.addFileHeader({
    title: `${packageName}/edge`,
    description:
      `Edge runtime exports for ${className}Service provider.\nContains edge-compatible service implementations (Vercel Edge, Cloudflare Workers, etc.).`,
    module: `${packageName}/edge`
  })

  builder.addRaw(`// Service implementation (edge-compatible)
export { ${className}Service } from "./lib/service";

// Edge-safe types only (no Node.js or browser APIs)
export type * from "./lib/types";

// Errors
`)

  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: "./lib/errors",
      unionTypeSuffix: "ServiceError"
    })
  )

  return builder.toString()
}
