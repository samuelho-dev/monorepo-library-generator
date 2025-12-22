/**
 * Logging OpenTelemetry Layer Template
 *
 * Generates OpenTelemetry-integrated logging layer for distributed tracing.
 *
 * @module monorepo-library-generator/infra-templates/primitives/logging
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate OpenTelemetry logging layer
 */
export function generateLoggingOtelLayerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} OpenTelemetry Layer`,
    description: `OpenTelemetry-integrated logging layer.

Features:
- Automatic trace context propagation
- Span-based logging correlation
- Export to OTEL collectors (Jaeger, Zipkin, etc.)
- W3C Trace Context support`,
    module: `${scope}/infra-${fileName}/layers/otel`,
    see: ['OpenTelemetry documentation for setup'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Layer', 'Logger', 'LogLevel'],
    },
    { from: '../service/service', imports: [`${className}Service`] },
  ]);

  builder.addSectionComment('OpenTelemetry Configuration');

  builder.addRaw(`/**
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
`);

  builder.addSectionComment('OpenTelemetry Logging Layer');

  builder.addRaw(`/**
 * Create OpenTelemetry-integrated logging layer
 *
 * This layer integrates Effect's logging with OpenTelemetry for distributed tracing.
 * Logs are correlated with active spans and exported to OTEL collectors.
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
export const make${className}OtelLayer = (config: OtelLoggingConfig) =>
  Layer.succeed(
    ${className}Service,
    ${className}Service.makeLogger({
      "service.name": config.serviceName,
      "service.version": config.serviceVersion ?? "unknown",
      "deployment.environment": config.environment ?? "development"
    })
  )
`);

  builder.addSectionComment('Example: Full OTEL Setup');

  builder.addRaw(`/**
 * Example: Complete OpenTelemetry setup with Effect
 *
 * This example shows how to integrate with @effect/opentelemetry
 * for full distributed tracing support.
 *
 * @example
 * \`\`\`typescript
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
 * const LoggingLayer = make${className}OtelLayer({
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
 *   const logger = yield* ${className}Service;
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
 * \`\`\`
 */
`);

  builder.addSectionComment('Log Level Filtering');

  builder.addRaw(`/**
 * Create a layer that filters logs by minimum level
 *
 * @example
 * \`\`\`typescript
 * // Only log warnings and above in production
 * const ProductionLogging = ${className}Service.Live.pipe(
 *   Layer.provide(Logger.minimumLogLevel(LogLevel.Warning))
 * );
 * \`\`\`
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
`);

  return builder.toString();
}
