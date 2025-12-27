/**
 * Contract Generator MCP Tool Handler (Refactored)
 *
 * Handles contract library generation via MCP protocol using unified infrastructure.
 * No longer shells out to CLI/Nx - calls core generators directly.
 */

import { Effect, ParseResult } from 'effect'
import { type ContractCoreOptions, generateContractCore } from '../../generators/core/contract'
import {
  type ContractInput,
  createExecutor,
  decodeContractInput,
  formatErrorResponse,
  formatOutput,
  formatValidationError
} from '../../infrastructure'
import { ValidationError } from '../utils/validation'

/**
 * Create contract executor using unified infrastructure
 * Explicit type parameters ensure type safety without assertions
 */
const contractExecutor = createExecutor<ContractInput, ContractCoreOptions>(
  'contract',
  generateContractCore,
  (validated, metadata) => ({
    ...metadata,
    includeCQRS: validated.includeCQRS ?? false,
    ...(validated.entities !== undefined && { entities: validated.entities }),
    ...(validated.typesDatabasePackage !== undefined && {
      typesDatabasePackage: validated.typesDatabasePackage
    })
  })
)

/**
 * Handle contract generation with unified infrastructure
 *
 * Before: 137 lines with shell exec, command building, text parsing
 * After: ~40 lines with direct core generator invocation using proper Effect patterns
 */
export const handleGenerateContract = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input with Effect Schema using proper error channel
    const validated = yield* decodeContractInput(input).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            message: ParseResult.TreeFormatter.formatErrorSync(parseError),
            cause: parseError
          })
      )
    )

    // 2. Handle dry-run mode (TODO: implement in executor)
    if (validated.dryRun) {
      return {
        success: true,
        message: [
          '🔍 DRY RUN MODE',
          '',
          `Would generate contract library: contract-${validated.name}`,
          '',
          '📦 Configuration:',
          `  - Name: ${validated.name}`,
          `  - Entities: ${validated.entities?.join(', ') || 'none'}`,
          `  - CQRS: ${validated.includeCQRS ?? false}`,
          '',
          'To actually generate files, set dryRun: false'
        ].join('\n')
      }
    }

    // 3. Execute generator using unified infrastructure with proper error handling
    return yield* contractExecutor
      .execute({
        ...validated,
        __interfaceType: 'mcp'
      })
      .pipe(
        Effect.map((result) => formatOutput(result, 'mcp')),
        Effect.catchTag('GeneratorExecutionError', (error) =>
          Effect.succeed(formatErrorResponse(error))
        )
      )
  }).pipe(
    // Handle validation errors at top level
    Effect.catchTag('ValidationError', (error) =>
      Effect.succeed({
        success: false,
        message: formatValidationError(error.message)
      })
    )
  )
