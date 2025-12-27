/**
 * Infrastructure Templates
 *
 * TypeScript-based template functions for infrastructure generator.
 * These replace the EJS templates with type-safe TypeScript functions.
 *
 * @module monorepo-library-generator/infra-templates
 */

// Auth templates
export {
  generateAuthErrorsFile,
  generateAuthIndexFile,
  generateAuthServiceFile,
  generateAuthTypesFile
} from "./auth/index"
// Core infrastructure templates
export { generateClientLayersFile } from "./client-layers.template"
export { generateConfigFile } from "./config.template"
export { generateDatabaseServiceFile } from "./database-service.template"
export { generateErrorsFile } from "./errors.template"
export { generateIndexFile } from "./index.template"
export { generateMemoryProviderFile } from "./memory-provider.template"
export { generateOrchestratorTemplate as generateOrchestratorFile } from "./orchestrator.template"
// Primitive templates (cache, queue, pubsub, observability)
export {
  // Cache
  generateCacheInterfaceFile,
  generateCacheRedisLayerFile,
  // Observability (LoggingService, MetricsService - consumes provider-opentelemetry)
  generateLoggingServiceFile,
  generateMetricsServiceFile,
  generateObservabilityConfigFile,
  generateObservabilityConstantsFile,
  generateObservabilityErrorsFile,
  generateObservabilityIndexFile,
  generateObservabilityPresetsFile,
  generateObservabilitySupervisorFile,
  // Shared primitives
  generatePrimitiveErrorsFile,
  generatePrimitiveIndexFile,
  // PubSub
  generatePubSubInterfaceFile,
  generatePubSubRedisLayerFile,
  // Queue
  generateQueueInterfaceFile,
  generateQueueRedisLayerFile
} from "./primitives/index"
export { generateProviderConsolidationIndexTemplate as generateProviderConsolidationIndexFile } from "./provider-consolidation-index.template"
export { generateProviderConsolidationLayersTemplate as generateProviderConsolidationLayersFile } from "./provider-consolidation-layers.template"
// RPC templates
export {
  generateAuthMiddlewareFile,
  generateMiddlewareIndexFile,
  generateRequestMetaMiddlewareFile,
  generateRouteSelectorMiddlewareFile,
  generateRpcClientFile,
  generateRpcClientHooksFile,
  generateRpcCoreFile,
  generateRpcErrorsFile,
  generateRpcIndexFile,
  generateRpcRouterFile,
  generateRpcTransportFile,
  generateServiceAuthMiddlewareFile
} from "./rpc/index"
export { generateServerLayersFile } from "./server-layers.template"
export { generateInfraServiceSpecFile } from "./service-spec.template"
export { generateServiceFile } from "./service.template"

// Storage templates
export {
  generateStorageErrorsFile,
  generateStorageIndexFile,
  generateStorageServiceFile,
  generateStorageTypesFile
} from "./storage/index"
export { generateUseHookFile } from "./use-hook.template"
