import { NodeSdk } from "@effect/opentelemetry"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { Layer } from "effect"

/**
 * Observability Presets
 *
 * Pre-configured OTEL SDK layers for common deployment scenarios.

Available presets:
- OtlpPreset: Standard OTLP HTTP export (Jaeger, Grafana Tempo, etc.)
- JaegerPreset: Jaeger-specific configuration
- ConsolePreset: Console output for debugging
- NoopPreset: No-op for testing
- GrafanaCloudPreset: Grafana Cloud configuration

Each preset is ready to use with minimal configuration.
 *
 * @module @samuelho-dev/infra-observability/presets
 */
// ============================================================================
// OTLP HTTP Preset
// ============================================================================
/**
 * Configuration for OTLP preset
 */
export interface OtlpPresetConfig {
  /**
   * Service name for identification
   */
  readonly serviceName: string

  /**
   * Service version
   * @default "0.0.0"
   */
  readonly serviceVersion?: string

  /**
   * OTLP collector endpoint
   * @default "http://localhost:4318"
   */
  readonly endpoint?: string

  /**
   * Authorization header (for secured endpoints)
   * @example "Bearer xxx" or "Basic base64string"
   */
  readonly authorization?: string

  /**
   * Sampling ratio (0.0 to 1.0)
   * @default 1.0
   */
  readonly samplingRatio?: number

  /**
   * Metrics export interval in milliseconds
   * @default 60000
   */
  readonly metricsIntervalMs?: number
}

/**
 * OTLP HTTP Preset
 *
 * Standard OTLP over HTTP export. Works with:
 * - Jaeger (OTLP receiver)
 * - Grafana Tempo
 * - OpenTelemetry Collector
 * - Any OTLP-compatible backend
 *
 * @example
 * ```typescript
 * const AppLayer = Layer.mergeAll(
 *   OtlpPreset({
 *     serviceName: "my-api",
 *     endpoint: "http://otel-collector:4318",
 *   }),
 *   MyService.Live,
 * )
 * ```
 */
export const OtlpPreset = (config: OtlpPresetConfig) => {
  const baseUrl = config.endpoint ?? "http://localhost:4318"

  // Build exporter configs - only include headers if authorization is provided
  // This avoids exactOptionalPropertyTypes issues with undefined headers
  const traceExporterConfig = config.authorization
    ? { url: `${baseUrl}/v1/traces`, headers: { Authorization: config.authorization } }
    : { url: `${baseUrl}/v1/traces` }

  const metricExporterConfig = config.authorization
    ? { url: `${baseUrl}/v1/metrics`, headers: { Authorization: config.authorization } }
    : { url: `${baseUrl}/v1/metrics` }

  return NodeSdk.layer(() => ({
    resource: {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? "0.0.0",
    },
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter(traceExporterConfig)
    ),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(metricExporterConfig),
      exportIntervalMillis: config.metricsIntervalMs ?? 60000,
    })
  }))
}

// ============================================================================
// Jaeger Preset
// ============================================================================
/**
 * Configuration for Jaeger preset
 */
export interface JaegerPresetConfig {
  /**
   * Service name for identification
   */
  readonly serviceName: string

  /**
   * Service version
   * @default "0.0.0"
   */
  readonly serviceVersion?: string

  /**
   * Jaeger collector endpoint (OTLP)
   * @default "http://localhost:4318"
   */
  readonly endpoint?: string

  /**
   * Environment tag
   * @default "development"
   */
  readonly environment?: string
}

/**
 * Jaeger Preset
 *
 * Pre-configured for Jaeger with OTLP receiver.
 * Adds Jaeger-specific resource attributes.
 *
 * @example
 * ```typescript
 * const AppLayer = Layer.mergeAll(
 *   JaegerPreset({
 *     serviceName: "my-api",
 *     endpoint: "http://jaeger:4318",
 *     environment: "production",
 *   }),
 *   MyService.Live,
 * )
 * ```
 */
