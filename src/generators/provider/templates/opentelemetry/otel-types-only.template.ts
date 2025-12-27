/**
 * OpenTelemetry Types-Only Template
 *
 * Generates type-only exports for zero runtime overhead imports.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate OpenTelemetry types-only file
 */
export function generateOtelTypesOnlyFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: `${options.packageName}/types`,
    description: `Type-only exports for zero runtime overhead.

Import from this module for type annotations that don't include
runtime code in your bundle.

@example
\`\`\`typescript
import type { OpenTelemetryConfig, TracesConfig } from "${options.packageName}/types";
\`\`\``,
    module: `${options.packageName}/types`
  })

  builder.addRaw(`// Re-export all types from lib/types
export type {
  OpenTelemetryConfig,
  TracesConfig,
  MetricsConfig,
} from "./lib/types"

// Re-export provider operations type
export type { OpenTelemetryProviderOperations } from "./lib/otel"

// Re-export error types
export type { OpenTelemetryErrorType } from "./lib/errors"
`)

  return builder.toString()
}
