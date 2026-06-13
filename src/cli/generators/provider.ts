import { Console, Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"

export interface ProviderGeneratorOptions {
  readonly name: string
  readonly workspaceRoot?: string
  readonly externalService?: string
  readonly description?: string
  readonly directory?: string
  readonly tags?: string | ReadonlyArray<string>
  readonly dependencies?: string | ReadonlyArray<string>
  readonly entrypoints?: string | ReadonlyArray<string>
  readonly testMode?: "none" | "unit" | "integration"
  readonly dryRun?: boolean
  readonly platform?: "node" | "browser" | "universal" | "edge"
  readonly operations?: ReadonlyArray<"create" | "read" | "update" | "delete" | "query">
}

function rejectLegacyOptions(options: ProviderGeneratorOptions) {
  const legacy = [
    options.platform !== undefined && "platform",
    options.operations !== undefined && "operations"
  ].filter((value): value is string => typeof value === "string")
  if (legacy.length > 0) {
    throw new Error(
      `Unsupported legacy options: ${legacy.join(", ")}. Use dependencies and entrypoints.`
    )
  }
}

export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function*() {
    yield* Effect.sync(() => rejectLegacyOptions(options))
    const blueprint = createBlueprint({
      kind: "provider",
      name: options.name,
      externalService: options.externalService,
      description: options.description,
      directory: options.directory,
      tags: options.tags,
      dependencies: options.dependencies,
      entrypoints: options.entrypoints,
      testMode: options.testMode
    })
    yield* Console.log(`Creating provider library: ${blueprint.name}...`)
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
