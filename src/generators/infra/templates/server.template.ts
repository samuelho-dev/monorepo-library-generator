/**
 * Infrastructure Server Export Template
 *
 * Generates server.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { generateStandardErrorExports } from "../../../utils/code-generation/barrel-exports"
import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server.ts file for infrastructure service
 */
export function generateServerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // File header
  builder.addFileHeader({
    title: `@custom-repo/infra-${fileName}/server`,
    description:
      `Server-side exports for ${className} infrastructure service.\nContains service implementations, layers, and server-specific functionality.`,
    module: `@custom-repo/infra-${fileName}/server`
  })

  builder.addRaw(`// Service layers (server-specific)
export {
  ${className}ServiceLive,
  ${className}ServiceTest,
  ${className}ServiceDev,
} from "./lib/layers/server-layers";

// Configuration
export { default${className}Config, get${className}ConfigForEnvironment } from "./lib/service/config";

// Service interface
export { ${className}Service } from "./lib/service/service";

// Memory provider (for testing)
export {
  Memory${className}Provider,
  Memory${className}ProviderLive,
} from "./lib/providers/memory";

// Errors
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
