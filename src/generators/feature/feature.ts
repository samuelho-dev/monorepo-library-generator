/**
 * Feature Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import { type FeatureCoreOptions, generateFeatureCore } from "../core/feature"
import type { FeatureGeneratorSchema } from "./schema"

/**
 * Nx-specific input type for the executor
 */
interface NxFeatureInput {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly dataAccessLibrary?: string
  readonly includeClientState?: boolean
  readonly platform?: "node" | "universal" | "browser" | "edge"
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
  readonly scope?: string
  readonly includeSubServices?: boolean
  readonly subServices?: string
}

/**
 * Create feature executor with explicit type parameters
 */
const featureExecutor = createExecutor<NxFeatureInput, FeatureCoreOptions>(
  "feature",
  generateFeatureCore,
  (validated, metadata) => ({
    ...metadata,
    includeClientState: validated.includeClientState ?? false,
    dataAccessLibrary: validated.dataAccessLibrary,
    platform: validated.platform,
    includeClientServer: validated.includeClientServer,
    includeRPC: validated.includeRPC,
    includeCQRS: validated.includeCQRS,
    includeEdge: validated.includeEdge,
    scope: validated.scope,
    includeSubServices: validated.includeSubServices,
    subServices: validated.subServices
  })
)

export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  // Build tags string with platform and scope tags included
  const buildTags = () => {
    const tagList: Array<string> = []
    if (schema.tags) {
      for (const tag of schema.tags.split(",").map((t) => t.trim())) {
        tagList.push(tag)
      }
    }
    if (schema.platform) {
      tagList.push(`platform:${schema.platform}`)
    }
    // Custom scope tag - when provided, it overrides the default scope:${name} from metadata
    if (schema.scope) {
      tagList.push(`scope:${schema.scope}`)
    }
    return tagList.length > 0 ? tagList.join(",") : undefined
  }
  const tagsString = buildTags()

  const executorInput: Parameters<typeof featureExecutor.execute>[0] = {
    name: schema.name,
    __interfaceType: "nx",
    __nxTree: tree,
    description: schema.description,
    tags: tagsString,
    dataAccessLibrary: schema.dataAccessLibrary,
    includeClientState: schema.includeClientState,
    platform: schema.platform,
    includeClientServer: schema.includeClientServer,
    includeRPC: schema.includeRPC,
    includeCQRS: schema.includeCQRS,
    includeEdge: schema.includeEdge,
    scope: schema.scope,
    includeSubServices: schema.includeSubServices,
    subServices: schema.subServices
  }

  const result = await Effect.runPromise(
    featureExecutor.execute(executorInput)
  )

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
