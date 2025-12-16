/**
 * Provider Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateProviderCore } from "../core/provider"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import type { ProviderGeneratorSchema } from "./schema"

const providerExecutor = createExecutor(
  "provider",
  generateProviderCore,
  (input, metadata) => ({
    ...metadata,
    externalService: input["externalService"] as string,
    platform: (input["platform"] as "node" | "browser" | "universal" | "edge") || "node",
    operations: input["operations"] || ["create", "read", "update", "delete", "query"]
  })
)

export default async function providerGenerator(
  tree: Tree,
  schema: ProviderGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Provider name is required and cannot be empty")
  }

  const result = await Effect.runPromise(
    providerExecutor.execute({
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      externalService: schema.externalService,
      platform: schema.platform,
      operations: schema.operations,
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx") as () => void
}
