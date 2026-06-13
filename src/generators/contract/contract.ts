import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { createBlueprint, executeBlueprint } from "../../core"
import { formatOutput } from "../../infrastructure"
import type { ContractGeneratorSchema } from "./schema"

export async function contractGenerator(tree: Tree, schema: ContractGeneratorSchema) {
  const blueprint = createBlueprint({
    kind: "contract",
    name: schema.name,
    description: schema.description,
    directory: schema.directory,
    tags: schema.tags,
    modules: schema.modules,
    capabilities: schema.capabilities,
    dependencies: schema.dependencies,
    entrypoints: schema.entrypoints,
    testMode: schema.testMode
  })
  const result = await Effect.runPromise(executeBlueprint({ blueprint, interfaceType: "nx", tree }))
  return formatOutput(result, "nx")
}
