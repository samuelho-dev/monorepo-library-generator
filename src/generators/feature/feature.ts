/**
 * Feature Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateFeatureCore } from "../core/feature"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import type { FeatureGeneratorSchema } from "./schema"

const featureExecutor = createExecutor(
  "feature",
  generateFeatureCore,
  (input, metadata) => ({
    ...metadata,
    dataAccessLibrary: input["dataAccessLibrary"] as string | undefined,
    includeClientState: (input["includeClientState"] as boolean | undefined) ?? false
  })
)

export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  const result = await Effect.runPromise(
    featureExecutor.execute({
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      dataAccessLibrary: schema.dataAccessLibrary,
      includeClientState: schema.includeClientState,
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx") as () => void
}
