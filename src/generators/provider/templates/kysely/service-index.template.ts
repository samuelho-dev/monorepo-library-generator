/**
 * Kysely Provider Service Index Template
 *
 * Generates service/index.ts barrel file for Kysely provider internals.
 * The service/ directory contains errors; service.ts is at lib/ level.
 *
 * @module monorepo-library-generator/provider/templates/kysely/service-index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate Kysely service/index.ts file
 *
 * The service/ directory contains internals (errors).
 * The main service.ts is at lib/ level for clean import resolution:
 *   - import { Kysely } from "./lib/service" → resolves to lib/service.ts
 *   - import { KyselyError } from "./lib/service/errors" → resolves to lib/service/errors.ts
 */
export function generateKyselyProviderServiceIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Internals`,
    description: `Barrel exports for Kysely service supporting modules.

Structure:
  lib/service.ts        - Main service (Context.Tag with static layers)
  lib/service/          - Service internals (this directory)
    errors.ts           - Kysely-specific error types
    index.ts            - This barrel file

Import patterns:
  import { ${className} } from '${scope}/provider-${fileName}'  // Main service
  import { ${className}Error } from '${scope}/provider-${fileName}/service/errors'  // Direct error import`,
    module: `${scope}/provider-${fileName}/service`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export service internals")
  builder.addBlankLine()

  // Kysely only has errors in service/ - no types, validation, or layers
  builder.addComment("Kysely-specific error types")
  builder.addRaw(`export {
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}QueryError,
  ${className}MigrationError,
  ${className}TransactionError,
  type ${className}Error
} from "./errors"`)

  return builder.toString()
}
