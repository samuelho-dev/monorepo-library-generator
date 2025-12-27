/**
 * @samuelho-dev/provider-opentelemetry
 *
 * OpenTelemetry SDK provider for Effect integration.

Provides the OTEL SDK layer that enables Effect.withSpan() and Effect.Metric
to automatically export to OpenTelemetry.

Usage:
- OpenTelemetryProvider.Live: Production OTEL from environment variables
- OpenTelemetryProvider.Test: No-op for testing
- OpenTelemetryProvider.Dev: Local development
- OpenTelemetryProvider.Auto: Environment-aware selection
- OpenTelemetryProvider.make(config): Custom configuration

Integration with infra-observability:
```typescript
import { OpenTelemetryProvider } from "@samuelho-dev/provider-opentelemetry";
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability";

const AppLayer = Layer.mergeAll(
  OpenTelemetryProvider.Live,  // OTEL SDK
  LoggingService.Live,          // Logging with OTEL export
  MetricsService.Live,          // Metrics with OTEL export
)
```
 *
 * @module @samuelho-dev/provider-opentelemetry
 * @see https://effect.website/docs/observability/otel-tracing
 */
// ============================================================================
// Provider Service
// ============================================================================
// OpenTelemetry provider with static layers
export { OpenTelemetry, OpenTelemetryProvider, type OpenTelemetryProviderOperations } from "./lib/otel"

// ============================================================================
// Types
// ============================================================================
// Configuration types
export {
  type MetricsConfig,
  MetricsConfigSchema,
  type OpenTelemetryConfig,
  OpenTelemetryConfigSchema,
  type TracesConfig,
  TracesConfigSchema
} from "./lib/types"

// ============================================================================
// Errors
// ============================================================================
// Error types
export {
  OpenTelemetryConfigError,
  OpenTelemetryError,
  type OpenTelemetryErrorType,
  OpenTelemetryExportError,
  OpenTelemetryInitError
} from "./lib/errors"
