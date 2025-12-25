/**
 * Data Access Errors Template
 *
 * Re-exports domain errors from contract library (Contract-First Architecture)
 * and adds infrastructure-specific errors for data-access layer operations.
 *
 * Uses the error factory pattern for consistent, maintainable error generation.
 *
 * CONTRACT-FIRST ARCHITECTURE:
 * ============================
 * The contract library is the SINGLE SOURCE OF TRUTH for all domain errors.
 * Data-access re-exports these errors and adds only infrastructure-specific
 * errors that are unique to data access operations.
 *
 * @module monorepo-library-generator/data-access/errors-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import {
  createDataAccessContractReExports,
  createErrorFactory,
  ERROR_SETS,
  getInfrastructureErrorNames
} from "../../shared/factories"

/**
 * Generate errors.ts file for data-access library
 *
 * Contract-First Architecture:
 * - Re-exports ALL errors from contract library (single source of truth)
 * - Adds infrastructure-specific errors (Connection, Timeout, Transaction)
 * - Provides unified error union type for repository signatures
 */
export function generateErrorsFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add comprehensive file header with documentation
  builder.addFileHeader({
    title: `${className} Data Access Errors`,
    description: `Re-exports domain errors from contract and adds infrastructure-specific errors.

CONTRACT-FIRST ARCHITECTURE:
This file follows the contract-first pattern where:
- Domain errors (NotFound, Validation, etc.) are defined in @${scope}/contract-${fileName}
- Data-access layer re-exports these as the single source of truth
- Only infrastructure-specific errors are defined here

Error Categories:
1. Domain Errors (from contract):
   - ${className}NotFoundError - Entity not found
   - ${className}ValidationError - Input validation failed
   - ${className}AlreadyExistsError - Duplicate entity
   - ${className}PermissionError - Operation not permitted

2. Repository Errors (from contract):
   - ${className}NotFoundRepositoryError - Repository-level not found
   - ${className}ValidationRepositoryError - Repository-level validation
   - ${className}ConflictRepositoryError - Repository-level conflict
   - ${className}DatabaseRepositoryError - Database operation failure

3. Infrastructure Errors (defined here):
   - ${className}ConnectionError - Database connection failure
   - ${className}TimeoutError - Operation timeout
   - ${className}TransactionError - Transaction failure

@see ${scope}/contract-${fileName}/errors for domain error definitions
@see https://effect.website/docs/guides/error-management`,
    module: `${scope}/data-access-${fileName}/errors`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Data"] }])
  // Import type for local use (verbatimModuleSyntax requires separate import for types used locally)
  builder.addImports([{
    from: `${scope}/contract-${fileName}`,
    imports: [`${className}RepositoryError`],
    isTypeOnly: true
  }])
  builder.addBlankLine()

  // ============================================================================
  // Re-export Domain Errors from Contract (Single Source of Truth)
  // ============================================================================

  createDataAccessContractReExports({
    className,
    scope,
    fileName
  })(builder)

  // ============================================================================
  // Infrastructure-Specific Errors (Data-Access Only)
  // ============================================================================

  builder.addSectionComment("Infrastructure Errors (Data-Access Specific)")
  builder.addComment("These errors are specific to data-access infrastructure operations.")
  builder.addComment("They do not exist in the contract layer as they are implementation details.")
  builder.addBlankLine()

  // Generate infrastructure errors using the factory
  createErrorFactory({
    className,
    style: "data",
    errors: ERROR_SETS.dataAccess(className),
    includeUnionType: false, // We'll add custom union types below
    includeStaticCreate: true
  })(builder)

  // ============================================================================
  // Infrastructure Error Union Type
  // ============================================================================

  builder.addSectionComment("Infrastructure Error Union Type")
  builder.addBlankLine()

  const infraErrors = getInfrastructureErrorNames(className)
  builder.addTypeAlias({
    name: `${className}InfrastructureError`,
    type: `
  | ${infraErrors.join("\n  | ")}`,
    exported: true,
    jsdoc: `Union of infrastructure-specific errors

These errors are specific to data-access operations and do not
appear in the contract layer. They should be caught and mapped
to repository errors at the data-access boundary.`
  })

  // ============================================================================
  // Combined Data Access Error Type
  // ============================================================================

  builder.addSectionComment("Combined Data Access Error Type")
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}DataAccessError`,
    type: `${className}RepositoryError | ${className}InfrastructureError`,
    exported: true,
    jsdoc: `All possible data-access layer errors

Use this type for repository method signatures:

@example
\`\`\`typescript
export interface ${className}Repository {
  readonly findById: (id: string) => Effect.Effect<
    Option.Option<${className}>,
    ${className}DataAccessError
  >;
}
\`\`\``
  })

  builder.addBlankLine()

  return builder.toString()
}
