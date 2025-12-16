/**
 * Provider Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 */

import { Console, Effect } from "effect"
import { generateProviderCore } from "../../generators/core/provider"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"

export interface ProviderGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly externalService: string
  readonly platform?: "node" | "browser" | "universal" | "edge"
  readonly operations?: ReadonlyArray<"create" | "read" | "update" | "delete" | "query">
}

const providerExecutor = createExecutor(
  "provider",
  generateProviderCore,
  (input, metadata) => ({
    ...metadata,
    externalService: input["externalService"] as string,
    platform: (input["platform"] as "node" | "browser" | "universal" | "edge") || "node",
    operations: input["operations"] || ["create", "read", "update", "delete", "query"]
  })
)

export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function* () {
    yield* Console.log(`Creating provider library: ${options.name}...`)

    const result = yield* providerExecutor.execute({
      ...options,
      __interfaceType: "cli" as const
    })

    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
