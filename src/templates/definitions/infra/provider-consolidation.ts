/**
 * Infrastructure Provider Consolidation Template Definition
 *
 * Declarative template for generating index.ts for provider consolidation libraries.
 * Unified access to cluster-related providers.
 *
 * @module monorepo-library-generator/templates/definitions/infra/provider-consolidation
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Infrastructure Provider Consolidation Template Definition
 *
 * Generates a provider consolidation index.ts file with:
 * - Provider namespace imports
 * - Re-exports for individual providers
 * - Consolidated layer exports
 * - Orchestrator exports
 */
export const infraProviderConsolidationTemplate: TemplateDefinition = {
  id: "infra/provider-consolidation",
  meta: {
    title: "Provider Consolidation Layer",
    description: `Unified access to cluster-related providers`,
    module: "{packageName}"
  },
  imports: [],
  sections: [
    // Provider Imports and Exports
    {
      title: "Provider Imports",
      content: {
        type: "raw",
        value: `// Provider imports are generated based on configuration
// Example:
// import * as Kubernetes from "{scope}/provider-kubernetes"
// import * as Docker from "{scope}/provider-docker"
// import * as Terraform from "{scope}/provider-terraform"

// Re-export individual providers for granular access
// Example:
// export { Kubernetes }
// export { Docker }
// export { Terraform }`
      }
    },
    // Consolidated Layers
    {
      title: "Consolidated Layers",
      content: {
        type: "raw",
        value: `// Consolidated layers
export { ClusterInfrastructureLive } from "./lib/layers"`
      }
    },
    // Orchestrator
    {
      content: {
        type: "raw",
        value: `// Multi-provider orchestration
export { ClusterOrchestrator } from "./lib/orchestrator"`
      }
    }
  ]
}

export default infraProviderConsolidationTemplate
