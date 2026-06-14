import { Console, Effect } from "effect"
import { generateContract } from "./contract"
import { generateDataAccess } from "./data-access"
import { generateFeature } from "./feature"

export interface DomainGeneratorOptions {
  readonly name: string
  readonly workspaceRoot?: string
  readonly description?: string
  readonly tags?: string | ReadonlyArray<string>
  readonly modules?: string | ReadonlyArray<string>
  readonly contractCapabilities?: string | ReadonlyArray<string>
  readonly featureEntrypoints?: string | ReadonlyArray<string>
  readonly dependencies?: string | ReadonlyArray<string>
  readonly testMode?: "none" | "unit" | "integration"
  readonly dryRun?: boolean
}

export function generateDomain(options: DomainGeneratorOptions) {
  return Effect.gen(function*() {
    yield* Console.log(`Generating standardized domain: ${options.name}`)
    const common = {
      name: options.name,
      workspaceRoot: options.workspaceRoot,
      tags: options.tags,
      modules: options.modules,
      dependencies: options.dependencies,
      testMode: options.testMode,
      dryRun: options.dryRun
    }
    const contract = yield* generateContract({
      ...common,
      description: options.description ?? `${options.name} domain contracts`,
      capabilities: options.contractCapabilities ?? "entities,errors,events,ports,rpc"
    })
    const dataAccess = yield* generateDataAccess({
      ...common,
      description: options.description ?? `${options.name} data access`,
      contract: options.name
    })
    const feature = yield* generateFeature({
      ...common,
      description: options.description ?? `${options.name} feature`,
      contract: options.name,
      dataAccess: options.name,
      entrypoints: options.featureEntrypoints ?? "root,client,server"
    })
    return { contract, dataAccess, feature }
  })
}
