/**
 * OtelProvider Service Template
 *
 * Generates the OpenTelemetry SDK provider service that logging and metrics consume.
 * This follows the same pattern as Redis for cache - the underlying infrastructure
 * that application-level services (LoggingService, MetricsService) consume.
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate OtelProvider service (the "Redis" equivalent for observability)
 */
export function generateOtelProviderFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} OTEL Provider`,
    description: `OpenTelemetry SDK provider service for observability infrastructure.

This is the "Redis" equivalent for observability - the underlying provider
that LoggingService and MetricsService consume.

Provides:
- SDK initialization with trace and metrics exporters
- Live/Test/Dev/Auto layer presets
- Graceful shutdown support
- Configuration from environment variables

Usage:
- LoggingService.Live internally provides OtelProvider.Live
- MetricsService.Live internally provides OtelProvider.Live
- For custom setup: Layer.provide(LoggingService.WithOtel, myCustomOtelProvider)`,
    module: `${scope}/infra-${fileName}/provider`,
    see: ["https://effect.website/docs/observability/otel-tracing"]
  })

  builder.addImports([
    {
      from: "effect",
      imports: ["Context", "Layer"]
    },
    { from: "@effect/opentelemetry", imports: ["NodeSdk"] },
    { from: "@opentelemetry/sdk-trace-node", imports: ["BatchSpanProcessor"] },
    { from: "@opentelemetry/exporter-trace-otlp-http", imports: ["OTLPTraceExporter"] },
    { from: "@opentelemetry/exporter-metrics-otlp-http", imports: ["OTLPMetricExporter"] },
    { from: "@opentelemetry/sdk-metrics", imports: ["PeriodicExportingMetricReader"] },
    { from: `${scope}/env`, imports: ["env"] }
  ])

  builder.addSectionComment("OtelProvider Interface")

  builder.addRaw(`/**
 * OtelProvider operations interface
 *
 * The underlying OTEL SDK that LoggingService and MetricsService consume.
 * Application code typically doesn't interact with this directly.
 */
export interface OtelProviderOperations {
  /**
   * Whether trace export is enabled
   */
  readonly tracesEnabled: boolean

  /**
   * Whether metrics export is enabled
   */
  readonly metricsEnabled: boolean

  /**
   * Service name configured for OTEL
   */
  readonly serviceName: string

  /**
   * Service version configured for OTEL
   */
  readonly serviceVersion: string
}

/**
 * OtelProvider Service
 *
 * OpenTelemetry SDK provider for observability infrastructure.
 * This is consumed by LoggingService and MetricsService internally.
 *
 * @example
 * \`\`\`typescript
 * // Usually you don't interact with OtelProvider directly.
 * // Instead use LoggingService.Live which internally provides OtelProvider.Live:
 *
 * import { LoggingService, MetricsService } from "${scope}/infra-${fileName}";
 *
 * const AppLayer = Layer.mergeAll(
 *   LoggingService.Live,  // Internally provides OtelProvider.Live
 *   MetricsService.Live,  // Shares the same OTEL SDK
 * );
 *
 * // For custom OTEL setup:
 * const customOtel = OtelProvider.make({
 *   serviceName: "my-service",
 *   tracesEndpoint: "http://custom-collector:4318/v1/traces"
 * });
 * const CustomAppLayer = Layer.mergeAll(
 *   Layer.provide(LoggingService.WithOtel, customOtel),
 *   Layer.provide(MetricsService.WithOtel, customOtel),
 * );
 * \`\`\`
 */
export class OtelProvider extends Context.Tag(
  "${scope}/infra-${fileName}/OtelProvider"
)<
  OtelProvider,
  OtelProviderOperations
