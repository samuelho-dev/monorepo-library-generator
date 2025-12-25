/**
 * Infrastructure Errors Template
 *
 * Generates service error definitions using Data.TaggedError.
 * Uses shared error utilities for consistency across all generated libraries.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import { type ErrorGeneratorConfig, generateCommonErrors, generateErrorUnion } from "../../shared/errors"

/**
 * Generate errors file for infrastructure service
 *
 * Uses shared error generators for consistency across all infra templates.
 * Generates: BaseError, NotFoundError, ValidationError, ConflictError,
 * ConfigError, ConnectionError, TimeoutError, InternalError
 */
export function generateErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addFileHeader({
    title: `${className} Service Errors`,
    description: `Domain errors using Data.TaggedError for proper Effect integration.
These errors are NOT serializable (use in internal operations).
For RPC/network boundaries, use Schema.TaggedError instead.

TODO: Customize this file for your service:
1. Define domain-specific error types
2. Add error context (ids, values, reasons)
3. Document error recovery strategies
4. Add helper constructors for error creation`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ["https://effect.website/docs/api/Data/TaggedError for error patterns"]
  })

  // Imports
  builder.addImport("effect", "Data")

  // Section: Core Service Errors
  builder.addSectionComment("Core Service Errors")

  // Use shared error generators with 'data' style (Data.TaggedError)
  const errorConfig: ErrorGeneratorConfig = {
    className,
    style: "data",
    includeStaticCreate: true
  }

  // Generate all common error types using shared utilities
  generateCommonErrors(builder, errorConfig)

  // Section: Error Type Union
  builder.addSectionComment("Error Type Union")

  // Generate error union
  generateErrorUnion(builder, className)

  // TODO comment for customization
  builder.addRaw(`// TODO: Add domain-specific error types here
// Example:
//
// export class ${className}BusinessRuleError extends Data.TaggedError(
//   "${className}BusinessRuleError"
// )<{
//   readonly message: string;
//   readonly rule: string;
// }> {
//   static create(rule: string): ${className}BusinessRuleError {
//     return new ${className}BusinessRuleError({
//       message: \`Business rule violated: \${rule}\`,
//       rule,
//     });
//   }
// }`)

  return builder.toString()
}
