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
  makeFiberTrackingSupervisor,
  withFiberTracking,
  FiberTrackingMinimal,
  FiberTrackingFull,
  FiberTrackingFiltered,
  type SupervisorConfig,
} from "./lib/supervisor"

// ============================================================================
// Configuration
// ============================================================================
// Configuration schema and types
export {
  ObservabilityConfigSchema,
  TracesConfigSchema,
  MetricsConfigSchema,
  LogsConfigSchema,
  ProductionConfig,
  DevelopmentConfig,
  TestConfig,
  type ObservabilityConfig,
  type TracesConfig,
  type MetricsConfig,
  type LogsConfig,
} from "./lib/config"

// ============================================================================
// Presets
// ============================================================================
// Pre-configured OTEL SDK layers for common backends
export {
  OtlpPreset,
  JaegerPreset,
  ConsolePreset,
  NoopPreset,
  GrafanaCloudPreset,
  type OtlpPresetConfig,
  type JaegerPresetConfig,
  type ConsolePresetConfig,
  type GrafanaCloudPresetConfig,
} from "./lib/presets"

// ============================================================================
// Error Types
// ============================================================================
// Error types for observability operations
export {
  ObservabilityError,
  ObservabilityConfigError,
  ObservabilityExportError,
  ObservabilityConnectionError,
  ObservabilityInitError,
  type ObservabilityErrorType,
} from "./lib/errors"

// ============================================================================
// Constants
// ============================================================================
// Common constants for metrics, logging, and tracing
export {
  HistogramBoundaries,
  StandardMetricNames,
  LogLevelConfigs,
  withMinLogLevel,
  SpanAttributes,
} from "./lib/constants"

// ============================================================================
// Logging Service
// ============================================================================
// Effect Logger wrapper with structured logging
export {
  LoggingService,
  type LogContext,
  type LoggingOperations,
} from "./lib/logging"

// ============================================================================
// Metrics Service
// ============================================================================
// Effect.Metric wrapper with counters, gauges, histograms
export {
  MetricsService,
  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type MetricOptions,
  type HistogramOptions,
} from "./lib/metrics"
