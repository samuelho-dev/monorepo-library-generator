/**
 * @samuelho-dev/provider-opentelemetry/types
 *
 * Type-only exports for zero runtime overhead.

Import from this module for type annotations that don't include
runtime code in your bundle.

@example
```typescript
import type { OpenTelemetryConfig, TracesConfig } from "@samuelho-dev/provider-opentelemetry/types";
```
 *
 * @module @samuelho-dev/provider-opentelemetry/types
 */
// Re-export all types from lib/types
export type {
  OpenTelemetryConfig,
  TracesConfig,
  MetricsConfig,
} from "./lib/types"

// Re-export provider operations type
export type { OpenTelemetryProviderOperations } from "./lib/otel"

// Re-export error types
export type { OpenTelemetryErrorType } from "./lib/errors"
