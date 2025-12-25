/**
 * Contract RPC Errors Template
 *
 * Generates rpc-errors.ts file for contract libraries with Schema.TaggedError
 * types for RPC-serializable errors.
 *
 * Note: RPC definitions (Rpc.make) are now in rpc-definitions.template.ts
 * This file only contains the error types for backward compatibility.
 *
 * @module monorepo-library-generator/contract/rpc-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate rpc-errors.ts file for contract library
 *
 * Creates RPC error types using Schema.TaggedError for network serialization.
 * These are separate from domain errors (Data.TaggedError in errors.ts).
 */
export function generateRpcErrorsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addRaw(createRpcErrorsHeader(className, fileName, scope))

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])
  builder.addBlankLine()

  // RPC Errors
  builder.addSectionComment("RPC Errors (Schema.TaggedError for serialization)")
  builder.addBlankLine()

  builder.addRaw(createRpcErrors(className, propertyName))

  return builder.toString()
}

/**
 * Generate rpc.ts file for contract library (legacy - for backward compatibility)
 *
 * @deprecated Use generateRpcErrorsFile and generateRpcDefinitionsFile instead
 */
export function generateRpcFile(options: ContractTemplateOptions) {
  // This now generates rpc-errors.ts content for backward compatibility
  // New code should use the separate files
  return generateRpcErrorsFile(options)
}

/**
 * Create RPC errors file header
 */
function createRpcErrorsHeader(className: string, fileName: string, scope: string) {
  return `/**
 * ${className} RPC Errors
 *
 * Schema.TaggedError types for RPC-serializable errors.
 * These are used at the network boundary for client/server communication.
 *
 * Note: Domain errors use Data.TaggedError (in errors.ts).
 * RPC errors use Schema.TaggedError (this file) for JSON serialization.
 *
 * @module ${scope}/contract-${fileName}/rpc-errors
 */`
}

/**
 * Create RPC errors
 */
function createRpcErrors(className: string, propertyName: string) {
  return `/**
 * RPC error for ${className} not found
 *
 * Uses Schema.TaggedError for network serialization (unlike Data.TaggedError in errors.ts)
 */
export class ${className}NotFoundRpcError extends Schema.TaggedError<${className}NotFoundRpcError>()(
  "${className}NotFoundRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable error message"
    }),
    ${propertyName}Id: Schema.String.annotations({
      title: "${className} ID",
      description: "ID of the ${className} that was not found"
    })
  },
  {
    identifier: "${className}NotFoundRpcError",
    title: "${className} Not Found Error",
    description: "RPC error thrown when a ${className} is not found"
  }
) {
  static create(${propertyName}Id: string) {
    return new ${className}NotFoundRpcError({
      message: \`${className} not found: \${${propertyName}Id}\`,
      ${propertyName}Id
    })
  }
}

/**
 * RPC error for ${className} validation failures
 */
export class ${className}ValidationRpcError extends Schema.TaggedError<${className}ValidationRpcError>()(
  "${className}ValidationRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable validation error message"
    }),
    field: Schema.optional(Schema.String).annotations({
      title: "Field Name",
      description: "Name of the field that failed validation"
    }),
    constraint: Schema.optional(Schema.String).annotations({
      title: "Constraint",
      description: "Validation constraint that was violated"
    })
  },
  {
    identifier: "${className}ValidationRpcError",
    title: "${className} Validation Error",
    description: "RPC error thrown when ${className} validation fails"
  }
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new ${className}ValidationRpcError(params)
  }
}

/**
 * RPC error for ${className} permission denied
 */
export class ${className}PermissionRpcError extends Schema.TaggedError<${className}PermissionRpcError>()(
  "${className}PermissionRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable permission error message"
    }),
    action: Schema.String.annotations({
      title: "Action",
      description: "The action that was denied"
    }),
    ${propertyName}Id: Schema.optional(Schema.String).annotations({
      title: "${className} ID",
      description: "ID of the ${className} if applicable"
    })
  },
  {
    identifier: "${className}PermissionRpcError",
    title: "${className} Permission Error",
    description: "RPC error thrown when permission is denied for a ${className} operation"
  }
) {
  static create(action: string, ${propertyName}Id?: string) {
    return new ${className}PermissionRpcError({
      message: \`Permission denied: \${action}\`,
      action,
      ...(${propertyName}Id ? { ${propertyName}Id } : {})
    })
  }
}

/**
 * Union of all ${className} RPC errors (serializable)
 */
export type ${className}RpcError =
  | ${className}NotFoundRpcError
  | ${className}ValidationRpcError
  | ${className}PermissionRpcError

/**
 * Schema for the RPC error union (for Rpc.make error type)
 */
export const ${className}RpcError = Schema.Union(
  ${className}NotFoundRpcError,
  ${className}ValidationRpcError,
  ${className}PermissionRpcError
)
`
}
