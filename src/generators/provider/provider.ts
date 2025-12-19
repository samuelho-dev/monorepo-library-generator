/**
 * Provider Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import { generateProviderCore, type ProviderCoreOptions } from "../core/provider"
import type { ProviderGeneratorSchema } from "./schema"

/**
 * Provider executor with properly typed generics
 *
 * Uses ProviderGeneratorSchema as the input type and ProviderCoreOptions as the output.
 * No type assertions needed - TypeScript verifies all field access at compile time.
 */
const providerExecutor = createExecutor<ProviderGeneratorSchema, ProviderCoreOptions>(
  "provider",
  generateProviderCore,
  (validated, metadata) => ({
    ...metadata,
    externalService: validated.externalService,
    platform: validated.platform ?? "node",
    operations: validated.operations ?? [
      "create",
      "read",
      "update",
      "delete",
      "query"
    ]
  })
)

export default async function providerGenerator(
  tree: Tree,
  schema: ProviderGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Provider name is required and cannot be empty")
  }

  // Use spread pattern for optional properties to satisfy exactOptionalPropertyTypes
  const result = await Effect.runPromise(
    providerExecutor.execute({
      name: schema.name,
      externalService: schema.externalService,
      ...(schema.description !== undefined && { description: schema.description }),
      ...(schema.tags !== undefined && { tags: schema.tags }),
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(schema.operations !== undefined && { operations: schema.operations }),
      __interfaceType: "nx",
      __nxTree: tree
    })
  )

  await formatFiles(tree)

  return formatOutput(result, "nx")
}
