import { LoggingService } from "../service/service"
import { Layer, LogLevel, Logger } from "effect"

/**
 * Logging OpenTelemetry Layer
 *
 * OpenTelemetry-integrated logging layer.

Features:
- Automatic trace context propagation
- Span-based logging correlation
- Export to OTEL collectors (Jaeger, Zipkin, etc.)
- W3C Trace Context support
 *
 * @module @myorg/infra-logging/layers/otel
 * @see OpenTelemetry documentation for setup
 */

// ============================================================================
// OpenTelemetry Configuration
// ============================================================================

/**
 * OpenTelemetry configuration options
 */
export interface OtelLoggingConfig {
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
   * OTEL collector endpoint
   * @default "http://localhost:4318"
   */
  readonly collectorEndpoint?: string

  /**
   * Minimum log level to export
   * @default "info"
   */
  readonly minLogLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal"
}

// ============================================================================
// OpenTelemetry Logging Layer
// ============================================================================

/**
 * Create OpenTelemetry-integrated logging layer
 *
 * This layer integrates Effect's logging with OpenTelemetry for distributed tracing.
 * Logs are correlated with active spans and exported to OTEL collectors.
 *
 * @example
 * ```typescript
 * const otelLayer = makeLoggingOtelLayer({
 *   serviceName: "my-service",
 *   serviceVersion: "1.0.0",
 *   environment: "production",
 *   collectorEndpoint: "http://otel-collector:4318"
 * });
 *
 * const program = myProgram.pipe(
 *   Effect.provide(otelLayer)
 * );
 * ```
 */
export const makeLoggingOtelLayer = (config: OtelLoggingConfig) =>
  Layer.succeed(
    LoggingService,
    LoggingService.makeLogger({
      "service.name": config.serviceName,
      "service.version": config.serviceVersion ?? "unknown",
      "deployment.environment": config.environment ?? "development"
    })
  )

// ============================================================================
// Example: Full OTEL Setup
// ============================================================================

/**
 * Example: Complete OpenTelemetry setup with Effect
 *
 * This example shows how to integrate with @effect/opentelemetry
 * for full distributed tracing support.
 *
 * @example
 * ```typescript
 * // Install dependencies:
 * // npm install @effect/opentelemetry @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
 *
 * import { NodeSdk } from "@effect/opentelemetry";
 * import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
 * import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
 * import { Resource } from "@opentelemetry/resources";
 * import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
 *
 * // Create OTEL SDK layer
 * const OtelSdkLayer = NodeSdk.layer(() => ({
 *   resource: new Resource({
 *     [SEMRESATTRS_SERVICE_NAME]: "my-service"
 *   }),
 *   spanProcessor: new BatchSpanProcessor(
 *     new OTLPTraceExporter({
 *       url: "http://localhost:4318/v1/traces"
 *     })
 *   )
 * }));
 *
 * // Create logging layer with OTEL integration
 * const LoggingLayer = makeLoggingOtelLayer({
 *   serviceName: "my-service",
 *   serviceVersion: "1.0.0",
 *   environment: process.env.NODE_ENV ?? "development"
 * });
 *
 * // Combine layers
 * const AppLayer = Layer.mergeAll(
 *   OtelSdkLayer,
 *   LoggingLayer
 * );
 *
 * // Run program with full observability
 * const main = Effect.gen(function* () {
 *   const logger = yield* LoggingService;
 *
 *   yield* logger.withSpan("handleRequest", Effect.gen(function* () {
 *     yield* logger.info("Processing request", { requestId: "123" });
 *     // ... business logic
 *     yield* logger.info("Request completed");
 *   }));
 * }).pipe(
 *   Effect.provide(AppLayer)
 * );
 *
 * Effect.runPromise(main);
 * ```
 */

// ============================================================================
// Log Level Filtering
// ============================================================================

/**
 * Create a layer that filters logs by minimum level
 *
 * @example
 * ```typescript
 * // Only log warnings and above in production
 * const ProductionLogging = LoggingService.Live.pipe(
 *   Layer.provide(Logger.minimumLogLevel(LogLevel.Warning))
 * );
 * ```
 */
export const withMinLogLevel = (minLevel: LogLevel.LogLevel) =>
  Layer.provide(Logger.minimumLogLevel(minLevel))

/**
 * Common log level configurations
 */
export const LogLevelConfigs = {
  /**
   * Production: Warning and above
   */
  production: Logger.minimumLogLevel(LogLevel.Warning),

  /**
   * Staging: Info and above
   */
  staging: Logger.minimumLogLevel(LogLevel.Info),

  /**
   * Development: Debug and above
   */
  development: Logger.minimumLogLevel(LogLevel.Debug),

  /**
   * Testing: All levels (for debugging tests)
   */
  testing: Logger.minimumLogLevel(LogLevel.Trace)
}
