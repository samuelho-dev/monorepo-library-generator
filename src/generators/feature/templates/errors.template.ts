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
 * - Re-exports domain errors from contract
 * - Defines service-level errors using Data.TaggedError (NOT Schema.TaggedError)
 * - Schema.TaggedError is ONLY used at RPC boundaries (see rpc-errors.template.ts)
 *
 * @module monorepo-library-generator/feature/errors-template
 */

import { EffectPatterns, TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import { createDataAccessContractReExports } from "../../shared/factories"

/**
 * Generate shared/errors.ts file for feature library
 *
 * Contract-First Architecture:
 * - Re-exports ALL errors from contract library (single source of truth)
 * - Defines service-level errors using Data.TaggedError
 * - Provides error transformation utilities for RPC boundary
 */
export function generateErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `${className} Feature Errors`,
    description: `Re-exports domain errors from contract and adds service-level errors.

CONTRACT-FIRST ARCHITECTURE:
This file follows the contract-first pattern where:
- Domain errors (NotFound, Validation, etc.) are defined in @${scope}/contract-${name}
- Feature layer re-exports these as the single source of truth
- Service-level errors are defined here using Data.TaggedError

ERROR TYPE SELECTION:
- Data.TaggedError: Internal errors (domain, repository, service)
- Schema.TaggedError: ONLY at RPC boundaries (see rpc.ts)

Error Categories:
1. Domain Errors (from contract):
   - ${className}NotFoundError - Entity not found
   - ${className}ValidationError - Input validation failed
   - ${className}AlreadyExistsError - Duplicate entity
   - ${className}PermissionError - Operation not permitted

2. Service Errors (defined here):
   - ${className}ServiceError - Orchestration/dependency failures

@see ${scope}/contract-${name}/errors for domain error definitions`,
    module: `${scope}/feature-${name}/shared/errors`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Data"] }])
  // Import type for local use (verbatimModuleSyntax requires separate import for types used locally)
  builder.addImports([{
    from: `${scope}/contract-${fileName ?? name}`,
    imports: [`${className}DomainError`],
    isTypeOnly: true
  }])
  builder.addBlankLine()

  // ============================================================================
  // Re-export Domain Errors from Contract (Single Source of Truth)
  // ============================================================================

  // Use the factory for contract re-exports (same structure as data-access)
  createDataAccessContractReExports({
    className,
    scope,
    fileName: fileName ?? name
  })(builder)

  // ============================================================================
  // Service-Level Errors (Feature Specific)
  // ============================================================================

  builder.addSectionComment("Service Errors (Feature Specific)")
  builder.addComment("Service errors wrap lower-level errors at the feature boundary.")
  builder.addComment("Use Data.TaggedError for internal errors (not serializable over RPC).")
  builder.addBlankLine()

  // ServiceError - for orchestration/dependency failures
  builder.addClass(
    EffectPatterns.createTaggedError({
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
  ...(cause !== undefined && { cause }),
});`
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
  ...(cause !== undefined && { cause }),
});`
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
  ...(cause !== undefined && { cause }),
});`
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
);
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
  // Infrastructure Error Re-exports
  // ============================================================================

  builder.addSectionComment("Infrastructure Error Re-exports")
  builder.addComment("Re-export infrastructure errors from data-access for service layer error mapping")
  builder.addBlankLine()

  builder.addRaw(`// Re-export infrastructure errors from data-access
// These are used by mapInfraErrors in the service layer
export {
  ${className}TimeoutError,
  ${className}ConnectionError,
  ${className}TransactionError,
  type ${className}InfrastructureError,
} from "${scope}/data-access-${fileName ?? name}";
`)

  // ============================================================================
  // Combined Feature Error Types
  // ============================================================================

  builder.addSectionComment("Combined Feature Error Types")
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}FeatureError`,
    type: `${className}DomainError | ${className}ServiceError`,
    exported: true,
    jsdoc: `All possible feature-level errors

Domain errors pass through unchanged.
Service errors wrap infrastructure/orchestration failures.`
  })

  builder.addBlankLine()

  return builder.toString()
}
