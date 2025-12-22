export const generateOrchestratorTemplate = (options: {
  providers: Array<string>;
  packageName: string;
}) => {
  const workspaceName = options.packageName.split('/')[0];
  const providerImports = options.providers
    .map((p) => {
      const className = toClassName(p);
      return `import { ${className} } from "${workspaceName}/provider-${p}"`;
    })
    .join('\n');

  const providerDeps = options.providers.map((p) => toClassName(p)).join(' | ');

  return `/**
 * Cluster Orchestrator
 *
 * Coordinates multiple providers for complex cluster operations
 */

import { Context, Effect, Layer } from "effect"
${providerImports}

/**
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
    Effect.gen(function* () {
${options.providers.map((p) => `      const ${p} = yield* ${toClassName(p)}`).join('\n')}

      return {
        bootstrap: Effect.gen(function* () {
          // TODO: Implement multi-provider bootstrap coordination
          yield* Effect.logInfo("Coordinating cluster bootstrap")
        }).pipe(Effect.withSpan("ClusterOrchestrator.bootstrap")),

        healthCheck: Effect.gen(function* () {
          // TODO: Implement multi-provider health check
          yield* Effect.logInfo("Coordinating cluster health check")
          return true
        }).pipe(Effect.withSpan("ClusterOrchestrator.healthCheck")),

        teardown: Effect.gen(function* () {
          // TODO: Implement multi-provider teardown coordination
          yield* Effect.logInfo("Coordinating cluster teardown")
        }).pipe(Effect.withSpan("ClusterOrchestrator.teardown"))
      }
    })
  )
}
`;
};

const toClassName = (name: string) => {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};
