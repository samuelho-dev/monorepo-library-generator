/**
 * @samuelho-dev/infra-observability
 *
 * Unified OpenTelemetry observability infrastructure.

Provides layer factories for OTEL SDK setup with optional fiber tracking.
Effect's built-in tracing (Effect.withSpan) and metrics (Effect.Metric)
automatically integrate with these layers.

Key exports:
- makeSdkLayer: Create OTEL SDK layer from configuration
- Live/Test/Dev/Auto: Static layer presets
- withFiberTracking: Optional Supervisor layer for fiber tracking
- Presets: OtlpPreset, JaegerPreset, ConsolePreset, etc.
 *
 * @module @samuelho-dev/infra-observability
 * @see https://effect.website/docs/observability/otel-tracing
 */

// ============================================================================
// OTEL Provider (Infrastructure)
// ============================================================================

// OpenTelemetry SDK provider - the "Redis" equivalent for observability
// This is consumed internally by LoggingService and MetricsService
export {
  OtelProvider,
  type OtelProviderOperations,
} from "./lib/provider"

// ============================================================================
// SDK Layer Factories (Advanced)
// ============================================================================

// Advanced: Direct OTEL SDK layer factories for custom setups
// Most users should use LoggingService.Live and MetricsService.Live instead
export {
  makeSdkLayer,
  Live as SdkLive,
  Test as SdkTest,
  Dev as SdkDev,
  Auto as SdkAuto,
} from "./lib/sdk"

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
