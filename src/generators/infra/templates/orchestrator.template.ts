/**
 * Cluster Orchestrator Template
 *
 * Generates an orchestrator service that coordinates multiple
 * providers for complex cluster operations.
 *
 * @module monorepo-library-generator/infra/templates/orchestrator
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { createNamingVariants } from "../../../utils/naming"

export interface OrchestratorOptions {
  readonly providers: ReadonlyArray<string>
  readonly packageName: string
}

/**
 * Generate cluster orchestrator file
 *
 * Creates a Context.Tag service that coordinates multiple providers
 * for bootstrap, health check, and teardown operations.
 */
export function generateOrchestratorTemplate(options: OrchestratorOptions) {
  const workspaceName = options.packageName.split("/")[0]

  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Cluster Orchestrator",
    description: "Coordinates multiple providers for complex cluster operations"
  })

  builder.addBlankLine()

  // Add imports
  builder.addImport("effect", "Context")
  builder.addImport("effect", "Effect")
  builder.addImport("effect", "Layer")

  for (const provider of options.providers) {
    const { className } = createNamingVariants(provider)
    builder.addImport(`${workspaceName}/provider-${provider}`, className)
  }

  builder.addBlankLine()

  // Generate provider dependencies union type
  const providerDeps = options.providers.map((p) => createNamingVariants(p).className).join(" | ")

  // Generate provider yield statements
  const providerYields = options.providers
    .map((p) => `      const ${p} = yield* ${createNamingVariants(p).className}`)
    .join("\n")

  builder.addRaw(`/**
 * ClusterOrchestrator service
 *
 * Provides high-level cluster coordination across multiple providers using Effect 3.0+ Context.Tag pattern.
 */
export class ClusterOrchestrator extends Context.Tag("@infra/ClusterOrchestrator")<
  ClusterOrchestrator,
  {
    /**
     * Coordinate cluster bootstrap across all providers
     */
    readonly bootstrap: Effect.Effect<void, Error, ${providerDeps}>

    /**
     * Coordinate cluster health check across all providers
     */
    readonly healthCheck: Effect.Effect<boolean, Error, ${providerDeps}>

    /**
     * Coordinate cluster teardown across all providers
     */
    readonly teardown: Effect.Effect<void, Error, ${providerDeps}>
  }
>() {
  /**
   * Live Layer - Production implementation
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
${providerYields}

      return {
        bootstrap: Effect.gen(function*() {
          // TODO: Implement multi-provider bootstrap coordination
          yield* Effect.logInfo("Coordinating cluster bootstrap")
        }).pipe(Effect.withSpan("ClusterOrchestrator.bootstrap")),

        healthCheck: Effect.gen(function*() {
          // TODO: Implement multi-provider health check
          yield* Effect.logInfo("Coordinating cluster health check")
          return true
        }).pipe(Effect.withSpan("ClusterOrchestrator.healthCheck")),

        teardown: Effect.gen(function*() {
          // TODO: Implement multi-provider teardown coordination
          yield* Effect.logInfo("Coordinating cluster teardown")
        }).pipe(Effect.withSpan("ClusterOrchestrator.teardown"))
      }
    })
  )
}`)

  builder.addBlankLine()

  return builder.toString()
}
