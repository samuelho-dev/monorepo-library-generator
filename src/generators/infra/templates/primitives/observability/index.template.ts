/**
 * Observability Index Template
 *
 * Generates barrel exports for observability infrastructure library.
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate observability index file with barrel exports
 */
export function generateObservabilityIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${scope}/infra-${fileName}`,
    description: `Unified observability infrastructure using Effect primitives.

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
- Presets: OtlpPreset, JaegerPreset, ConsolePreset, etc.`,
    module: `${scope}/infra-${fileName}`,
    see: ["https://effect.website/docs/observability/otel-tracing"]
  })

  builder.addSectionComment("Fiber Tracking Supervisor")

  builder.addRaw(`// Optional fiber lifecycle tracking
export {
  makeFiberTrackingSupervisor,
  withFiberTracking,
  FiberTrackingMinimal,
  FiberTrackingFull,
  FiberTrackingFiltered,
  type SupervisorConfig,
} from "./lib/supervisor"
`)

  builder.addSectionComment("Configuration")

  builder.addRaw(`// Configuration schema and types
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
`)

  builder.addSectionComment("Presets")

  builder.addRaw(`// Pre-configured OTEL SDK layers for common backends
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
`)

  builder.addSectionComment("Error Types")

  builder.addRaw(`// Error types for observability operations
export {
  ${className}Error,
  ${className}ConfigError,
  ${className}ExportError,
  ${className}ConnectionError,
  ${className}InitError,
  type ${className}ErrorType,
} from "./lib/errors"
`)

  builder.addSectionComment("Constants")

  builder.addRaw(`// Common constants for metrics, logging, and tracing
export {
  HistogramBoundaries,
  StandardMetricNames,
  LogLevelConfigs,
  withMinLogLevel,
  SpanAttributes,
} from "./lib/constants"
`)

  builder.addSectionComment("Logging Service")

  builder.addRaw(`// Effect Logger wrapper with structured logging
export {
  LoggingService,
  type LogContext,
  type LoggingOperations,
} from "./lib/logging"
`)

  builder.addSectionComment("Metrics Service")

  builder.addRaw(`// Effect.Metric wrapper with counters, gauges, histograms
export {
  MetricsService,
  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type MetricOptions,
  type HistogramOptions,
} from "./lib/metrics"
`)

  return builder.toString()
}
