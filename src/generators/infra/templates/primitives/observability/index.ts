/**
 * Observability Primitive Templates
 *
 * Exports template generators for unified observability infrastructure.
 *
 * This primitive provides:
 * - SDK layer factories for unified OTEL setup
 * - Supervisor layer for optional fiber tracking
 * - Logging service (Effect Logger wrapper)
 * - Metrics service (Effect.Metric wrapper)
 * - Configuration schema for validated config
 * - Preset configurations for common backends
 * - Error types for observability operations
 * - Constants (HistogramBoundaries, StandardMetricNames, LogLevelConfigs)
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

// OtelProvider service (the "Redis" equivalent for observability)
export { generateOtelProviderFile } from "./provider.template"

// SDK layer factories (used internally by OtelProvider, also exported for advanced users)
export { generateObservabilitySdkFile } from "./sdk.template"

// Fiber tracking Supervisor
export { generateObservabilitySupervisorFile } from "./supervisor.template"

// Configuration schema
export { generateObservabilityConfigFile } from "./config.template"

// Preset configurations
export { generateObservabilityPresetsFile } from "./presets.template"

// Error types
export { generateObservabilityErrorsFile } from "./errors.template"

// Constants (HistogramBoundaries, StandardMetricNames, LogLevelConfigs, SpanAttributes)
export { generateObservabilityConstantsFile } from "./constants.template"

// Logging service (Effect Logger wrapper)
export { generateLoggingServiceFile } from "./logging-service.template"

// Metrics service (Effect.Metric wrapper)
export { generateMetricsServiceFile } from "./metrics-service.template"

// Index file with barrel exports
export { generateObservabilityIndexFile } from "./index.template"
