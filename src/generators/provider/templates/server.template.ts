/**
 * Provider Server Export Template
 *
 * Generates server.ts export file for provider libraries.
 *
 * @module monorepo-library-generator/provider-templates
 */

import { generateStandardErrorExports } from "../../../utils/code-generation/barrel-exports"
import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server.ts file for provider service
 */
export function generateServerFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName } = options

  // File header
  builder.addFileHeader({
    title: `${packageName}/server`,
    description:
      `Server-side exports for ${className} provider.\nContains service implementations, layers, and server-specific functionality.`,
    module: `${packageName}/server`
  })

  builder.addRaw(`// Service implementation
export { ${className} } from "./lib/service";

// Service layers
export {
  ${className}Live,
  ${className}Test,
  ${className}Dev,
  ${className}Auto,
} from "./lib/layers";

// Types and validation
export * from "./lib/types";
export * from "./lib/validation";

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
