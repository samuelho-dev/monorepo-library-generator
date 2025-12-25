/**
 * Provider Service Index Template
 *
 * Generates service/index.ts barrel file for service internals
 *
 * @module monorepo-library-generator/provider/service/service-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate service/index.ts file
 *
 * The service/ directory contains internals (errors, types, validation, layers).
 * The main service.ts is at lib/ level for clean import resolution:
 *   - import { Service } from "./lib/service" → resolves to lib/service.ts
 *   - import { SomeError } from "./lib/service/errors" → resolves to lib/service/errors.ts
 */
export function generateProviderServiceIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Internals`,
    description: `Barrel exports for service supporting modules.

Structure:
  lib/service.ts        - Main service (Context.Tag with static layers)
  lib/service/          - Service internals (this directory)
    errors.ts           - Error types
    types.ts            - Service types
    validation.ts       - Validation helpers
    layers.ts           - Layer compositions
    index.ts            - This barrel file

Import patterns:
  import { ${className} } from '${scope}/provider-${fileName}'  // Main service
  import { ${className}Error } from '${scope}/provider-${fileName}/service/errors'  // Direct error import`,
    module: `${scope}/provider-${fileName}/service`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export service internals")
  builder.addBlankLine()

  builder.addRaw(`// Error types
export * from "./errors";

// Service types
export * from "./types";

// Validation helpers
export * from "./validation";

// Layer compositions
export * from "./layers";`)

  return builder.toString()
}
