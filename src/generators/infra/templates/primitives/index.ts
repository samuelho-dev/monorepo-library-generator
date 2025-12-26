/**
 * Infrastructure Primitive Templates
 *
 * Exports template generators for all Effect primitive wrappers.
 *
 * Each primitive provides proper Effect integration:
 * - cache: Effect.Cache with TTL, lookup, and Redis backing
 * - queue: Effect.Queue with bounded/unbounded/dropping/sliding
 * - pubsub: Effect.PubSub with topics and subscriptions
 * - observability: Unified OTEL SDK + LoggingService + MetricsService
 *
 * NOTE: logging and metrics are now part of observability.
 * Use infra-observability for unified tracing, logging, and metrics.
 *
 * @module monorepo-library-generator/infra-templates/primitives
 */

// Cache primitive templates
export { generateCacheInterfaceFile } from "./cache/interface.template"
export { generateCacheRedisLayerFile } from "./cache/redis-layer.template"
// PubSub primitive templates
export { generatePubSubInterfaceFile } from "./pubsub/interface.template"
export { generatePubSubRedisLayerFile } from "./pubsub/redis-layer.template"
// Queue primitive templates
export { generateQueueInterfaceFile } from "./queue/interface.template"
export { generateQueueRedisLayerFile } from "./queue/redis-layer.template"
// Observability primitive templates (LoggingService, MetricsService - consumes provider-opentelemetry)
export { generateObservabilityConfigFile } from "./observability/config.template"
export { generateObservabilityConstantsFile } from "./observability/constants.template"
export { generateObservabilityErrorsFile } from "./observability/errors.template"
export { generateObservabilityIndexFile } from "./observability/index.template"
export { generateLoggingServiceFile } from "./observability/logging-service.template"
export { generateMetricsServiceFile } from "./observability/metrics-service.template"
export { generateObservabilityPresetsFile } from "./observability/presets.template"
export { generateObservabilitySupervisorFile } from "./observability/supervisor.template"
// Shared utilities and templates
export { generatePrimitiveErrorsFile } from "./shared/errors.template"
export { generatePrimitiveIndexFile } from "./shared/index.template"
