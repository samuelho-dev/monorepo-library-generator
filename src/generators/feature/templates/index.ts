/**
 * Feature Templates Index
 *
 * Exports all template functions for the feature generator.
 *
 * @module monorepo-library-generator/feature/templates
 */

// Shared layer templates
export { generateErrorsFile } from "./errors.template"
export { generateSchemasFile } from "./schemas.template"
export { generateTypesFile } from "./types.template"

// Server layer templates
export { generateLayersFile } from "./layers.template"
export { generateServiceSpecFile } from "./service-spec.template"

// RPC layer templates
export { generateRpcErrorsFile } from "./rpc-errors.template"
export { generateRpcHandlersFile } from "./rpc-handlers.template"
export { generateRpcFile } from "./rpc.template"

// Client layer templates
export { generateAtomsIndexFile } from "./atoms-index.template"
export { generateAtomsFile } from "./atoms.template"
export { generateHooksIndexFile } from "./hooks-index.template"
export { generateHooksFile } from "./hooks.template"

// Edge layer templates
export { generateMiddlewareFile } from "./middleware.template"

// Index template
export { generateIndexFile } from "./index.template"
