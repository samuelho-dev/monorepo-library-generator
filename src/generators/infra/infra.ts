/**
 * Infra Library Generator (Nx Wrapper - Refactored)
 */

import type { Tree } from "@nx/devkit";
import { formatFiles } from "@nx/devkit";
import { Effect } from "effect";
import { generateInfraCore, type InfraCoreOptions } from "../core/infra";
import { createExecutor } from "../../infrastructure/execution/executor";
import { formatOutput } from "../../infrastructure/output/formatter";
import type { InfraGeneratorSchema } from "./schema";

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
}

/**
 * Create infra executor with explicit type parameters
 */
const infraExecutor = createExecutor<NxInfraInput, InfraCoreOptions>(
  "infra",
  generateInfraCore,
  (validated, metadata) => {
    const includeClientServer = validated.includeClient && validated.includeServer ? true : undefined
    return {
      ...metadata,
      ...(validated.platform !== undefined && { platform: validated.platform }),
      ...(includeClientServer !== undefined && { includeClientServer })
    }
  }
);

export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Infra name is required and cannot be empty");
  }

  // Use spread pattern for optional properties to satisfy exactOptionalPropertyTypes
  const result = await Effect.runPromise(
    infraExecutor.execute({
      name: schema.name,
      ...(schema.description !== undefined && { description: schema.description }),
      ...(schema.tags !== undefined && { tags: schema.tags }),
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(schema.includeClient !== undefined && { includeClient: schema.includeClient }),
      ...(schema.includeServer !== undefined && { includeServer: schema.includeServer }),
      __interfaceType: "nx" as const,
      __nxTree: tree,
    })
  );

  await formatFiles(tree);

  return formatOutput(result, "nx");
}
