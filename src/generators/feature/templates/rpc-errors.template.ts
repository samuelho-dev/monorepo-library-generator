/**
 * RPC Errors Template
 *
 * Generates rpc/errors.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/rpc-errors-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate rpc/errors.ts file for feature library
 *
 * Creates schema-based errors for RPC boundary.
 */
export function generateRpcErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Errors`,
    description: `Schema-based errors for RPC boundary.
Use Schema.TaggedError for errors that need to cross RPC boundaries.`
  })

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])
  builder.addBlankLine()

  // Add RPC error class
  builder.addRaw(`/**
 * RPC Error for ${name}
 *
 * Use this error type at the RPC boundary for serializable errors.
 */
export class ${className}RpcError extends Schema.TaggedError<${className}RpcError>()(
  "${className}RpcError",
  {
    message: Schema.String,
    code: Schema.String,
  }
) {}`)
  builder.addBlankLine()

  builder.addComment("Note: Use Schema.TaggedError ONLY for RPC boundaries")
  builder.addComment(
    "For domain errors, use Data.TaggedError in ../shared/errors.ts"
  )
  builder.addBlankLine()

  return builder.toString()
}
