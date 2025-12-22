/**
 * Infrastructure Primitive Templates
 *
 * Exports template generators for all Effect primitive wrappers.
 *
 * Each primitive provides proper Effect integration:
 * - cache: Effect.Cache with TTL, lookup, and Redis backing
 * - logging: Effect Logger with OpenTelemetry
 * - metrics: Effect.Metric with counters, gauges, histograms
 * - queue: Effect.Queue with bounded/unbounded/dropping/sliding
 * - pubsub: Effect.PubSub with topics and subscriptions
 *
 * @module monorepo-library-generator/infra-templates/primitives
 */

// Cache primitive templates
export {
  generateCacheInterfaceFile,
  generateCacheRedisLayerFile,
} from './cache';
// Logging primitive templates
export {
  generateLoggingInterfaceFile,
  generateLoggingOtelLayerFile,
} from './logging';
// Metrics primitive templates
export {
  generateMetricsInterfaceFile,
  generateMetricsOtelLayerFile,
} from './metrics';
// PubSub primitive templates
export {
  generatePubSubInterfaceFile,
  generatePubSubRedisLayerFile,
} from './pubsub';

// Queue primitive templates
export {
  generateQueueInterfaceFile,
  generateQueueRedisLayerFile,
} from './queue';
// Shared utilities and templates
export {
  generatePrimitiveErrorsFile,
  generatePrimitiveIndexFile,
  generateSharedLayerUtilsFile,
} from './shared';
