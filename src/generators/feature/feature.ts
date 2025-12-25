/**
 * Feature Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { createExecutor, formatOutput } from "../../infrastructure"
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
  readonly includeCQRS?: boolean
  readonly scope?: string
  readonly includeSubModules?: boolean
  readonly subModules?: string
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
    includeCQRS: validated.includeCQRS,
    scope: validated.scope,
    includeSubModules: validated.includeSubModules,
    subModules: validated.subModules
  })
)

export async function featureGenerator(tree: Tree, schema: FeatureGeneratorSchema) {
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
    includeCQRS: schema.includeCQRS,
    scope: schema.scope,
    includeSubModules: schema.includeSubModules,
    subModules: schema.subModules
  }

  const result = await Effect.runPromise(featureExecutor.execute(executorInput))

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
