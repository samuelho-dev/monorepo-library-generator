import { createNamingVariants } from "../../../utils/naming"

export const generateProviderConsolidationIndexTemplate = (options: {
  providers: Array<string>
  packageName: string
}) => {
  const workspaceName = options.packageName.split("/")[0] // @ai-dev-env
  const imports = options.providers
    .map((p) => `import * as ${createNamingVariants(p).className} from "${workspaceName}/provider-${p}"`)
    .join("\n")

  const exports = options.providers.map((p) => `export { ${createNamingVariants(p).className} }`).join("\n")

  return `/**
 * Provider Consolidation Layer
 *
 * Unified access to cluster-related providers
 *
 * @module ${options.packageName}
 */

${imports}

// Re-export individual providers for granular access
${exports}

// Consolidated layers
export { ClusterInfrastructureLive } from "./lib/layers"

// Multi-provider orchestration
export { ClusterOrchestrator } from "./lib/orchestrator"
`
}
