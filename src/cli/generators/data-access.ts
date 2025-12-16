/**
 * Data-Access Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 */

import { Console, Effect } from "effect"
import { generateDataAccessCore } from "../../generators/core/data-access"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"

export interface DataAccessGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly contractLibrary?: string
  readonly includeCache?: boolean
}

const dataAccessExecutor = createExecutor(
  "data-access",
  generateDataAccessCore,
  (input, metadata) => {
    const contractLibrary = input["contractLibrary"] as string | undefined
    const result: any = {
      ...metadata,
      includeCache: (input["includeCache"] as boolean | undefined) ?? false
    }
    if (contractLibrary !== undefined) {
      result.contractLibrary = contractLibrary
    }
    return result
  }
)

export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function* () {
    yield* Console.log(`Creating data-access library: ${options.name}...`)

    const result = yield* dataAccessExecutor.execute({
      ...options,
      __interfaceType: "cli" as const
    })

    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
