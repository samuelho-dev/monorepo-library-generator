/**
 * Feature Templates Index
 *
 * Exports all template functions for the feature generator.
 *
 * @module monorepo-library-generator/feature/templates
 */

export { generateAtomsFile } from './atoms.template';
// Client layer templates
export { generateAtomsIndexFile } from './atoms-index.template';
// Shared layer templates
export { generateErrorsFile } from './errors.template';
export { generateHooksFile } from './hooks.template';
export { generateHooksIndexFile } from './hooks-index.template';
// Index template
export { generateIndexFile } from './index.template';
// Server layer templates
export { generateLayersFile } from './layers.template';
// Edge layer templates
export { generateMiddlewareFile } from './middleware.template';
export { generateRpcFile } from './rpc.template';
// RPC layer templates
export { generateRpcErrorsFile } from './rpc-errors.template';
export { generateRpcHandlersFile } from './rpc-handlers.template';
export { generateSchemasFile } from './schemas.template';
export { generateServiceSpecFile } from './service-spec.template';
export { generateTypesFile } from './types.template';
