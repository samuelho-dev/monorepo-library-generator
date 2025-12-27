/**
 * OpenTelemetry Service Template
 *
 * Generates the main OpenTelemetry provider service with Context.Tag and static layers.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

/**
 * Generate OpenTelemetry service file
 */
export function generateOtelServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: 'OpenTelemetry Provider Service',
    description: `OpenTelemetry SDK provider for Effect integration.

Provides:
- OpenTelemetryProvider: Context.Tag for OTEL SDK access
- Static layers: Live, Test, Dev, Auto
- Automatic Effect.withSpan() and Effect.Metric export

This provider is consumed by infra-observability's LoggingService and MetricsService.
When this layer is composed in the application, Effect's built-in tracing and
metrics automatically export to OpenTelemetry.`,
    module: `${options.packageName}/service`,
    see: ['https://effect.website/docs/observability/otel-tracing']
  })

  builder.addImports([
    { from: 'effect', imports: ['Context', 'Layer'] },
    { from: '@effect/opentelemetry', imports: ['NodeSdk'] },
    { from: '@opentelemetry/sdk-trace-node', imports: ['BatchSpanProcessor'] },
    { from: '@opentelemetry/exporter-trace-otlp-http', imports: ['OTLPTraceExporter'] },
    { from: '@opentelemetry/exporter-metrics-otlp-http', imports: ['OTLPMetricExporter'] },
    { from: '@opentelemetry/sdk-metrics', imports: ['PeriodicExportingMetricReader'] },
    { from: `${scope}/env`, imports: ['env'] },
    { from: './types', imports: ['OpenTelemetryConfig'], isTypeOnly: true }
  ])

  builder.addSectionComment('Service Interface')

  builder.addRaw(`/**
 * OpenTelemetry provider operations interface
 *
 * Exposes SDK state for service composition.
 * Application code typically doesn't interact with this directly.
 */
export interface OpenTelemetryProviderOperations {
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
`)

  builder.addSectionComment('Context.Tag')

  builder.addRaw(`/**
 * OpenTelemetry Provider Service
 *
 * Provides the OTEL SDK layer for Effect integration.
 * When this layer is composed in the application, Effect.withSpan()
 * and Effect.Metric automatically export to OpenTelemetry.
 *
 * @example
 * \`\`\`typescript
 * import { OpenTelemetryProvider } from "${options.packageName}";
 * import { LoggingService, MetricsService } from "${scope}/infra-observability";
 *
 * // Application layer composition
 * const AppLayer = Layer.mergeAll(
 *   OpenTelemetryProvider.Live,  // OTEL SDK
 *   LoggingService.Live,          // Logging with OTEL export
 *   MetricsService.Live,          // Metrics with OTEL export
 * )
 *
 * // For custom configuration:
 * const CustomAppLayer = Layer.mergeAll(
 *   OpenTelemetryProvider.make({
 *     serviceName: "my-api",
 *     serviceVersion: "1.0.0",
 *     traces: { endpoint: "http://jaeger:4318/v1/traces" },
 *   }),
 *   LoggingService.WithProvider,
 *   MetricsService.WithProvider,
 * )
 * \`\`\`
 */
export class OpenTelemetryProvider extends Context.Tag(
  "${options.packageName}/OpenTelemetryProvider"
)<
  OpenTelemetryProvider,
  OpenTelemetryProviderOperations
>() {
  // ===========================================================================
  // Factory: Create Custom Provider
  // ===========================================================================

  /**
   * Create a custom OpenTelemetryProvider layer from configuration
   *
   * @example
   * \`\`\`typescript
   * const customOtel = OpenTelemetryProvider.make({
   *   serviceName: "my-api",
   *   serviceVersion: "1.0.0",
   *   traces: {
   *     endpoint: "http://jaeger:4318/v1/traces",
   *     samplingRatio: 0.1,
   *   },
   *   metrics: {
   *     endpoint: "http://prometheus:4318/v1/metrics",
   *     exportIntervalMs: 30000,
   *   },
   * })
   * \`\`\`
   */
  static make(config: OpenTelemetryConfig) {
    const tracesEnabled = config.traces?.enabled !== false
    const metricsEnabled = config.metrics?.enabled !== false
    const serviceVersion = config.serviceVersion ?? "0.0.0"

    // Create the OTEL SDK layer
    const sdkLayer = NodeSdk.layer(() => ({
      resource: {
        serviceName: config.serviceName,
        serviceVersion,
        ...config.resourceAttributes,
      },
      spanProcessor: tracesEnabled
        ? new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: config.traces?.endpoint ?? "http://localhost:4318/v1/traces",
            })
          )
        : undefined,
      metricReader: metricsEnabled
        ? new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
              url: config.metrics?.endpoint ?? "http://localhost:4318/v1/metrics"
            }),
            exportIntervalMillis: config.metrics?.exportIntervalMs ?? 60000
          })
        : undefined,
    }))

    // Create the OpenTelemetryProvider service layer
    const providerLayer = Layer.succeed(OpenTelemetryProvider, {
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
  static readonly Live = OpenTelemetryProvider.make({
    serviceName: env.OTEL_SERVICE_NAME ?? "unknown-service",
    serviceVersion: env.OTEL_SERVICE_VERSION ?? "0.0.0",
    traces: {
      enabled: env.OTEL_TRACES_ENABLED !== "false",
      endpoint:
        env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        "http://localhost:4318/v1/traces",
      samplingRatio: env.OTEL_TRACES_SAMPLER_ARG
        ? Number.parseFloat(env.OTEL_TRACES_SAMPLER_ARG)
        : 1.0,
    },
    metrics: {
      enabled: env.OTEL_METRICS_ENABLED !== "false",
      endpoint:
        env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
        env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        "http://localhost:4318/v1/metrics",
      exportIntervalMs: env.OTEL_METRICS_EXPORT_INTERVAL_MS
        ? Number.parseInt(env.OTEL_METRICS_EXPORT_INTERVAL_MS, 10)
        : 60000,
    },
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
  static readonly Test = Layer.succeed(OpenTelemetryProvider, {
    tracesEnabled: false,
    metricsEnabled: false,
    serviceName: "test-service",
    serviceVersion: "0.0.0-test"
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
  static readonly Dev = OpenTelemetryProvider.make({
    serviceName: env.OTEL_SERVICE_NAME ?? "dev-service",
    serviceVersion: "0.0.0-dev",
    traces: {
      enabled: true,
      endpoint: "http://localhost:4318/v1/traces",
      samplingRatio: 1.0,
    },
    metrics: {
      enabled: true,
      endpoint: "http://localhost:4318/v1/metrics",
      exportIntervalMs: 30000, // Faster export in dev
    },
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
        return OpenTelemetryProvider.Live
      case "test":
        return OpenTelemetryProvider.Test
      default:
        // "development" and other environments use Dev
        return OpenTelemetryProvider.Dev
    }
  })
}
`)

  builder.addSectionComment('Export Alias')

  builder.addRaw(`/**
 * OpenTelemetry alias (shorthand for OpenTelemetryProvider)
 */
export { OpenTelemetryProvider as OpenTelemetry }
`)

  return builder.toString()
}
