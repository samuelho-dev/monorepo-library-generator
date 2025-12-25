/**
 * RPC Errors Template
 *
 * Generates rpc/errors.ts file for feature libraries.
 * Imports RPC errors from infra-rpc and provides domain-specific error boundary.
 *
 * Error Boundaries:
 * - Schema.TaggedError (from infra-rpc): For errors that cross RPC boundaries (serializable)
 * - Data.TaggedError (from shared/errors): For domain errors used in Effect.catchTag
 *
 * @module monorepo-library-generator/feature/rpc-errors-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate rpc/errors.ts file for feature library
 *
 * This file serves two purposes:
 * 1. Re-exports Schema.TaggedError RPC errors from infra-rpc for HTTP status mapping
 * 2. Re-exports Data.TaggedError domain errors for Effect.catchTag transformations
 * 3. Provides a domain-specific RPC boundary wrapper for error transformation
 */
export function generateRpcErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Errors`,
    description: `RPC error exports and domain-specific error boundary.

This file provides:
- RPC errors (Schema.TaggedError) from infra-rpc for serialization
- Domain errors (Data.TaggedError) from shared/errors for Effect.catchTag
- Domain-specific RPC boundary wrapper for error transformation

Error Flow:
  Domain Error (Data.TaggedError) → with${className}RpcBoundary → RPC Error (Schema.TaggedError)`,
    module: `${scope}/feature-${options.fileName}/rpc/errors`,
    see: ["infra-rpc for RPC error types", "shared/errors for domain errors"]
  })

  // Import only what's used in the boundary wrapper
  builder.addImports([
    { from: "effect", imports: ["Effect"] },
    {
      from: `${scope}/infra-rpc`,
      imports: [
        "RpcConflictError",
        "RpcForbiddenError",
        "RpcInternalError",
        "RpcNotFoundError",
        "RpcValidationError"
      ]
    },
    // Import the feature error type for use in withRpcBoundary function
    {
      from: `../shared/errors`,
      imports: [`${className}FeatureError`],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("Import Notes")

  builder.addRaw(`// NOTE: For RPC errors (Schema.TaggedError), import directly from ${scope}/infra-rpc:
// import { RpcNotFoundError, RpcValidationError, ... } from "${scope}/infra-rpc"
//
// For domain errors (Data.TaggedError), import directly from ../shared/errors:
// import { ${className}NotFoundError, ... } from "../shared/errors"`)

  builder.addSectionComment("Domain-Specific RPC Boundary")

  // Generate the domain-specific RPC boundary wrapper
  builder.addRaw(`/**
 * Transform ${className} domain errors to RPC errors
 *
 * Use this at RPC handler boundaries to transform domain-specific
 * errors into serializable RPC errors with proper HTTP status codes.
 *
 * @example
 * \`\`\`typescript
 * const handler = ${className.toLowerCase()}Service.get(id).pipe(
 *   with${className}RpcBoundary
 * );
 * \`\`\`
 *
 * For custom transformations, use Effect.catchTag directly:
 * @example
 * \`\`\`typescript
 * const handler = ${className.toLowerCase()}Service.get(id).pipe(
 *   Effect.catchTag("${className}NotFoundError", (e) =>
 *     Effect.fail(new RpcNotFoundError({
 *       message: e.message,
 *       resource: "${className}",
 *       id: e.${className.toLowerCase()}Id
 *     }))
 *   )
 * );
 * \`\`\`
 */
export const with${className}RpcBoundary = <A, R>(
  effect: Effect.Effect<A, ${className}FeatureError, R>
) =>
  effect.pipe(
    // Domain Errors → RPC Errors
    Effect.catchTag("${className}NotFoundError", (e) =>
      Effect.fail(new RpcNotFoundError({
        message: e.message,
        resource: "${className}"
      }))
    ),
    Effect.catchTag("${className}ValidationError", (e) =>
      Effect.fail(new RpcValidationError({
        message: e.message,
        issues: []
      }))
    ),
    Effect.catchTag("${className}AlreadyExistsError", (e) =>
      Effect.fail(new RpcConflictError({
        message: e.message
      }))
    ),
    Effect.catchTag("${className}PermissionError", (e) =>
      Effect.fail(new RpcForbiddenError({
        message: e.message
      }))
    ),
    // Repository Errors → RPC Errors
    Effect.catchTag("${className}NotFoundRepositoryError", (e) =>
      Effect.fail(new RpcNotFoundError({
        message: e.message,
        resource: "${className}"
      }))
    ),
    Effect.catchTag("${className}ConflictRepositoryError", (e) =>
      Effect.fail(new RpcConflictError({
        message: e.message
      }))
    ),
    // Service/Infrastructure Errors → RPC Internal Error
    Effect.catchAll(() =>
      Effect.fail(new RpcInternalError({
        message: "An unexpected error occurred"
      }))
    )
  )`)

  return builder.toString()
}
