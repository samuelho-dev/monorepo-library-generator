import { Schema } from "effect"

/**
 * Observability Configuration
 *
 * Effect Schema-based configuration for OpenTelemetry observability.

Provides:
- ObservabilityConfigSchema: Validated configuration schema
- ObservabilityConfig: Inferred TypeScript type
- Environment variable mapping for OTEL configuration

Standard OTEL environment variables:
- OTEL_SERVICE_NAME
- OTEL_SERVICE_VERSION
- OTEL_EXPORTER_OTLP_ENDPOINT
- OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
- OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
- OTEL_TRACES_SAMPLER_ARG
- OTEL_METRICS_EXPORT_INTERVAL_MS
 *
 * @module @samuelho-dev/infra-observability/config
 */
// ============================================================================
// Traces Configuration
// ============================================================================
/**
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

// ============================================================================
// Metrics Configuration
// ============================================================================
/**
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

// ============================================================================
// Logs Configuration
// ============================================================================
/**
 * Logs configuration schema
 */
export const LogsConfigSchema = Schema.Struct({
  /**
   * Enable logs export to OTEL
   * @default true
   */
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),

  /**
   * OTLP logs endpoint
   * @default "http://localhost:4318/v1/logs"
   */
  endpoint: Schema.optionalWith(Schema.String, {
    default: () => "http://localhost:4318/v1/logs"
  }),

  /**
   * Minimum log level to export
   * @default "info"
   */
  minLevel: Schema.optionalWith(
    Schema.Literal("trace", "debug", "info", "warning", "error", "fatal"),
    { default: () => "info" as const }
  )
})

export type LogsConfig = typeof LogsConfigSchema.Type

// ============================================================================
// Full Observability Configuration
// ============================================================================
/**
 * Complete observability configuration schema
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 *
 * const config = Schema.decodeSync(ObservabilityConfigSchema)({
 *   serviceName: "my-api",
 *   serviceVersion: "1.0.0",
 *   environment: "production",
 *   traces: { enabled: true, samplingRatio: 0.1 },
 *   metrics: { exportIntervalMs: 30000 },
 * })
 * ```
 */
export const ObservabilityConfigSchema = Schema.Struct({
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
   * Deployment environment
   * @default "development"
   */
  environment: Schema.optionalWith(
    Schema.Literal("production", "staging", "development", "test"),
    { default: () => "development" as const }
  ),

  /**
   * Tracing configuration
   */
  traces: Schema.optionalWith(TracesConfigSchema, {
    default: () => ({})
  }),

  /**
   * Metrics configuration
   */
  metrics: Schema.optionalWith(MetricsConfigSchema, {
    default: () => ({})
  }),

  /**
   * Logs configuration
   */
  logs: Schema.optionalWith(LogsConfigSchema, {
    default: () => ({})
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
 * Observability configuration type
 */
export type ObservabilityConfig = typeof ObservabilityConfigSchema.Type

// ============================================================================
// Default Configurations
// ============================================================================
/**
 * Minimal production configuration
 *
 * - Traces enabled with 10% sampling (reduces volume)
 * - Metrics enabled with 1-minute export interval
 * - Logs at info level and above
 */
export const ProductionConfig: Partial<ObservabilityConfig> = {
  environment: "production",
  traces: {
    enabled: true,
    samplingRatio: 0.1, // Sample 10% of traces
  },
  metrics: {
    enabled: true,
    exportIntervalMs: 60000, // 1 minute
  },
  logs: {
    enabled: true,
    minLevel: "info"
  },
}

/**
 * Development configuration
 *
 * - Full tracing (100% sampling)
 * - Fast metrics export (10 seconds)
 * - Debug logging
 */
export const DevelopmentConfig: Partial<ObservabilityConfig> = {
  environment: "development",
  traces: {
    enabled: true,
    samplingRatio: 1.0, // Sample all traces
  },
  metrics: {
    enabled: true,
    exportIntervalMs: 10000, // 10 seconds
  },
  logs: {
    enabled: true,
    minLevel: "debug"
  },
}

/**
 * Test configuration
 *
 * - All exports disabled (no network calls)
 */
export const TestConfig: Partial<ObservabilityConfig> = {
  environment: "test",
  traces: { enabled: false },
  metrics: { enabled: false },
  logs: { enabled: false },
}
