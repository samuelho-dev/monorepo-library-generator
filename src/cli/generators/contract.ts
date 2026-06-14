import { Console, Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"

export interface ContractGeneratorOptions {
  readonly name: string
  readonly workspaceRoot?: string
  readonly description?: string
  readonly directory?: string
  readonly tags?: string | ReadonlyArray<string>
  readonly modules?: string | ReadonlyArray<string>
  readonly capabilities?: string | ReadonlyArray<string>
  readonly dependencies?: string | ReadonlyArray<string>
  readonly entrypoints?: string | ReadonlyArray<string>
  readonly testMode?: "none" | "unit" | "integration"
  readonly dryRun?: boolean
}

export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function*() {
    const blueprint = createBlueprint({
      kind: "contract",
      name: options.name,
      description: options.description,
      directory: options.directory,
      tags: options.tags,
      modules: options.modules,
      capabilities: options.capabilities,
      dependencies: options.dependencies,
      entrypoints: options.entrypoints,
      testMode: options.testMode
    })
    yield* Console.log(`Creating contract library: ${blueprint.name}...`)
    const result = yield* executeBlueprint({
      blueprint,
      workspaceRoot: options.workspaceRoot,
      interfaceType: "cli",
      dryRun: options.dryRun
    })
    yield* Console.log(formatOutput(result, "cli"))
    return result
  })
}
