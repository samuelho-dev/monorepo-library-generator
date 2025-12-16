/**
 * Infra Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateInfraCore } from "../core/infra"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import type { InfraGeneratorSchema } from "./schema"

const infraExecutor = createExecutor(
  "infra",
  generateInfraCore,
  (input, metadata) => {
    const platform = input["platform"] as "node" | "browser" | "universal" | "edge" | undefined
    const includeClient = input["includeClient"] as boolean | undefined
    const includeServer = input["includeServer"] as boolean | undefined

    const result: any = {
      ...metadata
    }

    if (platform !== undefined) {
      result.platform = platform
    }

    if (includeClient && includeServer) {
      result.includeClientServer = true
    }

    return result
  }
)

export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Infra name is required and cannot be empty")
  }

  const result = await Effect.runPromise(
    infraExecutor.execute({
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      platform: schema.platform,
      includeClient: schema.includeClient,
      includeServer: schema.includeServer,
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx") as () => void
}
