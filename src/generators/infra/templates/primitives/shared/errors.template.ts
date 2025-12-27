/**
 * Primitive Errors Template
 *
 * Generates Data.TaggedError based errors for primitive infrastructure services.
 * Uses shared error utilities to ensure consistency across all generated libraries.
 *
 * Note: Primitives are internal services, not RPC boundaries.
 * They use Data.TaggedError (non-serializable) for internal error handling.
 * Schema.TaggedError is reserved for RPC boundary errors only (in infra-rpc).
 *
 * @module monorepo-library-generator/infra-templates/primitives/shared
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"
import {
  type ErrorGeneratorConfig,
  generateBaseError,
  generateConfigError,
  generateConnectionError,
  generateInternalError,
  generateTimeoutError
} from "../../../../shared/errors"

/**
 * Generate errors.ts file for primitive infrastructure services
 *
 * Uses shared error utilities with 'data' style for Data.TaggedError pattern.
 * Primitives are internal services - Schema.TaggedError is only for RPC boundary.
 */
export function generatePrimitiveErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Errors`,
    description: `Error types for ${className} infrastructure service.

Uses Data.TaggedError for internal infrastructure errors:
- Discriminated union types (pattern matching with Effect.catchTag)
- Non-serializable (stays within service boundaries)
- Transformed to RPC errors at handler boundaries`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ["Effect documentation for Data.TaggedError patterns"]
  })

  builder.addImports([
    {
      from: "effect",
      imports: ["Data"]
    }
  ])

  builder.addSectionComment("Error Types")

  // Use shared error generators with 'data' style (internal services)
  const errorConfig: ErrorGeneratorConfig = {
    className,
    style: "data",
    includeStaticCreate: false // Keep consistent with other infra errors
  }

  // Generate standard infrastructure errors
  generateBaseError(builder, errorConfig)
  generateInternalError(builder, errorConfig)
  generateConfigError(builder, errorConfig)
  generateConnectionError(builder, errorConfig)
  generateTimeoutError(builder, errorConfig)

  builder.addSectionComment("Error Type Union")

  // Generate error union
  // Note: Uses ServiceError suffix for base error to avoid conflict with union type
  builder.addRaw(`/**
 * Union of all ${className} error types
 *
 * Use for comprehensive error handling:
 * @example
 * \`\`\`typescript
 * Effect.catchTag("${className}InternalError", (err) => ...)
 * Effect.catchTag("${className}TimeoutError", (err) => ...)
 * \`\`\`
 */
export type ${className}ServiceError =
  | ${className}Error
  | ${className}InternalError
  | ${className}ConfigError
  | ${className}ConnectionError
  | ${className}TimeoutError
`)

  return builder.toString()
}
