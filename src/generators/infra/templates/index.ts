/**
 * Infrastructure Templates
 *
 * TypeScript-based template functions for infrastructure generator.
 * These replace the EJS templates with type-safe TypeScript functions.
 *
 * @module monorepo-library-generator/infra-templates
 */

export { generateClientFile } from './client.template';
export { generateClientLayersFile } from './client-layers.template';
export { generateConfigFile } from './config.template';
export { generateDatabaseIndexFile } from './database-index.template';
export { generateEdgeFile } from './edge.template';
export { generateEdgeLayersFile } from './edge-layers.template';
export { generateErrorsFile } from './errors.template';
export { generateIndexFile } from './index.template';
export { generateMemoryProviderFile } from './memory-provider.template';
export { generateServerFile } from './server.template';
export { generateServerLayersFile } from './server-layers.template';
export { generateServiceFile } from './service.template';
export { generateInfraServiceSpecFile } from './service-spec.template';
export { generateUseHookFile } from './use-hook.template';