export const JaegerPreset = (config: JaegerPresetConfig) => {
  const baseUrl = config.endpoint ?? "http://localhost:4318"

  return NodeSdk.layer(() => ({
    resource: {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? "0.0.0",
      "deployment.environment": config.environment ?? "development",
    },
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${baseUrl}/v1/traces`,
      })
    ),
    // Jaeger focuses on traces, so metrics are optional
    // Use a separate metrics backend if needed
  }))
}

// ============================================================================
// Console Preset
// ============================================================================
/**
 * Configuration for Console preset
 */
export interface ConsolePresetConfig {
  /**
   * Service name for identification
   */
  readonly serviceName: string

  /**
   * Service version
   * @default "0.0.0-dev"
   */
  readonly serviceVersion?: string
}

/**
 * Console Preset
 *
 * Outputs traces and metrics to console.
 * Useful for local debugging without running a collector.
 *
 * @example
 * ```typescript
 * const DebugLayer = Layer.mergeAll(
 *   ConsolePreset({ serviceName: "my-api" }),
 *   MyService.Live,
 * )
 * ```
 */
export const ConsolePreset = (config: ConsolePresetConfig) =>
  NodeSdk.layer(() => ({
    resource: {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? "0.0.0-dev",
    },
    // Use SimpleSpanProcessor for immediate console output
    spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 10000, // Export every 10 seconds
    })
  }))

// ============================================================================
// Noop Preset
// ============================================================================
/**
 * Noop Preset
 *
 * No-op layer that doesn't export anything.
 * Effect.withSpan and Effect.Metric still work, but data is discarded.
 * Perfect for unit tests.
 *
 * @example
 * ```typescript
 * describe("MyService", () => {
 *   it("should work", () =>
 *     Effect.gen(function*() {
 *       const result = yield* myOperation;
 *       expect(result).toBe(expected)
 *     }).pipe(
 *       Effect.provide(Layer.mergeAll(NoopPreset, MyService.Test))
 *     )
 *   )
 * })
 * ```
 */
export const NoopPreset = Layer.empty

// ============================================================================
// Grafana Cloud Preset
// ============================================================================
/**
 * Configuration for Grafana Cloud preset
 */
export interface GrafanaCloudPresetConfig {
  /**
   * Service name for identification
   */
  readonly serviceName: string

  /**
   * Service version
   */
  readonly serviceVersion?: string

  /**
   * Grafana Cloud instance ID
   */
  readonly instanceId: string

  /**
   * Grafana Cloud API token
   */
  readonly apiToken: string

  /**
   * Region (e.g., "prod-us-central-0")
   */
  readonly region: string

  /**
   * Environment tag
   * @default "production"
   */
  readonly environment?: string
}

/**
 * Grafana Cloud Preset
 *
 * Pre-configured for Grafana Cloud's OTLP endpoint.
 * Requires Grafana Cloud credentials.
 *
 * @example
 * ```typescript
 * const AppLayer = Layer.mergeAll(
 *   GrafanaCloudPreset({
 *     serviceName: "my-api",
 *     instanceId: process.env.GRAFANA_INSTANCE_ID!,
 *     apiToken: process.env.GRAFANA_API_TOKEN!,
 *     region: "prod-us-central-0",
 *   }),
 *   MyService.Live,
 * )
 * ```
 */
export const GrafanaCloudPreset = (config: GrafanaCloudPresetConfig) => {
  const endpoint = `https://otlp-gateway-${config.region}.grafana.net/otlp`
  const authorization = `Basic ${Buffer.from(`${config.instanceId}:${config.apiToken}`).toString("base64")}`

  return NodeSdk.layer(() => ({
    resource: {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? "0.0.0",
      "deployment.environment": config.environment ?? "production",
    },
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
        headers: { Authorization: authorization },
      })
    ),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
        headers: { Authorization: authorization },
      }),
      exportIntervalMillis: 60000,
    })
  }))
}
