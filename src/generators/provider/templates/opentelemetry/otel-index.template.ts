/**
 * OpenTelemetry Index Template
 *
 * Generates barrel exports for OpenTelemetry provider library.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate OpenTelemetry index file with barrel exports
 */
export function generateOtelIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: options.packageName,
    description: `OpenTelemetry SDK provider for Effect integration.

Provides the OTEL SDK layer that enables Effect.withSpan() and Effect.Metric
to automatically export to OpenTelemetry.

Usage:
- OpenTelemetryProvider.Live: Production OTEL from environment variables
- OpenTelemetryProvider.Test: No-op for testing
- OpenTelemetryProvider.Dev: Local development
- OpenTelemetryProvider.Auto: Environment-aware selection
- OpenTelemetryProvider.make(config): Custom configuration

Integration with infra-observability:
\`\`\`typescript
import { OpenTelemetryProvider } from "${options.packageName}";
import { LoggingService, MetricsService } from "${scope}/infra-observability";

const AppLayer = Layer.mergeAll(
  OpenTelemetryProvider.Live,  // OTEL SDK
  LoggingService.Live,          // Logging with OTEL export
  MetricsService.Live,          // Metrics with OTEL export
)
\`\`\``,
    module: options.packageName,
    see: ["https://effect.website/docs/observability/otel-tracing"]
  })

  builder.addSectionComment("Provider Service")

  builder.addRaw(`// OpenTelemetry provider with static layers
export {
  OpenTelemetryProvider,
  OpenTelemetry,
  type OpenTelemetryProviderOperations,
} from "./lib/otel"
`)

  builder.addSectionComment("Types")

  builder.addRaw(`// Configuration types
export {
  OpenTelemetryConfigSchema,
  TracesConfigSchema,
  MetricsConfigSchema,
  type OpenTelemetryConfig,
  type TracesConfig,
  type MetricsConfig,
} from "./lib/types"
`)

  builder.addSectionComment("Errors")

  builder.addRaw(`// Error types
export {
  OpenTelemetryError,
  OpenTelemetryInitError,
  OpenTelemetryExportError,
  OpenTelemetryConfigError,
  type OpenTelemetryErrorType,
} from "./lib/errors"
`)

  return builder.toString()
}
