import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"
import type { FeatureGeneratorSchema } from "./schema"

export async function featureGenerator(tree: Tree, schema: FeatureGeneratorSchema) {
  const blueprint = createBlueprint({
    kind: "feature",
    name: schema.name,
    description: schema.description,
    directory: schema.directory,
    tags: schema.tags,
    modules: schema.modules,
    dependencies: schema.dependencies,
    entrypoints: schema.entrypoints,
    contract: schema.contract,
    dataAccess: schema.dataAccess,
    testMode: schema.testMode
  })
  const result = await Effect.runPromise(executeBlueprint({ blueprint, interfaceType: "nx", tree }))
  return formatOutput(result, "nx")
}
