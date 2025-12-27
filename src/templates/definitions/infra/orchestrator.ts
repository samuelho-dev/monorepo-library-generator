/**
 * Infrastructure Orchestrator Template Definition
 *
 * Declarative template for generating lib/orchestrator.ts in infrastructure libraries.
 * Coordinates multiple providers for complex operations.
 *
 * @module monorepo-library-generator/templates/definitions/infra/orchestrator
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Orchestrator Template Definition
 *
 * Generates an orchestrator.ts file with:
 * - ClusterOrchestrator Context.Tag
 * - Multi-provider coordination methods
 * - Bootstrap, healthCheck, teardown operations
 */
export const infraOrchestratorTemplate: TemplateDefinition = {
  id: 'infra/orchestrator',
  meta: {
    title: 'Cluster Orchestrator',
    description: 'Coordinates multiple providers for complex cluster operations',
    module: '{scope}/infra-{fileName}/orchestrator'
  },
  imports: [{ from: 'effect', items: ['Context', 'Effect', 'Layer'] }],
  sections: [
    // Orchestrator Service
    {
      title: 'Cluster Orchestrator Service',
      content: {
        type: 'raw',
        value: `/**
 * ClusterOrchestrator service
 *
 * Provides high-level cluster coordination across multiple providers
 * using Effect 3.0+ Context.Tag pattern.
 *
 * NOTE: This is a template for provider consolidation.
 * You must add provider imports and dependencies based on your needs.
 */
export class ClusterOrchestrator extends Context.Tag("@infra/ClusterOrchestrator")<
  ClusterOrchestrator,
  {
    /**
     * Coordinate cluster bootstrap across all providers
     */
    readonly bootstrap: Effect.Effect<void, Error>

    /**
     * Coordinate cluster health check across all providers
     */
    readonly healthCheck: Effect.Effect<boolean, Error>

    /**
     * Coordinate cluster teardown across all providers
     */
    readonly teardown: Effect.Effect<void, Error>
  }
>() {
  /**
   * Live Layer - Production implementation
   *
   * TODO: Add provider dependencies via Effect.gen
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      // TODO: Yield provider services
      // const providerA = yield* ProviderA
      // const providerB = yield* ProviderB

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

  /**
   * Test Layer - Mock implementation for testing
   */
  static readonly Test = Layer.succeed(this, {
    bootstrap: Effect.void,
    healthCheck: Effect.succeed(true),
    teardown: Effect.void
  })
}`
      }
    }
  ]
}

export default infraOrchestratorTemplate
