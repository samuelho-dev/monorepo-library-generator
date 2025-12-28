/**
 * Data-Access Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { Console, Effect, ParseResult } from 'effect'
import {
  type DataAccessCoreOptions,
  generateDataAccessCore
} from '../../generators/core/data-access'
import {
  createExecutor,
  type DataAccessInput,
  decodeDataAccessInput,
  formatOutput
} from '../../infrastructure'

/**
 * Data-Access Generator Options - imported from validation registry
 * for single source of truth
 */
export type DataAccessGeneratorOptions = DataAccessInput

const dataAccessExecutor = createExecutor<DataAccessInput, DataAccessCoreOptions>(
  'data-access',
  generateDataAccessCore,
  (validated, metadata) => ({
    ...metadata,
    includeSubModules: validated.includeSubModules ?? false,
    ...(validated.contractLibrary !== undefined && { contractLibrary: validated.contractLibrary }),
    ...(validated.subModules !== undefined && { subModules: validated.subModules })
  })
)

export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeDataAccessInput(options).pipe(
      Effect.mapError(
        (parseError) => new Error(ParseResult.TreeFormatter.formatErrorSync(parseError))
      )
    )

    yield* Console.log(`Creating data-access library: ${validated.name}...`)

    const result = yield* dataAccessExecutor.execute({
      ...validated,
      __interfaceType: 'cli'
    })

    const output = formatOutput(result, 'cli')
    yield* Console.log(output)

    return result
  })
}
