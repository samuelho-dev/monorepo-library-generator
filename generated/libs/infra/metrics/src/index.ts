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
  MetricsService,
  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type MetricOptions
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  MetricsServiceError,
  MetricsInternalError,
  MetricsConfigError,
  MetricsConnectionError,
  MetricsTimeoutError,
  type MetricsError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// OpenTelemetry integration
export {
  makeMetricsOtelLayer,
  HistogramBoundaries,
  StandardMetricNames,
  type OtelMetricsConfig
} from "./lib/layers/otel-layer"
