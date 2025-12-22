/**
 * @myorg/infra-metrics
 *
 * Metrics infrastructure service

Provides Metrics functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-metrics
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type MetricOptions,
  MetricsService,
} from "./lib/service/service";

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  MetricsConfigError,
  MetricsConnectionError,
  type MetricsError,
  MetricsInternalError,
  MetricsServiceError,
  MetricsTimeoutError,
} from "./lib/service/errors";

// ============================================================================
// Additional Layers
// ============================================================================

// OpenTelemetry integration
export {
  HistogramBoundaries,
  makeMetricsOtelLayer,
  type OtelMetricsConfig,
  StandardMetricNames,
} from "./lib/layers/otel-layer";
