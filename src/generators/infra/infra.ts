import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"
import type { InfraGeneratorSchema } from "./schema"

export async function infraGenerator(tree: Tree, schema: InfraGeneratorSchema) {
  const blueprint = createBlueprint({
    kind: "infra",
    name: schema.name,
    description: schema.description,
    directory: schema.directory,
    tags: schema.tags,
    modules: schema.modules,
    dependencies: schema.dependencies,
    entrypoints: schema.entrypoints,
    testMode: schema.testMode
  })
  const result = await Effect.runPromise(executeBlueprint({ blueprint, interfaceType: "nx", tree }))
  return formatOutput(result, "nx")
}
