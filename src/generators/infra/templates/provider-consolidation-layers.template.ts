/**
 * Provider Consolidation Layers Template
 *
 * Generates consolidated infrastructure layers that combine
 * multiple cluster providers into a unified layer.
 *
 * @module monorepo-library-generator/infra/templates/provider-consolidation-layers
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import { createNamingVariants } from '../../../utils/naming'

export interface ProviderConsolidationLayersOptions {
  readonly providers: readonly string[]
  readonly packageName: string
}

/**
 * Generate consolidated infrastructure layers file
 *
 * Combines all cluster providers into a unified layer for simplified
 * dependency injection across services.
 */
export function generateProviderConsolidationLayersTemplate(options: ProviderConsolidationLayersOptions) {
  const workspaceName = options.packageName.split('/')[0]

  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: 'Consolidated Infrastructure Layers',
    description: 'Combines all cluster providers into unified layer'
  })

  builder.addBlankLine()

  // Add imports
  builder.addImport('effect', 'Layer')

  for (const provider of options.providers) {
    const { className } = createNamingVariants(provider)
    builder.addImport(`${workspaceName}/provider-${provider}`, `${className}Live`)
  }

  builder.addBlankLine()

  // Generate layer merge
  const layerMergeEntries = options.providers
    .map((p) => `  ${createNamingVariants(p).className}Live`)
    .join(',\n')

  builder.addRaw(`/**
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
 */
export const ClusterInfrastructureLive = Layer.mergeAll(
${layerMergeEntries}
)`)

  builder.addBlankLine()

  return builder.toString()
}
