/**
 * Data-Access Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateDataAccessCore } from "../core/data-access"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import type { DataAccessGeneratorSchema } from "./schema"

const dataAccessExecutor = createExecutor(
  "data-access",
  generateDataAccessCore,
  (input, metadata) => {
    const contractLibrary = input["contractLibrary"] as string | undefined
    const result: any = {
      ...metadata,
      includeCache: (input["includeCache"] as boolean | undefined) ?? false
    }
    if (contractLibrary !== undefined) {
      result.contractLibrary = contractLibrary
    }
    return result
  }
)

export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Data-access name is required and cannot be empty")
  }

  const result = await Effect.runPromise(
    dataAccessExecutor.execute({
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      contractLibrary: schema.contractLibrary,
      includeCache: schema.includeCache,
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx") as () => void
}
