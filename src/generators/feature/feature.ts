/**
 * Feature Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateFeatureCore, type FeatureCoreOptions } from "../core/feature"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
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
}

/**
 * Create feature executor with explicit type parameters
 */
const featureExecutor = createExecutor<NxFeatureInput, FeatureCoreOptions>(
  "feature",
  generateFeatureCore,
  (validated, metadata) => ({
    ...metadata,
    ...(validated.dataAccessLibrary !== undefined && { dataAccessLibrary: validated.dataAccessLibrary }),
    includeClientState: validated.includeClientState ?? false
  })
)

export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  // Use spread pattern for optional properties to satisfy exactOptionalPropertyTypes
  const result = await Effect.runPromise(
    featureExecutor.execute({
      name: schema.name,
      ...(schema.description !== undefined && { description: schema.description }),
      ...(schema.tags !== undefined && { tags: schema.tags }),
      ...(schema.dataAccessLibrary !== undefined && { dataAccessLibrary: schema.dataAccessLibrary }),
      ...(schema.includeClientState !== undefined && { includeClientState: schema.includeClientState }),
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
