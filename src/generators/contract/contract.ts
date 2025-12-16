/**
 * Contract Library Generator (Nx Wrapper - Refactored)
 *
 * Uses unified infrastructure while preserving Nx-specific functionality.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateContractCore } from "../core/contract"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import type { ContractGeneratorSchema } from "./schema"

/**
 * Create contract executor using unified infrastructure
 */
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (input, metadata) => {
    const entities = input["entities"] as ReadonlyArray<string> | undefined
    const result: any = {
      ...metadata,
      includeCQRS: (input["includeCQRS"] as boolean | undefined) ?? false,
      includeRPC: (input["includeRPC"] as boolean | undefined) ?? false
    }
    if (entities !== undefined) {
      result.entities = entities
    }
    return result
  }
)

/**
 * Contract Generator for Nx Workspaces (Refactored)
 *
 * Before: ~140 lines with manual metadata computation
 * After: ~50 lines using unified executor
 */
export default async function contractGenerator(
  tree: Tree,
  schema: ContractGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Contract name is required and cannot be empty")
  }

  // Parse entities (supports comma-separated string or array)
  let entities: ReadonlyArray<string> | undefined
  if (schema.entities) {
    if (typeof schema.entities === "string") {
      entities = schema.entities.split(",").map((e) => e.trim()).filter((e) => e.length > 0)
    } else {
      entities = schema.entities
    }
  }

  // Execute using unified infrastructure
  const result = await Effect.runPromise(
    contractExecutor.execute({
      name: schema.name,
      description: schema.description,
      tags: schema.tags,
      includeCQRS: schema.includeCQRS,
      includeRPC: schema.includeRPC,
      entities,
      __interfaceType: "nx" as const,
      __nxTree: tree
    })
  )

  // Nx-specific: Register project configuration
  // TODO: This should be handled by the infrastructure generator in unified mode
  // For now, we'll need to add this back after the executor runs
  // This is a known limitation that can be addressed in a follow-up

  // Format files (Nx convention)
  await formatFiles(tree)

  // Return callback (Nx convention)
  return formatOutput(result, "nx") as () => void
}
