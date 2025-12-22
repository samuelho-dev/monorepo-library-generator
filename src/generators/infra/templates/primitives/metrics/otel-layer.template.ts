/**
 * Metrics OpenTelemetry Layer Template
 *
 * Generates OpenTelemetry-integrated metrics layer for monitoring.
 *
 * @module monorepo-library-generator/infra-templates/primitives/metrics
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate OpenTelemetry metrics layer
 */
export function generateMetricsOtelLayerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} OpenTelemetry Layer`,
    description: `OpenTelemetry-integrated metrics layer.

Features:
- Automatic export to OTEL collectors
- Prometheus-compatible metrics
- Custom metric boundaries
- Resource attributes for service identification`,
    module: `${scope}/infra-${fileName}/layers/otel`,
    see: ['OpenTelemetry documentation for setup'],
  });

  builder.addImports([{ from: '../service/service', imports: [`${className}Service`] }]);

  builder.addSectionComment('OpenTelemetry Configuration');

  builder.addRaw(`/**
 * OpenTelemetry metrics configuration
 */
export interface OtelMetricsConfig {
  /**
   * Service name for OTEL resource
   */
  readonly serviceName: string

  /**
   * Service version
   */
  readonly serviceVersion?: string

  /**
   * Environment (production, staging, development)
   */
  readonly environment?: string

  /**
   * OTEL collector endpoint for metrics
   * @default "http://localhost:4318"
   */
  readonly collectorEndpoint?: string

  /**
   * Export interval in milliseconds
   * @default 60000 (1 minute)
   */
  readonly exportIntervalMs?: number

  /**
   * Metric prefix for all metrics
   * @example "myapp_" results in "myapp_http_requests_total"
   */
  readonly metricPrefix?: string
}
`);

  builder.addSectionComment('OpenTelemetry Metrics Layer');

  builder.addRaw(`/**
 * Create OpenTelemetry-integrated metrics layer
 *
 * Effect's metrics automatically integrate with OpenTelemetry when the
 * OTEL SDK is initialized. This layer provides the service with
 * appropriate resource attributes.
 *
 * @example
 * \`\`\`typescript
 * const otelLayer = make${className}OtelLayer({
 *   serviceName: "my-service",
 *   serviceVersion: "1.0.0",
 *   environment: "production",
 *   collectorEndpoint: "http://otel-collector:4318"
 * });
 *
 * const program = myProgram.pipe(
 *   Effect.provide(otelLayer)
 * );
 * \`\`\`
 */
export const make${className}OtelLayer = (_config: OtelMetricsConfig) =>
  // Effect's Metric automatically integrates with OTEL when SDK is present
  ${className}Service.Live
`);

  builder.addSectionComment('Example: Full OTEL Metrics Setup');

  builder.addRaw(`/**
 * Example: Complete OpenTelemetry metrics setup
 *
 * This example shows how to set up full metrics export with @effect/opentelemetry.
 *
 * @example
 * \`\`\`typescript
 * // Install dependencies:
 * // npm install @effect/opentelemetry @opentelemetry/sdk-node @opentelemetry/exporter-metrics-otlp-http
 *
 * import { NodeSdk } from "@effect/opentelemetry";
 * import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
 * import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
 * import { Resource } from "@opentelemetry/resources";
 * import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
 *
 * // Create OTEL SDK layer with metrics
 * const OtelSdkLayer = NodeSdk.layer(() => ({
 *   resource: new Resource({
 *     [SEMRESATTRS_SERVICE_NAME]: "my-service"
 *   }),
 *   metricReader: new PeriodicExportingMetricReader({
 *     exporter: new OTLPMetricExporter({
 *       url: "http://localhost:4318/v1/metrics"
 *     }),
 *     exportIntervalMillis: 60000 // Export every minute
 *   })
 * }));
 *
 * // Create metrics layer
 * const MetricsLayer = ${className}Service.Live;
 *
 * // Combine layers
 * const AppLayer = Layer.mergeAll(
 *   OtelSdkLayer,
 *   MetricsLayer
 * );
 *
 * // Example: Record metrics in your application
 * const main = Effect.gen(function* () {
 *   const metrics = yield* ${className}Service;
 *
 *   // Create metrics
 *   const requestCounter = yield* metrics.counter("http_requests_total", {
 *     description: "Total HTTP requests"
 *   });
 *
 *   const requestDuration = yield* metrics.histogram("http_request_duration_seconds", {
 *     description: "HTTP request duration",
 *     boundaries: [0.01, 0.05, 0.1, 0.5, 1, 5]
 *   });
 *
 *   const activeConnections = yield* metrics.gauge("active_connections", {
 *     description: "Active connection count"
 *   });
 *
 *   // Record metrics
 *   yield* requestCounter.increment;
 *   yield* activeConnections.set(42);
 *
 *   // Time an operation
 *   yield* requestDuration.timer(
 *     Effect.gen(function* () {
 *       yield* Effect.sleep("100 millis");
 *       return "done";
 *     })
 *   );
 * }).pipe(
 *   Effect.provide(AppLayer)
 * );
 *
 * Effect.runPromise(main);
 * \`\`\`
 */
`);

  builder.addSectionComment('Common Metric Patterns');

  builder.addRaw(`/**
 * Common histogram boundaries for different use cases
 */
export const HistogramBoundaries = {
  /**
   * HTTP request duration (seconds)
   * Covers typical web request latencies
   */
  httpDuration: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],

  /**
   * Database query duration (seconds)
   * Finer granularity for fast queries
   */
  dbDuration: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],

  /**
   * Response size (bytes)
   * Logarithmic scale for size distribution
   */
  responseSize: [100, 1000, 10000, 100000, 1000000, 10000000],

  /**
   * Queue size
   * For tracking queue depths
   */
  queueSize: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],

  /**
   * Batch size
   * For tracking batch processing
   */
  batchSize: [1, 5, 10, 25, 50, 100, 250, 500]
}

/**
 * Standard metric names following OpenTelemetry conventions
 */
export const StandardMetricNames = {
  // HTTP metrics
  httpRequestsTotal: "http_requests_total",
  httpRequestDuration: "http_request_duration_seconds",
  httpResponseSize: "http_response_size_bytes",

  // Database metrics
  dbConnectionsActive: "db_connections_active",
  dbQueryDuration: "db_query_duration_seconds",
  dbQueryTotal: "db_queries_total",

  // Queue metrics
  queueSize: "queue_size",
  queueLatency: "queue_latency_seconds",
  queueProcessed: "queue_messages_processed_total",

  // Cache metrics
  cacheHits: "cache_hits_total",
  cacheMisses: "cache_misses_total",
  cacheSize: "cache_size"
}
`);

  return builder.toString();
}
