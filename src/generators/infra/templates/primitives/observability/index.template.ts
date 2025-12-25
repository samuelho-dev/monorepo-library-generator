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
    description: `Unified OpenTelemetry observability infrastructure.

Provides layer factories for OTEL SDK setup with optional fiber tracking.
Effect's built-in tracing (Effect.withSpan) and metrics (Effect.Metric)
automatically integrate with these layers.

Key exports:
- makeSdkLayer: Create OTEL SDK layer from configuration
- Live/Test/Dev/Auto: Static layer presets
- withFiberTracking: Optional Supervisor layer for fiber tracking
- Presets: OtlpPreset, JaegerPreset, ConsolePreset, etc.`,
    module: `${scope}/infra-${fileName}`,
    see: ["https://effect.website/docs/observability/otel-tracing"]
  })

  builder.addSectionComment("OTEL Provider (Infrastructure)")

  builder.addRaw(`// OpenTelemetry SDK provider - the "Redis" equivalent for observability
// This is consumed internally by LoggingService and MetricsService
export {
  OtelProvider,
  type OtelProviderOperations,
} from "./lib/provider"
`)

  builder.addSectionComment("SDK Layer Factories (Advanced)")

  builder.addRaw(`// Advanced: Direct OTEL SDK layer factories for custom setups
// Most users should use LoggingService.Live and MetricsService.Live instead
export {
  makeSdkLayer,
  Live as SdkLive,
  Test as SdkTest,
  Dev as SdkDev,
  Auto as SdkAuto,
} from "./lib/sdk"
`)

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
