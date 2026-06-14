import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"
import type { ProviderGeneratorSchema } from "./schema"

export async function providerGenerator(tree: Tree, schema: ProviderGeneratorSchema) {
  const blueprint = createBlueprint({
    kind: "provider",
    name: schema.name,
    externalService: schema.externalService,
    description: schema.description,
    directory: schema.directory,
    tags: schema.tags,
    dependencies: schema.dependencies,
    entrypoints: schema.entrypoints,
    testMode: schema.testMode
  })
  const result = await Effect.runPromise(executeBlueprint({ blueprint, interfaceType: "nx", tree }))
  return formatOutput(result, "nx")
}
