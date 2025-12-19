/**
 * Feature Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { Console, Effect, ParseResult } from "effect"
import { generateFeatureCore, type FeatureCoreOptions } from "../../generators/core/feature"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatOutput } from "../../infrastructure/output/formatter"
import {
  decodeFeatureInput,
  type FeatureInput
} from "../../infrastructure/validation/registry"

/**
 * Feature Generator Options - imported from validation registry
 * for single source of truth
 */
export type FeatureGeneratorOptions = FeatureInput

const featureExecutor = createExecutor<FeatureInput, FeatureCoreOptions>(
  "feature",
  generateFeatureCore,
  (validated, metadata) => ({
    ...metadata,
    ...(validated.dataAccessLibrary !== undefined && { dataAccessLibrary: validated.dataAccessLibrary }),
    includeClientState: validated.includeClientState ?? false,
    ...(validated.scope !== undefined && { scope: validated.scope }),
    ...(validated.platform !== undefined && { platform: validated.platform }),
    ...(validated.includeClientServer !== undefined && { includeClientServer: validated.includeClientServer }),
    includeRPC: validated.includeRPC ?? false,
    includeCQRS: validated.includeCQRS ?? false,
    includeEdge: validated.includeEdge ?? false
  })
)

export function generateFeature(options: FeatureGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeFeatureInput(options).pipe(
      Effect.mapError((parseError) =>
        new Error(ParseResult.TreeFormatter.formatErrorSync(parseError))
      )
    )

    yield* Console.log(`Creating feature library: ${validated.name}...`)

    const result = yield* featureExecutor.execute({
      ...validated,
      __interfaceType: "cli" as const
    })

    const output = formatOutput(result, "cli")
    yield* Console.log(output)

    return result
  })
}
