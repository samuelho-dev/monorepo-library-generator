/**
 * Infrastructure Templates
 *
 * TypeScript-based template functions for infrastructure generator.
 * These replace the EJS templates with type-safe TypeScript functions.
 *
 * @module monorepo-library-generator/infra-templates
 */

export { generateErrorsFile } from './errors.template';
export { generateInterfaceFile } from './interface.template';
export { generateConfigFile } from './config.template';
export { generateMemoryProviderFile } from './memory-provider.template';
export { generateServerLayersFile } from './server-layers.template';
export { generateClientLayersFile } from './client-layers.template';
export { generateEdgeLayersFile } from './edge-layers.template';
export { generateUseHookFile } from './use-hook.template';
export { generateIndexFile } from './index.template';
export { generateServerFile } from './server.template';
export { generateClientFile } from './client.template';
export { generateEdgeFile } from './edge.template';
