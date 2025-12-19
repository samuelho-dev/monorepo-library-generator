/**
 * Infra Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import { generateInfraCore, type InfraCoreOptions } from "../core/infra"
import type { InfraGeneratorSchema } from "./schema"

/**
 * Nx-specific input type for the executor
 */
interface NxInfraInput {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: "node" | "browser" | "universal" | "edge"
  readonly includeClient?: boolean
  readonly includeServer?: boolean
  readonly includeClientServer?: boolean
  readonly includeEdge?: boolean
  readonly consolidatesProviders?: boolean
  readonly providers?: string
}

/**
 * Create infra executor with explicit type parameters
 */
const infraExecutor = createExecutor<NxInfraInput, InfraCoreOptions>(
  "infra",
  generateInfraCore,
  (validated, metadata) => {
    // Support both old (includeClient+includeServer) and new (includeClientServer) patterns
    const includeClientServer = validated.includeClientServer ??
      (validated.includeClient && validated.includeServer ? true : undefined)
    return {
      ...metadata,
      platform: validated.platform,
      includeClientServer,
      includeEdge: validated.includeEdge,
      consolidatesProviders: validated.consolidatesProviders,
      providers: validated.providers
    }
  }
)

export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Infra name is required and cannot be empty")
  }

  const executorInput: Parameters<typeof infraExecutor.execute>[0] = {
    name: schema.name,
    __interfaceType: "nx",
    __nxTree: tree,
    description: schema.description,
    tags: schema.tags,
    platform: schema.platform,
    includeClient: schema.includeClient,
    includeServer: schema.includeServer,
    includeClientServer: schema.includeClientServer,
    includeEdge: schema.includeEdge,
    consolidatesProviders: schema.consolidatesProviders,
    providers: schema.providers
  }

  const result = await Effect.runPromise(
    infraExecutor.execute(executorInput)
  )

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
