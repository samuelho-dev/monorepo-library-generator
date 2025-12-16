/**
 * Contract Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation across all interfaces.
 */

import { Console, Effect } from "effect"
import { generateContractCore } from "../../generators/core/contract"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"

/**
 * Contract Generator Options (CLI)
 */
export interface ContractGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean
  readonly entities?: ReadonlyArray<string>
}

/**
 * Create contract executor using unified infrastructure
 */
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (input, metadata) => {
    const entities = input["entities"] as ReadonlyArray<string> | undefined
    const result: any = {
      ...metadata,
      includeCQRS: (input["includeCQRS"] as boolean | undefined) ?? false,
      includeRPC: (input["includeRPC"] as boolean | undefined) ?? false
    }
    if (entities !== undefined) {
      result.entities = entities
    }
    return result
  }
)

/**
 * Generate Contract Library (CLI)
 *
 * Before: 158 lines with manual metadata computation and infrastructure generation
 * After: ~50 lines using unified executor
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function* () {
    yield* Console.log(`Creating contract library: ${options.name}...`)

    // Execute using unified infrastructure
    const result = yield* contractExecutor.execute({
      ...options,
      __interfaceType: "cli" as const
    })

    // Format and display output
    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
