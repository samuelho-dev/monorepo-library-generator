/**
 * Provider Consolidation Index Template
 *
 * Generates the main index file for provider consolidation libraries
 * that provide unified access to cluster-related providers.
 *
 * @module monorepo-library-generator/infra/templates/provider-consolidation-index
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import { createNamingVariants } from '../../../utils/naming'

export interface ProviderConsolidationIndexOptions {
  readonly providers: readonly string[]
  readonly packageName: string
}

/**
 * Generate provider consolidation index file
 *
 * Creates the main barrel export that re-exports individual providers,
 * consolidated layers, and multi-provider orchestration.
 */
export function generateProviderConsolidationIndexTemplate(options: ProviderConsolidationIndexOptions) {
  const workspaceName = options.packageName.split('/')[0]

  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: 'Provider Consolidation Layer',
    description: 'Unified access to cluster-related providers',
    module: options.packageName
  })

  builder.addBlankLine()

  // Add provider imports as namespace imports
  for (const provider of options.providers) {
    const { className } = createNamingVariants(provider)
    builder.addRaw(`import * as ${className} from "${workspaceName}/provider-${provider}"`)
  }

  builder.addBlankLine()

  // Re-export individual providers for granular access
  builder.addComment('Re-export individual providers for granular access')
  for (const provider of options.providers) {
    const { className } = createNamingVariants(provider)
    builder.addRaw(`export { ${className} }`)
  }

  builder.addBlankLine()

  // Consolidated layers
  builder.addComment('Consolidated layers')
  builder.addRaw('export { ClusterInfrastructureLive } from "./lib/layers"')

  builder.addBlankLine()

  // Multi-provider orchestration
  builder.addComment('Multi-provider orchestration')
  builder.addRaw('export { ClusterOrchestrator } from "./lib/orchestrator"')

  builder.addBlankLine()

  return builder.toString()
}
