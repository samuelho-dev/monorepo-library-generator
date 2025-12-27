/**
 * Feature Errors Template
 *
 * Generates shared/errors.ts file for feature libraries.
 * Uses the error factory pattern for consistent, maintainable error generation.
 *
 * CONTRACT-FIRST ARCHITECTURE:
 * ============================
 * The contract library is the SINGLE SOURCE OF TRUTH for domain errors.
 * Feature library:
 * - Does NOT re-export domain errors - import directly from contract
 * - Defines service-level errors using Data.TaggedError (NOT Schema.TaggedError)
 * - Schema.TaggedError is ONLY used at RPC boundaries (see rpc-errors.template.ts)
 *
 * @module monorepo-library-generator/feature/errors-template
 */

import { createTaggedErrorPattern, TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate shared/errors.ts file for feature library
 *
 * Contract-First Architecture:
 * - Domain errors are in contract library - import directly from there
 * - This file only defines service-level errors using Data.TaggedError
 * - NO re-exports to comply with biome noBarrelFile rule
 */
export function generateErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Feature Service Errors`,
    description: `Service-level errors for feature layer operations.

CONTRACT-FIRST ARCHITECTURE:
Domain errors are defined in ${scope}/contract-${fileName} - import directly from there.
This file only contains service-level errors specific to feature operations.

For domain errors, import from contract:
  import { ${className}NotFoundError, ${className}ValidationError } from "${scope}/contract-${fileName}"For infrastructure errors, import from data-access:
  import { ${className}TimeoutError, ${className}ConnectionError } from "${scope}/data-access-${fileName}"Service Errors (defined here):
  - ${className}ServiceError - Orchestration/dependency failures

@see ${scope}/contract-${fileName} for domain error definitions
@see ${scope}/data-access-${fileName} for infrastructure error definitions`,
    module: `${scope}/feature-${fileName}/shared/errors`
  })
  builder.addBlankLine()

  // Add imports - only what we need for service errors
  builder.addImports([{ from: "effect", imports: ["Data"] }])
  // Import type for local use (verbatimModuleSyntax requires separate import for types used locally)
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}DomainError`],
      isTypeOnly: true
    }
  ])
  builder.addImports([
    {
      from: `${scope}/data-access-${fileName}`,
      imports: [`${className}InfrastructureError`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // ============================================================================
  // Service-Level Errors (Feature Specific)
  // ============================================================================

  builder.addSectionComment("Service Errors (Feature Specific)")
  builder.addComment("Service errors wrap lower-level errors at the feature boundary.")
  builder.addComment("Use Data.TaggedError for internal errors (not serializable over RPC).")
  builder.addBlankLine()

  // ServiceError - for orchestration/dependency failures
  builder.addClass(
    createTaggedErrorPattern({
      className: `${className}ServiceError`,
      tagName: `${className}ServiceError`,
      fields: [
        { name: "message", type: "string", readonly: true },
        { name: "code", type: `${className}ServiceErrorCode`, readonly: true },
        { name: "operation", type: "string", readonly: true },
        { name: "cause", type: "unknown", readonly: true, optional: true }
      ],
      staticMethods: [
        {
          name: "dependency",
          params: [
            { name: "operation", type: "string" },
            { name: "message", type: "string" },
            { name: "cause", type: "unknown", optional: true }
          ],
          returnType: `${className}ServiceError`,
          body: `return new ${className}ServiceError({
  message,
  code: "DEPENDENCY",
  operation,
  ...(cause !== undefined && { cause })
})`
        },
        {
          name: "orchestration",
          params: [
            { name: "operation", type: "string" },
            { name: "message", type: "string" },
            { name: "cause", type: "unknown", optional: true }
          ],
          returnType: `${className}ServiceError`,
          body: `return new ${className}ServiceError({
  message,
  code: "ORCHESTRATION",
  operation,
  ...(cause !== undefined && { cause })
})`
        },
        {
          name: "internal",
          params: [
            { name: "operation", type: "string" },
            { name: "message", type: "string" },
            { name: "cause", type: "unknown", optional: true }
          ],
          returnType: `${className}ServiceError`,
          body: `return new ${className}ServiceError({
  message,
  code: "INTERNAL",
  operation,
  ...(cause !== undefined && { cause })
})`
        }
      ],
      jsdoc: `Service-level error for ${name} feature orchestration

Error Codes:
- DEPENDENCY: Infrastructure error (database, cache, external service)
- ORCHESTRATION: Workflow/coordination error
- INTERNAL: Unexpected internal error

Usage:
\`\`\`typescript
// Map infrastructure errors to service errors
yield* Effect.catchTag("${className}ConnectionError", (error) =>
  Effect.fail(${className}ServiceError.dependency(
    "findById",
    "Database connection failed",
    error
  ))
)
\`\`\``
    })
  )

  // Error code type
  builder.addTypeAlias({
    name: `${className}ServiceErrorCode`,
    type: "\"DEPENDENCY\" | \"ORCHESTRATION\" | \"INTERNAL\"",
    exported: true,
    jsdoc: `Service error codes for ${name} feature

- DEPENDENCY: Infrastructure dependency failed
- ORCHESTRATION: Workflow coordination failed
- INTERNAL: Unexpected internal error`
  })

  // ============================================================================
  // Combined Feature Error Types
  // ============================================================================

  builder.addSectionComment("Combined Feature Error Types")
  builder.addComment("For infrastructure errors, import directly from data-access:")
  builder.addComment(
    `  import { ${className}TimeoutError } from "${scope}/data-access-${fileName}";`
  )
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}FeatureError`,
    type: `${className}DomainError | ${className}ServiceError | ${className}InfrastructureError`,
    exported: true,
    jsdoc: `All possible feature-level errors

Domain errors - import from ${scope}/contract-${fileName}
Infrastructure errors - import from ${scope}/data-access-${fileName}
Service errors - defined in this file`
  })

  builder.addBlankLine()

  return builder.toString()
}
