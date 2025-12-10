export const generateOrchestratorTemplate = (options: {
  providers: Array<string>
  packageName: string
}) => {
  const workspaceName = options.packageName.split("/")[0]
  const providerImports = options.providers
    .map((p) => {
      const className = toClassName(p)
      return `import { ${className} } from "${workspaceName}/provider-${p}"`
    })
    .join("\n")

  const providerDeps = options.providers
    .map((p) => toClassName(p))
    .join(" | ")

  return `/**
 * Cluster Orchestrator
 *
 * Coordinates multiple providers for complex cluster operations
 */

import { Context, Effect, Layer } from "effect"
${providerImports}

/**
 * ClusterOrchestrator service interface
 *
 * Provides high-level cluster coordination across multiple providers
 */
export interface ClusterOrchestrator {
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

/**
 * ClusterOrchestrator service tag
 */
export const ClusterOrchestrator = Context.GenericTag<ClusterOrchestrator>("@infra/ClusterOrchestrator")

/**
 * ClusterOrchestrator implementation
 */
export const makeClusterOrchestrator = Effect.gen(function* () {
${options.providers.map((p) => `  const ${p} = yield* ${toClassName(p)}`).join("\n")}

  return ClusterOrchestrator.of({
    bootstrap: Effect.gen(function* () {
      // TODO: Implement multi-provider bootstrap coordination
      yield* Effect.logInfo("Coordinating cluster bootstrap")
    }),

    healthCheck: Effect.gen(function* () {
      // TODO: Implement multi-provider health check
      yield* Effect.logInfo("Coordinating cluster health check")
      return true
    }),

    teardown: Effect.gen(function* () {
      // TODO: Implement multi-provider teardown coordination
      yield* Effect.logInfo("Coordinating cluster teardown")
    })
  })
})

/**
 * ClusterOrchestrator live layer
 */
export const ClusterOrchestratorLive = Layer.effect(
  ClusterOrchestrator,
  makeClusterOrchestrator
)
`
}

const toClassName = (name: string) => {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
