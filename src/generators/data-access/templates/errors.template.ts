/**
 * Data Access Errors Template
 *
 * Defines infrastructure-specific errors for data-access layer operations.
 * Domain errors should be imported directly from the contract library.
 *
 * Uses the error factory pattern for consistent, maintainable error generation.
 *
 * CONTRACT-FIRST ARCHITECTURE:
 * ============================
 * The contract library is the SINGLE SOURCE OF TRUTH for all domain errors.
 * Data-access layer does NOT re-export these - import directly from contract.
 * Only infrastructure-specific errors are defined here.
 *
 * @module monorepo-library-generator/data-access/errors-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { DataAccessTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'
import { createErrorFactory, ERROR_SETS, getInfrastructureErrorNames } from '../../shared/factories'

/**
 * Generate errors.ts file for data-access library
 *
 * Contract-First Architecture:
 * - Domain errors are in contract library - import directly from there
 * - This file only defines infrastructure-specific errors (Connection, Timeout, Transaction)
 * - NO re-exports to comply with biome noBarrelFile rule
 */
export function generateErrorsFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add comprehensive file header with documentation
  builder.addFileHeader({
    title: `${className} Data Access Infrastructure Errors`,
    description: `Infrastructure-specific errors for data-access layer operations.

CONTRACT-FIRST ARCHITECTURE:
Domain errors are defined in ${scope}/contract-${fileName} - import directly from there.
This file only contains infrastructure errors specific to data-access operations.

For domain errors, import from contract:
  import { ${className}NotFoundError, ${className}ValidationError } from "${scope}/contract-${fileName}"Infrastructure Errors (defined here):
  - ${className}ConnectionError - Database connection failure
  - ${className}TimeoutError - Operation timeout
  - ${className}TransactionError - Transaction failure

@see ${scope}/contract-${fileName} for domain error definitions
@see https://effect.website/docs/guides/error-management`,
    module: `${scope}/data-access-${fileName}/errors`
  })
  builder.addBlankLine()

  // Add imports - only what we need for infrastructure errors
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}RepositoryError`],
      isTypeOnly: true
    },
    { from: 'effect', imports: ['Data'] }
  ])
  builder.addBlankLine()

  // ============================================================================
  // Infrastructure-Specific Errors (Data-Access Only)
  // ============================================================================

  builder.addSectionComment('Infrastructure Errors (Data-Access Specific)')
  builder.addComment('These errors are specific to data-access infrastructure operations.')
  builder.addComment('They do not exist in the contract layer as they are implementation details.')
  builder.addComment('')
  builder.addComment(`For domain errors, import directly from contract:`)
  builder.addComment(`  import { ${className}NotFoundError } from "${scope}/contract-${fileName}";`)
  builder.addBlankLine()

  // Generate infrastructure errors using the factory
  createErrorFactory({
    className,
    style: 'data',
    errors: ERROR_SETS.dataAccess(className),
    includeUnionType: false, // We'll add custom union types below
    includeStaticCreate: true
  })(builder)

  // ============================================================================
  // Infrastructure Error Union Type
  // ============================================================================

  builder.addSectionComment('Infrastructure Error Union Type')
  builder.addBlankLine()

  const infraErrors = getInfrastructureErrorNames(className)
  builder.addTypeAlias({
    name: `${className}InfrastructureError`,
    type: infraErrors.join(' | '),
    exported: true,
    jsdoc: `Union of infrastructure-specific errors

These errors are specific to data-access operations and do not
appear in the contract layer. They should be caught and mapped
to repository errors at the data-access boundary.`
  })
  builder.addBlankLine()

  // ============================================================================
  // Combined Data Access Error Type
  // ============================================================================

  builder.addSectionComment('Combined Data Access Error Type')
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}DataAccessError`,
    type: `${className}RepositoryError | ${className}InfrastructureError`,
    exported: true,
    jsdoc: `All possible data-access layer errors

Use this type for repository method signatures:

@example
\`\`\`typescript
import { ${className}NotFoundError } from "${scope}/contract-${fileName}"export interface ${className}Repository {
  readonly findById: (id: string) => Effect.Effect<
    Option.Option<${className}>,
    ${className}DataAccessError
  >
}
\`\`\``
  })

  return builder.toString()
}
