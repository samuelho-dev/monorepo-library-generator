import { LogLevel, Logger } from "effect"

/**
 * Observability Constants
 *
 * Common constants for metrics and logging configuration.

Includes:
- HistogramBoundaries: Pre-configured bucket boundaries for common use cases
- StandardMetricNames: OpenTelemetry-compliant metric names
- LogLevelConfigs: Pre-configured log level layers
 *
 * @module @samuelho-dev/infra-observability/constants
 */

// ============================================================================
// Histogram Boundaries
// ============================================================================

/**
 * Common histogram boundaries for different use cases
 *
 * Use these with Effect.Metric.histogram() for consistent bucket definitions
 * across your application.
 *
 * @example
 * ```typescript
 * import { Metric } from "effect";
 * import { HistogramBoundaries } from "@samuelho-dev/infra-observability";
 *
 * const requestDuration = Metric.histogram(
 *   "http_request_duration_seconds",
 *   { boundaries: HistogramBoundaries.httpDuration }
 * );
 * ```
 */
export const HistogramBoundaries = {
  /**
   * HTTP request duration (seconds)
   * Covers typical web request latencies from 5ms to 10s
   */
  httpDuration: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const,

  /**
   * Database query duration (seconds)
   * Finer granularity for fast queries from 1ms to 1s
   */
  dbDuration: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1] as const,

  /**
   * Response size (bytes)
   * Logarithmic scale from 100B to 10MB
   */
  responseSize: [100, 1000, 10000, 100000, 1000000, 10000000] as const,

  /**
   * Queue size
   * For tracking queue depths from 0 to 1000
   */
  queueSize: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000] as const,

  /**
   * Batch size
   * For tracking batch processing from 1 to 500
   */
  batchSize: [1, 5, 10, 25, 50, 100, 250, 500] as const,

  /**
   * Cache operation duration (seconds)
   * Very fast operations from 100μs to 100ms
   */
  cacheDuration: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1] as const,
} as const

// ============================================================================
// Standard Metric Names
// ============================================================================

/**
 * Standard metric names following OpenTelemetry semantic conventions
 *
 * Using consistent naming helps with dashboards and alerting rules
 * that can be shared across services.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/general/metrics/
 *
 * @example
 * ```typescript
 * import { Metric } from "effect";
 * import { StandardMetricNames } from "@samuelho-dev/infra-observability";
 *
 * const counter = Metric.counter(StandardMetricNames.httpRequestsTotal);
 * ```
 */
export const StandardMetricNames = {
  // HTTP metrics
  httpRequestsTotal: "http_requests_total",
  httpRequestDuration: "http_request_duration_seconds",
  httpResponseSize: "http_response_size_bytes",
  httpActiveRequests: "http_active_requests",

  // Database metrics
  dbConnectionsActive: "db_connections_active",
  dbConnectionsIdle: "db_connections_idle",
  dbQueryDuration: "db_query_duration_seconds",
  dbQueryTotal: "db_queries_total",
  dbTransactionDuration: "db_transaction_duration_seconds",

  // Queue metrics
  queueSize: "queue_size",
  queueLatency: "queue_latency_seconds",
  queueProcessed: "queue_messages_processed_total",
  queueFailed: "queue_messages_failed_total",

  // Cache metrics
  cacheHits: "cache_hits_total",
  cacheMisses: "cache_misses_total",
  cacheSize: "cache_size",
  cacheEvictions: "cache_evictions_total",

  // Auth metrics
  authSuccessTotal: "auth_success_total",
  authFailureTotal: "auth_failure_total",
  authTokensIssued: "auth_tokens_issued_total",

  // Storage metrics
  storageOperationsTotal: "storage_operations_total",
  storageBytesTransferred: "storage_bytes_transferred_total",
} as const

// ============================================================================
// Log Level Configurations
// ============================================================================

/**
 * Pre-configured log level layers for different environments
 *
 * Use these with Layer.provide to filter logs by minimum level.
 *
 * @example
 * ```typescript
 * import { LogLevelConfigs } from "@samuelho-dev/infra-observability";
 *
 * const program = myEffect.pipe(
 *   Effect.provide(LogLevelConfigs.production)
 * );
 * ```
 */
export const LogLevelConfigs = {
  /**
   * Production: Warning and above
   * Minimizes log volume while capturing important issues
   */
  production: Logger.minimumLogLevel(LogLevel.Warning),

  /**
   * Staging: Info and above
   * More verbose for debugging staging issues
   */
  staging: Logger.minimumLogLevel(LogLevel.Info),

  /**
   * Development: Debug and above
   * Full debugging information for local development
   */
  development: Logger.minimumLogLevel(LogLevel.Debug),

  /**
   * Testing: All levels (Trace and above)
   * Maximum verbosity for debugging test failures
   */
  testing: Logger.minimumLogLevel(LogLevel.Trace),

  /**
   * Silent: No logs
   * Use for benchmarks or when logs are not needed
   */
  silent: Logger.minimumLogLevel(LogLevel.None),
} as const

/**
 * Create a layer that filters logs by minimum level
 *
 * @example
 * ```typescript
 * import { withMinLogLevel } from "@samuelho-dev/infra-observability";
 * import { LogLevel } from "effect";
 *
 * const program = myEffect.pipe(
 *   Effect.provide(withMinLogLevel(LogLevel.Info))
 * );
 * ```
 */
export const withMinLogLevel = (minLevel: LogLevel.LogLevel) =>
  Logger.minimumLogLevel(minLevel)

// ============================================================================
// Semantic Span Attribute Names
// ============================================================================

/**
 * Standard span attribute names following OpenTelemetry semantic conventions
 *
 * Use these when adding attributes to spans for consistent naming.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/
 *
 * @example
 * ```typescript
 * import { SpanAttributes } from "@samuelho-dev/infra-observability";
 *
 * const program = myEffect.pipe(
 *   Effect.withSpan("handleRequest", {
 *     attributes: {
 *       [SpanAttributes.httpMethod]: "GET",
 *       [SpanAttributes.httpRoute]: "/api/users",
 *     }
 *   })
 * );
 * ```
 */
export const SpanAttributes = {
  // HTTP
  httpMethod: "http.method",
  httpRoute: "http.route",
  httpStatusCode: "http.status_code",
  httpUrl: "http.url",

  // Database
  dbSystem: "db.system",
  dbName: "db.name",
  dbOperation: "db.operation",
  dbStatement: "db.statement",

  // Messaging/Queue
  messagingSystem: "messaging.system",
  messagingOperation: "messaging.operation",
  messagingDestination: "messaging.destination.name",

  // RPC
  rpcSystem: "rpc.system",
  rpcService: "rpc.service",
  rpcMethod: "rpc.method",

  // User/Session
  userId: "enduser.id",
  sessionId: "session.id",

  // Error
  errorType: "error.type",
  exceptionMessage: "exception.message",
  exceptionStacktrace: "exception.stacktrace",
} as const
