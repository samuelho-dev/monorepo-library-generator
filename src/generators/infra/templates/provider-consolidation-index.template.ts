export const generateProviderConsolidationIndexTemplate = (options: {
  providers: Array<string>;
  packageName: string;
}) => {
  const workspaceName = options.packageName.split('/')[0]; // @ai-dev-env
  const imports = options.providers
    .map((p) => `import * as ${toClassName(p)} from "${workspaceName}/provider-${p}"`)
    .join('\n');

  const exports = options.providers.map((p) => `export { ${toClassName(p)} }`).join('\n');

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
`;
};

const toClassName = (name: string) => {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};
