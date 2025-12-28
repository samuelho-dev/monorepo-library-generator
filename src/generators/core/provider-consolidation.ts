import { Effect } from 'effect'
import type { FileSystemAdapter } from '../../utils/filesystem'
import { generateOrchestratorTemplate } from '../infra/templates/orchestrator.template'
import { generateProviderConsolidationIndexTemplate } from '../infra/templates/provider-consolidation-index.template'
import { generateProviderConsolidationLayersTemplate } from '../infra/templates/provider-consolidation-layers.template'

export interface ProviderConsolidationOptions {
  projectRoot: string
  sourceRoot: string
  packageName: string
  providers: string[]
}

export const generateProviderConsolidation = (
  adapter: FileSystemAdapter,
  options: ProviderConsolidationOptions
) =>
  Effect.gen(function* () {
    // Generate main index with provider re-exports
    yield* adapter.writeFile(
      `${options.sourceRoot}/index.ts`,
      generateProviderConsolidationIndexTemplate({
        providers: options.providers,
        packageName: options.packageName
      })
    )

    // Generate layers.ts with consolidated Layer
    yield* adapter.writeFile(
      `${options.sourceRoot}/lib/layers.ts`,
      generateProviderConsolidationLayersTemplate({
        providers: options.providers,
        packageName: options.packageName
      })
    )

    // Generate orchestrator (optional multi-provider coordination)
    yield* adapter.writeFile(
      `${options.sourceRoot}/lib/orchestrator.ts`,
      generateOrchestratorTemplate({
        providers: options.providers,
        packageName: options.packageName
      })
    )

    return {
      consolidatedProviders: options.providers,
      filesGenerated: 3
    }
  })
