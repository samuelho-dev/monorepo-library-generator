/**
 * Data-Access Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import { type DataAccessCoreOptions, generateDataAccessCore } from "../core/data-access"
import type { DataAccessGeneratorSchema } from "./schema"

/**
 * Nx-specific input type for the executor
 */
interface NxDataAccessInput {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly directory?: string
  readonly includeCache?: boolean
  readonly contractLibrary?: string
}

/**
 * Create data-access executor with explicit type parameters
 */
const dataAccessExecutor = createExecutor<NxDataAccessInput, DataAccessCoreOptions>(
  "data-access",
  generateDataAccessCore,
  (validated, metadata) => ({
    ...metadata,
    includeCache: validated.includeCache ?? false,
    ...(validated.contractLibrary !== undefined && { contractLibrary: validated.contractLibrary })
  })
)

export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Data-access name is required and cannot be empty")
  }

  // Use spread pattern for optional properties to satisfy exactOptionalPropertyTypes
  const result = await Effect.runPromise(
    dataAccessExecutor.execute({
      name: schema.name,
      ...(schema.description !== undefined && { description: schema.description }),
      ...(schema.tags !== undefined && { tags: schema.tags }),
      ...(schema.directory !== undefined && { directory: schema.directory }),
      ...(schema.contractLibrary !== undefined && { contractLibrary: schema.contractLibrary }),
      ...(schema.includeCache !== undefined && { includeCache: schema.includeCache }),
      __interfaceType: "nx",
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
