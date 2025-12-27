/**
 * Infra Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { Console, Effect, ParseResult } from 'effect'
import { generateInfraCore, type InfraCoreOptions } from '../../generators/core/infra'
import {
  createExecutor,
  decodeInfraInput,
  formatOutput,
  type InfraInput
} from '../../infrastructure'

/**
 * Infra Generator Options - imported from validation registry
 * for single source of truth
 */
export type InfraGeneratorOptions = InfraInput

const infraExecutor = createExecutor<InfraInput, InfraCoreOptions>(
  'infra',
  generateInfraCore,
  (validated, metadata) => {
    let includeClientServer = validated.includeClientServer
    if (includeClientServer === undefined && validated.includeClient && validated.includeServer) {
      includeClientServer = true
    }

    return {
      ...metadata,
      ...(validated.platform !== undefined && { platform: validated.platform }),
      ...(includeClientServer !== undefined && { includeClientServer })
    }
  }
)

export function generateInfra(options: InfraGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeInfraInput(options).pipe(
      Effect.mapError(
        (parseError) => new Error(ParseResult.TreeFormatter.formatErrorSync(parseError))
      )
    )

    yield* Console.log(`Creating infra library: ${validated.name}...`)

    const result = yield* infraExecutor.execute({
      ...validated,
      __interfaceType: 'cli'
    })

    const output = formatOutput(result, 'cli')
    yield* Console.log(output)

    return result
  })
}
