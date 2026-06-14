import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"
import type { DataAccessGeneratorSchema } from "./schema"

export async function dataAccessGenerator(tree: Tree, schema: DataAccessGeneratorSchema) {
  const blueprint = createBlueprint({
    kind: "data-access",
    name: schema.name,
    description: schema.description,
    directory: schema.directory,
    tags: schema.tags,
    modules: schema.modules,
    dependencies: schema.dependencies,
    entrypoints: schema.entrypoints,
    contract: schema.contract,
    testMode: schema.testMode
  })
  const result = await Effect.runPromise(executeBlueprint({ blueprint, interfaceType: "nx", tree }))
  return formatOutput(result, "nx")
}
