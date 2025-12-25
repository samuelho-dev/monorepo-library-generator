import { Data } from "effect"

/**
 * Observability Errors
 *
 * Data.TaggedError-based error types for observability operations.

Uses Data.TaggedError for internal infrastructure errors (not serializable).
Schema.TaggedError is reserved for RPC boundary errors only.

Error types:
- ObservabilityConfigError: Invalid configuration
- ObservabilityExportError: Failed to export telemetry
- ObservabilityConnectionError: Cannot connect to OTEL collector
- ObservabilityInitError: SDK initialization failed
 *
 * @module @samuelho-dev/infra-observability/errors
 */
// ============================================================================
// Base Error
// ============================================================================
/**
 * Base error for all observability errors
 */
export class ObservabilityError extends Data.TaggedError(
  "ObservabilityError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Configuration Error
// ============================================================================
/**
 * Invalid observability configuration
 *
 * @example
 * ```typescript
 * new ObservabilityConfigError({
 *   message: "Invalid sampling ratio: must be between 0.0 and 1.0",
 *   field: "traces.samplingRatio",
 *   value: 2.5,
 * })
 * ```
 */
export class ObservabilityConfigError extends Data.TaggedError(
  "ObservabilityConfigError"
)<{
  readonly message: string
  readonly field?: string
  readonly value?: unknown
  readonly cause?: unknown
}> {}

// ============================================================================
// Export Error
// ============================================================================
/**
 * Failed to export telemetry data
 *
 * This error occurs when the OTEL exporter fails to send data
 * to the collector. Common causes:
 * - Network issues
 * - Collector unavailable
 * - Authentication failure
 * - Rate limiting
 *
 * @example
 * ```typescript
 * new ObservabilityExportError({
 *   message: "Failed to export traces to collector",
 *   exporterType: "traces",
 *   endpoint: "http://localhost:4318/v1/traces",
 *   statusCode: 503,
 * })
 * ```
 */
export class ObservabilityExportError extends Data.TaggedError(
  "ObservabilityExportError"
)<{
  readonly message: string
  readonly exporterType?: "traces" | "metrics" | "logs"
  readonly endpoint?: string
  readonly statusCode?: number
  readonly cause?: unknown
}> {}

// ============================================================================
// Connection Error
// ============================================================================
/**
 * Cannot connect to OTEL collector
 *
 * @example
 * ```typescript
 * new ObservabilityConnectionError({
 *   message: "Connection refused to OTEL collector",
 *   endpoint: "http://localhost:4318",
 *   retryCount: 3,
 * })
 * ```
 */
export class ObservabilityConnectionError extends Data.TaggedError(
  "ObservabilityConnectionError"
)<{
  readonly message: string
  readonly endpoint?: string
  readonly retryCount?: number
  readonly cause?: unknown
}> {}

// ============================================================================
// Initialization Error
// ============================================================================
/**
 * SDK initialization failed
 *
 * @example
 * ```typescript
 * new ObservabilityInitError({
 *   message: "Failed to initialize OTEL SDK",
 *   component: "BatchSpanProcessor",
 * })
 * ```
 */
export class ObservabilityInitError extends Data.TaggedError(
  "ObservabilityInitError"
)<{
  readonly message: string
  readonly component?: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Error Union
// ============================================================================
/**
 * Union of all observability error types
 */
export type ObservabilityErrorType =
  | ObservabilityError
  | ObservabilityConfigError
  | ObservabilityExportError
  | ObservabilityConnectionError
  | ObservabilityInitError
