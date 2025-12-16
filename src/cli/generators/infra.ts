/**
 * Infra Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 */

import { Console, Effect } from "effect"
import { generateInfraCore } from "../../generators/core/infra"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"

export interface InfraGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly infraType?: "database" | "cache" | "queue" | "logging" | "metrics" | "pubsub"
  readonly platform?: "node" | "browser" | "universal" | "edge"
  readonly includeClient?: boolean
  readonly includeServer?: boolean
  readonly includeClientServer?: boolean
  readonly projectRoot?: string
}

const infraExecutor = createExecutor(
  "infra",
  generateInfraCore,
  (input, metadata) => {
    const platform = input["platform"] as "node" | "browser" | "universal" | "edge" | undefined
    const includeClientServer = input["includeClientServer"] as boolean | undefined
    const includeClient = input["includeClient"] as boolean | undefined
    const includeServer = input["includeServer"] as boolean | undefined

    const result: any = {
      ...metadata
    }

    if (platform !== undefined) {
      result.platform = platform
    }

    if (includeClientServer !== undefined) {
      result.includeClientServer = includeClientServer
    } else if (includeClient && includeServer) {
      result.includeClientServer = true
    }

    return result
  }
)

export function generateInfra(options: InfraGeneratorOptions) {
  return Effect.gen(function* () {
    yield* Console.log(`Creating infra library: ${options.name}...`)

    const result = yield* infraExecutor.execute({
      ...options,
      __interfaceType: "cli" as const
    })

    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
