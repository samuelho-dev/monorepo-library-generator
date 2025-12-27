/**
 * @samuelho-dev/infra-observability
 *
 * Unified observability infrastructure using Effect primitives.

Provides services for logging and metrics that integrate with OpenTelemetry
via the provider-opentelemetry library.

Architecture:
- LoggingService and MetricsService consume OpenTelemetryProvider
- When OpenTelemetryProvider is composed in the layer tree, Effect.withSpan()
  and Effect.Metric automatically export to OpenTelemetry

Key exports:
- LoggingService: Structured logging with Effect.log* primitives
- MetricsService: Counters, gauges, histograms with Effect.Metric
- withFiberTracking: Optional Supervisor layer for fiber tracking
- Presets: OtlpPreset, JaegerPreset, ConsolePreset, etc.
 *
 * @module @samuelho-dev/infra-observability
 * @see https://effect.website/docs/observability/otel-tracing
 */
// ============================================================================
// Fiber Tracking Supervisor
// ============================================================================
// Optional fiber lifecycle tracking
export {
  FiberTrackingFiltered,
  FiberTrackingFull,
  FiberTrackingMinimal,
  makeFiberTrackingSupervisor,
  type SupervisorConfig,
  withFiberTracking
} from "./lib/supervisor"

// ============================================================================
// Configuration
// ============================================================================
// Configuration schema and types
export {
  DevelopmentConfig,
  type LogsConfig,
  LogsConfigSchema,
  type MetricsConfig,
  MetricsConfigSchema,
  type ObservabilityConfig,
  ObservabilityConfigSchema,
  ProductionConfig,
  TestConfig,
  type TracesConfig,
  TracesConfigSchema
} from "./lib/config"

// ============================================================================
// Presets
// ============================================================================
// Pre-configured OTEL SDK layers for common backends
export {
  ConsolePreset,
  type ConsolePresetConfig,
  GrafanaCloudPreset,
  type GrafanaCloudPresetConfig,
  JaegerPreset,
  type JaegerPresetConfig,
  NoopPreset,
  OtlpPreset,
  type OtlpPresetConfig
} from "./lib/presets"

// ============================================================================
// Error Types
// ============================================================================
// Error types for observability operations
export {
  ObservabilityConfigError,
  ObservabilityConnectionError,
  ObservabilityError,
  type ObservabilityErrorType,
  ObservabilityExportError,
  ObservabilityInitError
} from "./lib/errors"

// ============================================================================
// Constants
// ============================================================================
// Common constants for metrics, logging, and tracing
export {
  HistogramBoundaries,
  LogLevelConfigs,
  SpanAttributes,
  StandardMetricNames,
  withMinLogLevel
} from "./lib/constants"

// ============================================================================
// Logging Service
// ============================================================================
// Effect Logger wrapper with structured logging
export { type LogContext, type LoggingOperations, LoggingService } from "./lib/logging"

// ============================================================================
// Metrics Service
// ============================================================================
// Effect.Metric wrapper with counters, gauges, histograms
export {
  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type HistogramOptions,
  type MetricOptions,
  MetricsService
} from "./lib/metrics"
