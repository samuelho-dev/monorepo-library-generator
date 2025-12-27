/**
 * OpenTelemetry Types Template
 *
 * Generates type definitions for OpenTelemetry provider configuration.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate OpenTelemetry types file
 */
export function generateOtelTypesFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "OpenTelemetry Provider Types",
    description: `Type definitions for OpenTelemetry SDK configuration.

Provides:
- OpenTelemetryConfig: Full configuration schema
- TracesConfig: Tracing configuration
- MetricsConfig: Metrics configuration
- ResourceAttributes: OTEL resource attributes`,
    module: `${options.packageName}/types`
  })

  builder.addImports([{ from: "effect", imports: ["Schema"] }])

  builder.addSectionComment("Traces Configuration")

  builder.addRaw(`/**
 * Tracing configuration schema
 */
export const TracesConfigSchema = Schema.Struct({
  /**
   * Enable tracing export
   * @default true
   */
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),

  /**
   * OTLP traces endpoint
   * @default "http://localhost:4318/v1/traces"
   */
  endpoint: Schema.optionalWith(Schema.String, {
    default: () => "http://localhost:4318/v1/traces"
  }),

  /**
   * Sampling ratio (0.0 to 1.0)
   * 1.0 = sample all traces
   * 0.1 = sample 10% of traces
   * @default 1.0
   */
  samplingRatio: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.filter((n) => n >= 0 && n <= 1, {
        message: () => "Sampling ratio must be between 0.0 and 1.0"
      })
    ),
    { default: () => 1.0 }
  )
})

export type TracesConfig = typeof TracesConfigSchema.Type
`)

  builder.addSectionComment("Metrics Configuration")

  builder.addRaw(`/**
 * Metrics configuration schema
 */
export const MetricsConfigSchema = Schema.Struct({
  /**
   * Enable metrics export
   * @default true
   */
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),

  /**
   * OTLP metrics endpoint
   * @default "http://localhost:4318/v1/metrics"
   */
  endpoint: Schema.optionalWith(Schema.String, {
    default: () => "http://localhost:4318/v1/metrics"
  }),

  /**
   * Export interval in milliseconds
   * @default 60000 (1 minute)
   */
  exportIntervalMs: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.filter((n) => n >= 1000, {
        message: () => "Export interval must be at least 1000ms"
      })
    ),
    { default: () => 60000 }
  )
})

export type MetricsConfig = typeof MetricsConfigSchema.Type
`)

  builder.addSectionComment("Full Configuration")

  builder.addRaw(`/**
 * Complete OpenTelemetry configuration schema
 */
export const OpenTelemetryConfigSchema = Schema.Struct({
  /**
   * Service name for OTEL resource
   * Maps to OTEL_SERVICE_NAME
   */
  serviceName: Schema.String,

  /**
   * Service version (semantic versioning recommended)
   * Maps to OTEL_SERVICE_VERSION
   * @default "0.0.0"
   */
  serviceVersion: Schema.optionalWith(Schema.String, {
    default: () => "0.0.0"
  }),

  /**
   * Tracing configuration
   */
  traces: Schema.optionalWith(TracesConfigSchema, {
    default: () => ({
      enabled: true,
      endpoint: "http://localhost:4318/v1/traces",
      samplingRatio: 1.0
    })
  }),

  /**
   * Metrics configuration
   */
  metrics: Schema.optionalWith(MetricsConfigSchema, {
    default: () => ({
      enabled: true,
      endpoint: "http://localhost:4318/v1/metrics",
      exportIntervalMs: 60000
    })
  }),

  /**
   * Additional resource attributes for OTEL
   * @example { "deployment.region": "us-east-1", "k8s.pod.name": "api-abc123" }
   */
  resourceAttributes: Schema.optionalWith(
    Schema.Record({ key: Schema.String, value: Schema.String }),
    { default: () => ({}) }
  )
})

/**
 * OpenTelemetry configuration type
 * Uses Encoded type so optional fields can be omitted when calling make()
 */
export type OpenTelemetryConfig = Schema.Schema.Encoded<typeof OpenTelemetryConfigSchema>
`)

  return builder.toString()
}
