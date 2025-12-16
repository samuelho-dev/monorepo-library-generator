/**
 * Feature Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 */

import { Console, Effect } from "effect"
import { generateFeatureCore } from "../../generators/core/feature"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"

export interface FeatureGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly dataAccessLibrary?: string
  readonly includeClientState?: boolean
}

const featureExecutor = createExecutor(
  "feature",
  generateFeatureCore,
  (input, metadata) => ({
    ...metadata,
    dataAccessLibrary: input["dataAccessLibrary"] as string | undefined,
    includeClientState: (input["includeClientState"] as boolean | undefined) ?? false
  })
)

export function generateFeature(options: FeatureGeneratorOptions) {
  return Effect.gen(function* () {
    yield* Console.log(`Creating feature library: ${options.name}...`)

    const result = yield* featureExecutor.execute({
      ...options,
      __interfaceType: "cli" as const
    })

    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