>() {
  // ===========================================================================
  // Factory: Create Custom Provider
  // ===========================================================================

  /**
   * Create a custom OtelProvider layer from configuration
   *
   * @example
   * \`\`\`typescript
   * const customOtel = OtelProvider.make({
   *   serviceName: "my-api",
   *   serviceVersion: "1.0.0",
   *   tracesEndpoint: "http://jaeger:4318/v1/traces",
   *   metricsEndpoint: "http://prometheus:4318/v1/metrics",
   *   metricsExportIntervalMs: 30000
   * });
   * \`\`\`
   */
  static make(config: {
    readonly serviceName: string
    readonly serviceVersion?: string
    readonly tracesEnabled?: boolean
    readonly tracesEndpoint?: string
    readonly metricsEnabled?: boolean
    readonly metricsEndpoint?: string
    readonly metricsExportIntervalMs?: number
  }) {
    const tracesEnabled = config.tracesEnabled !== false
    const metricsEnabled = config.metricsEnabled !== false
    const serviceVersion = config.serviceVersion ?? "0.0.0"

    // Create the OTEL SDK layer
    const sdkLayer = NodeSdk.layer(() => ({
      resource: {
        serviceName: config.serviceName,
        serviceVersion,
      },
      spanProcessor: tracesEnabled
        ? new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: config.tracesEndpoint ?? "http://localhost:4318/v1/traces",
            })
          )
        : undefined,
      metricReader: metricsEnabled
        ? new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
              url: config.metricsEndpoint ?? "http://localhost:4318/v1/metrics",
            }),
            exportIntervalMillis: config.metricsExportIntervalMs ?? 60000,
          })
        : undefined,
    }))

    // Create the OtelProvider service layer that depends on SDK initialization
    const providerLayer = Layer.succeed(OtelProvider, {
      tracesEnabled,
      metricsEnabled,
      serviceName: config.serviceName,
      serviceVersion,
    })

    // Merge: first initialize SDK, then provide the service
    return Layer.merge(sdkLayer, providerLayer)
  }

  // ===========================================================================
  // Static Live Layer (Production OTEL from env vars)
  // ===========================================================================

  /**
   * Live Layer - Production OTEL SDK from environment variables
   *
   * Reads configuration from:
   * - OTEL_SERVICE_NAME: Service identifier (required)
   * - OTEL_SERVICE_VERSION: Semantic version
   * - OTEL_EXPORTER_OTLP_ENDPOINT: Base endpoint
   * - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Override for traces
   * - OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Override for metrics
   * - OTEL_TRACES_ENABLED: Enable/disable traces (default: true)
   * - OTEL_METRICS_ENABLED: Enable/disable metrics (default: true)
   * - OTEL_METRICS_EXPORT_INTERVAL_MS: Export interval (default: 60000)
   */
  static readonly Live = OtelProvider.make({
    serviceName: env.OTEL_SERVICE_NAME ?? "unknown-service",
    serviceVersion: env.OTEL_SERVICE_VERSION ?? "0.0.0",
    tracesEnabled: env.OTEL_TRACES_ENABLED !== "false",
    tracesEndpoint:
      env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      env.OTEL_EXPORTER_OTLP_ENDPOINT ??
      "http://localhost:4318/v1/traces",
    metricsEnabled: env.OTEL_METRICS_ENABLED !== "false",
    metricsEndpoint:
      env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
      env.OTEL_EXPORTER_OTLP_ENDPOINT ??
      "http://localhost:4318/v1/metrics",
    metricsExportIntervalMs: env.OTEL_METRICS_EXPORT_INTERVAL_MS
      ? Number.parseInt(env.OTEL_METRICS_EXPORT_INTERVAL_MS, 10)
      : 60000,
  })

  // ===========================================================================
  // Static Test Layer (No-op)
  // ===========================================================================

  /**
   * Test Layer - No-op OTEL provider
   *
   * Provides the service tag but without actual SDK initialization.
   * Effect.withSpan and Effect.Metric still work but data is not exported.
   */
  static readonly Test = Layer.succeed(OtelProvider, {
    tracesEnabled: false,
    metricsEnabled: false,
    serviceName: "test-service",
    serviceVersion: "0.0.0-test",
  })

  // ===========================================================================
  // Static Dev Layer (Local OTEL)
  // ===========================================================================

  /**
   * Dev Layer - Local OTEL for development
   *
   * Attempts to connect to localhost:4318 but won't fail if collector
   * is unavailable. Useful for local development with optional observability.
   */
  static readonly Dev = OtelProvider.make({
    serviceName: env.OTEL_SERVICE_NAME ?? "dev-service",
    serviceVersion: "0.0.0-dev",
    tracesEnabled: true,
    tracesEndpoint: "http://localhost:4318/v1/traces",
    metricsEnabled: true,
    metricsEndpoint: "http://localhost:4318/v1/metrics",
    metricsExportIntervalMs: 30000, // Faster export in dev
  })

  // ===========================================================================
  // Auto Layer
  // ===========================================================================

  /**
   * Auto Layer - Environment-aware provider selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "production" → Live (full OTEL from env vars)
   * - "test" → Test (no-op)
   * - "development" → Dev (local OTEL)
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return OtelProvider.Live
      case "test":
        return OtelProvider.Test
      default:
        // "development" and other environments use Dev
        return OtelProvider.Dev
    }
  })
}
`)

  return builder.toString()
}
