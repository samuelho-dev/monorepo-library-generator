/**
 * Feature Templates Index
 *
 * Exports all template functions for the feature generator.
 *
 * @module monorepo-library-generator/feature/templates
 */

export { generateAtomsFile } from "./atoms.template"
// Client layer templates
export { generateAtomsIndexFile } from "./atoms-index.template"
// CQRS templates
export {
  generateCommandsBaseFile,
  generateCommandsIndexFile,
  generateCqrsIndexFile,
  generateOperationsExecutorFile,
  generateOperationsIndexFile,
  generateProjectionsBuilderFile,
  generateProjectionsIndexFile,
  generateQueriesBaseFile,
  generateQueriesIndexFile,
  // Sub-module CQRS bus
  generateSubModuleCqrsBusFile
} from "./cqrs/index"
// Shared layer templates
export { generateErrorsFile } from "./errors.template"
// Events templates (PubSub integration)
export { generateEventsPublisherFile } from "./events/events-publisher.template"
export { generateHooksIndexFile } from "./hooks-index.template"
export { generateHooksFile } from "./hooks.template"
// Index template
export { generateIndexFile } from "./index.template"
// Jobs templates (Queue integration)
export { generateJobsQueueFile } from "./jobs/jobs-queue.template"
// Server layer templates
export { generateLayersFile } from "./layers.template"
export {
  // Unified handlers and router (no external/internal split)
  generateHandlersFile as generateRpcHandlersFile,
  generateRouterFile as generateRpcRouterFile,
  generateRpcBarrelFile
} from "./rpc/index"
// RPC templates (Contract-First architecture)
export { generateRpcErrorsFile } from "./rpc-errors.template"
// Other templates
export { generateSchemasFile } from "./schemas.template"
export { generateServiceSpecFile } from "./service-spec.template"
export { generateTypesFile } from "./types.template"
