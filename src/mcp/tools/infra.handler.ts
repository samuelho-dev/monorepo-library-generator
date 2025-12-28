/**
 * Infra Generator MCP Tool Handler (Refactored)
 *
 * Handles infrastructure library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from 'effect'
import { generateInfraCore, type InfraCoreOptions } from '../../generators/core/infra'
import {
  createExecutor,
  decodeInfraInput,
  formatErrorResponse,
  formatOutput,
  formatValidationError,
  type InfraInput
} from '../../infrastructure'
import { ValidationError } from '../utils/validation'

/**
 * Create infra executor using unified infrastructure
 * Explicit type parameters ensure type safety without assertions
 */
const infraExecutor = createExecutor<InfraInput, InfraCoreOptions>(
  'infra',
  generateInfraCore,
  (validated, metadata) => {
    const includeClientServer =
      validated.includeClient && validated.includeServer ? true : undefined
    return {
      ...metadata,
      ...(validated.platform !== undefined && { platform: validated.platform }),
      ...(includeClientServer !== undefined && { includeClientServer })
    }
  }
)

/**
 * Handle infra generation with unified infrastructure
 */
export const handleGenerateInfra = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input using proper error channel
    const validated = yield* decodeInfraInput(input).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            message: ParseResult.TreeFormatter.formatErrorSync(parseError),
            cause: parseError
          })
      )
    )

    // 2. Handle dry-run mode
    if (validated.dryRun) {
      return {
        success: true,
        message: [
          '🔍 DRY RUN MODE',
          '',
          `Would generate infra library: infra-${validated.name}`,
          '',
          '📦 Configuration:',
          `  - Name: ${validated.name}`,
          `  - Infrastructure Type: ${validated.infraType}`,
          `  - Include Client: ${validated.includeClient ?? true}`,
          `  - Include Server: ${validated.includeServer ?? true}`,
          '',
          'To actually generate files, set dryRun: false'
        ].join('\n')
      }
    }

    // 3. Execute generator with proper error handling
    return yield* infraExecutor
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
