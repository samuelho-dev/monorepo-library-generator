/**
 * Observability Primitive Templates
 *
 * Exports template generators for unified observability infrastructure.
 *
 * This primitive provides:
 * - Supervisor layer for optional fiber tracking
 * - Logging service (Effect Logger wrapper)
 * - Metrics service (Effect.Metric wrapper)
 * - Configuration schema for validated config
 * - Preset configurations for common backends
 * - Error types for observability operations
 * - Constants (HistogramBoundaries, StandardMetricNames, LogLevelConfigs)
 *
 * Architecture:
 * - LoggingService and MetricsService consume OpenTelemetryProvider from provider-opentelemetry
 * - This follows the same pattern as infra-cache consuming RedisService from provider-redis
 * - When OpenTelemetryProvider is composed in the layer tree, Effect.withSpan
 *   and Effect.Metric automatically export to OpenTelemetry
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

// Configuration schema
export { generateObservabilityConfigFile } from './config.template'
// Constants (HistogramBoundaries, StandardMetricNames, LogLevelConfigs, SpanAttributes)
export { generateObservabilityConstantsFile } from './constants.template'
// Error types
export { generateObservabilityErrorsFile } from './errors.template'
// Index file with barrel exports
export { generateObservabilityIndexFile } from './index.template'
// Logging service (Effect Logger wrapper - consumes OpenTelemetryProvider)
export { generateLoggingServiceFile } from './logging-service.template'
// Metrics service (Effect.Metric wrapper - consumes OpenTelemetryProvider)
export { generateMetricsServiceFile } from './metrics-service.template'
// Preset configurations
export { generateObservabilityPresetsFile } from './presets.template'
// Fiber tracking Supervisor
export { generateObservabilitySupervisorFile } from './supervisor.template'
