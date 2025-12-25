import { NodeSdk } from "@effect/opentelemetry"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { env } from "@samuelho-dev/env"
import { Layer } from "effect"
import type { ObservabilityConfig } from "./config"

/**
 * Observability SDK Layers
 *
 * OpenTelemetry SDK layer factories for unified observability.

Provides:
- makeSdkLayer: Create OTEL SDK layer from configuration
- Live/Test/Dev/Auto: Static layer presets
- Unified setup for traces, metrics, and logs export

@effect/opentelemetry Integration:
- NodeSdk.layer() for server-side
- WebSdk.layer() for browser
- Automatic Effect.withSpan() integration
- Automatic Effect.Metric export
 *
 * @module @samuelho-dev/infra-observability/sdk
 * @see https://effect.website/docs/observability/otel-tracing
 */
// ============================================================================
// Environment Variable Helpers
// ============================================================================
/**
 * Read observability config from environment variables
 */
function getEnvConfig() {
  return {
    serviceName: env.OTEL_SERVICE_NAME ?? "unknown-service",
    serviceVersion: env.OTEL_SERVICE_VERSION ?? "0.0.0",
    environment: env.NODE_ENV ?? "development",
    traces: {
      enabled: env.OTEL_TRACES_ENABLED !== "false",
      endpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
      samplingRatio: env.OTEL_TRACES_SAMPLER_ARG ? Number.parseFloat(env.OTEL_TRACES_SAMPLER_ARG) : 1.0,
    },
    metrics: {
      enabled: env.OTEL_METRICS_ENABLED !== "false",
      endpoint: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/metrics",
      exportIntervalMs: env.OTEL_METRICS_EXPORT_INTERVAL_MS ? Number.parseInt(env.OTEL_METRICS_EXPORT_INTERVAL_MS, 10) : 60000,
    },
    resourceAttributes: {}
  }
}

// ============================================================================
// SDK Layer Factory
// ============================================================================
/**
 * Create OpenTelemetry SDK layer from configuration
 *
 * Provides unified setup for traces, metrics, and logs export.
 * Effect's built-in tracing (Effect.withSpan) and metrics (Effect.Metric)
 * automatically integrate with this SDK layer.
 *
 * @example
 * ```typescript
 * const AppLayer = Layer.mergeAll(
 *   makeSdkLayer({
 *     serviceName: "my-api",
 *     serviceVersion: "1.0.0",
 *     traces: { enabled: true, endpoint: "http://jaeger:4318/v1/traces" },
 *     metrics: { enabled: true, exportIntervalMs: 30000 },
 *   }),
 *   MyService.Live,
 * )
 *
 * Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
 * ```
 */
export function makeSdkLayer(config: ObservabilityConfig) {
  return NodeSdk.layer(() => ({
    resource: {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      ...config.resourceAttributes,
    },
    spanProcessor: config.traces?.enabled !== false
      ? new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: config.traces?.endpoint ?? "http://localhost:4318/v1/traces"
          })
        )
      : undefined,
    metricReader: config.metrics?.enabled !== false
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: config.metrics?.endpoint ?? "http://localhost:4318/v1/metrics"
          }),
          exportIntervalMillis: config.metrics?.exportIntervalMs ?? 60000,
        })
      : undefined
  }))
}

// ============================================================================
// Static Layer Presets
// ============================================================================
/**
 * Live Layer - Production OTEL SDK from environment variables
 *
 * Reads configuration from:
 * - OTEL_SERVICE_NAME: Service identifier
 * - OTEL_SERVICE_VERSION: Semantic version
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Base endpoint
 * - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Override for traces
 * - OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Override for metrics
 * - OTEL_TRACES_SAMPLER_ARG: Sampling ratio (0.0-1.0)
 * - OTEL_METRICS_EXPORT_INTERVAL_MS: Export interval
 */
export const Live = makeSdkLayer(getEnvConfig())

/**
 * Test Layer - No-op layer for testing
 *
 * Effect.withSpan and Effect.Metric work normally but data is not exported.
 * Use this layer to avoid network calls in unit tests.
 */
export const Test = Layer.empty

/**
 * Dev Layer - Local development with console output
 *
 * Creates minimal OTEL SDK for local development.
 * Traces and metrics are collected but may not export
 * depending on local OTEL collector availability.
 */
export const Dev = NodeSdk.layer(() => ({
  resource: {
    serviceName: env.OTEL_SERVICE_NAME ?? "dev-service",
    serviceVersion: "0.0.0-dev",
    environment: "development"
  },
  // In dev, OTEL SDK will attempt to export but gracefully handle failures
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: "http://localhost:4318/v1/traces",
    })
  )
}))

/**
 * Auto Layer - Environment-aware layer selection
 *
 * Selects appropriate layer based on NODE_ENV:
 * - "production" → Live (full OTEL from env vars)
 * - "development" → Dev (local OTEL)
 * - "test" → Test (no-op)
 * - default → Dev
 */
export const Auto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "production":
      return Live
    case "test":
      return Test
    default:
      // "development" and other environments use Dev
      return Dev
  }
})

// ============================================================================
// Usage Example
// ============================================================================
/**
 * Usage Example:
 *
 * ```typescript
 * import { Effect, Layer } from "effect";
 * import * as Observability from "@samuelho-dev/infra-observability";
 * import { UserService } from "@samuelho-dev/feature-user";
 *
 * // Basic usage - OTEL SDK only (Effect.withSpan automatically exports)
 * const AppLayer = Layer.mergeAll(
 *   Observability.Auto,         // OTEL SDK based on NODE_ENV
 *   UserService.Live,
 * )
 *
 * // With optional fiber tracking
 * const AppLayerWithFibers = Layer.mergeAll(
 *   Observability.Auto,
 *   Observability.FiberTrackingMinimal,  // Only track failures
 *   UserService.Live,
 * )
 *
 * // Effect.withSpan() calls automatically export to OTEL
 * const program = Effect.gen(function*() {
 *   const result = yield* someOperation.pipe(
 *     Effect.withSpan("MyOperation", { attributes: { key: "value" } })
 *   )
 *   return result;
 * })
 *
 * Effect.runPromise(program.pipe(Effect.provide(AppLayer)))
 * ```
 */
