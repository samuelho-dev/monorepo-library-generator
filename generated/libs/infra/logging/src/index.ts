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
  LoggingService,
  type LogContext,
  type LoggingOperations
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  LoggingServiceError,
  LoggingInternalError,
  LoggingConfigError,
  LoggingConnectionError,
  LoggingTimeoutError,
  type LoggingError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// OpenTelemetry integration
export {
  makeLoggingOtelLayer,
  withMinLogLevel,
  LogLevelConfigs,
  type OtelLoggingConfig
} from "./lib/layers/otel-layer"
