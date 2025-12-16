/**
 * Infrastructure Templates
 *
 * TypeScript-based template functions for infrastructure generator.
 * These replace the EJS templates with type-safe TypeScript functions.
 *
 * @module monorepo-library-generator/infra-templates
 */

export { generateClientLayersFile } from "./client-layers.template"
export { generateClientFile } from "./client.template"
export { generateConfigFile } from "./config.template"
export { generateEdgeLayersFile } from "./edge-layers.template"
export { generateEdgeFile } from "./edge.template"
export { generateErrorsFile } from "./errors.template"
export { generateIndexFile } from "./index.template"
export { generateServiceFile } from "./service.template"
export { generateMemoryProviderFile } from "./memory-provider.template"
export { generateServerLayersFile } from "./server-layers.template"
export { generateServerFile } from "./server.template"
export { generateUseHookFile } from "./use-hook.template"
