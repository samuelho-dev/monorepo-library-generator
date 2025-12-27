/**
 * Infrastructure Provider Consolidation Layers Template Definition
 *
 * Declarative template for generating lib/layers.ts for provider consolidation libraries.
 * Combines all cluster providers into unified layer.
 *
 * @module monorepo-library-generator/templates/definitions/infra/provider-consolidation-layers
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Provider Consolidation Layers Template Definition
 *
 * Generates a consolidated layers.ts file with:
 * - Provider layer imports
 * - ClusterInfrastructureLive merged layer
 */
export const infraProviderConsolidationLayersTemplate: TemplateDefinition = {
  id: 'infra/provider-consolidation-layers',
  meta: {
    title: 'Consolidated Infrastructure Layers',
    description: 'Combines all cluster providers into unified layer',
    module: '{packageName}/layers'
  },
  imports: [{ from: 'effect', items: ['Layer'] }],
  sections: [
    // Consolidated Layer
    {
      title: 'Cluster Infrastructure Layer',
      content: {
        type: 'raw',
        value: `// Provider layer imports are generated based on configuration
// Example:
// import { KubernetesLive } from "{scope}/provider-kubernetes"
// import { DockerLive } from "{scope}/provider-docker"
// import { TerraformLive } from "{scope}/provider-terraform"

/**
 * Cluster infrastructure live layer
 *
 * Provides all cluster-related providers in a single layer
 *
 * Usage:
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const kubectl = yield* Kubectl
 *   const talos = yield* Talos
 *   // ... use providers
 * }).pipe(Effect.provide(ClusterInfrastructureLive))
 * \`\`\`
 *
 * TODO: Merge provider layers
 * export const ClusterInfrastructureLive = Layer.mergeAll(
 *   KubernetesLive,
 *   DockerLive,
 *   TerraformLive
 * )
 */
export const ClusterInfrastructureLive = Layer.empty`
      }
    }
  ]
}

export default infraProviderConsolidationLayersTemplate
