/**
 * @myorg/infra-logging
 *
 * Logging infrastructure service

Provides Logging functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-logging
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  type LogContext,
  type LoggingOperations,
  LoggingService,
} from "./lib/service/service";

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  LoggingConfigError,
  LoggingConnectionError,
  type LoggingError,
  LoggingInternalError,
  LoggingServiceError,
  LoggingTimeoutError,
} from "./lib/service/errors";

// ============================================================================
// Additional Layers
// ============================================================================

// OpenTelemetry integration
export {
  LogLevelConfigs,
  makeLoggingOtelLayer,
  type OtelLoggingConfig,
  withMinLogLevel,
} from "./lib/layers/otel-layer";
