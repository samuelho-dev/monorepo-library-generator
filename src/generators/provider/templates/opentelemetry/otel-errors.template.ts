/**
 * OpenTelemetry Errors Template
 *
 * Generates error types for OpenTelemetry provider operations.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate OpenTelemetry errors file
 */
export function generateOtelErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: 'OpenTelemetry Provider Errors',
    description: `Error types for OpenTelemetry SDK operations.

Provides:
- OpenTelemetryInitError: SDK initialization failures
- OpenTelemetryExportError: Trace/metric export failures
- OpenTelemetryConfigError: Configuration validation errors`,
    module: `${options.packageName}/errors`
  })

  builder.addImports([{ from: 'effect', imports: ['Data'] }])

  builder.addSectionComment('Error Types')

  builder.addRaw(`/**
 * Base error for OpenTelemetry operations
 */
export class OpenTelemetryError extends Data.TaggedError("OpenTelemetryError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * SDK initialization error
 */
export class OpenTelemetryInitError extends Data.TaggedError("OpenTelemetryInitError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Trace/metric export error
 */
export class OpenTelemetryExportError extends Data.TaggedError("OpenTelemetryExportError")<{
  readonly message: string
  readonly endpoint?: string
  readonly cause?: unknown
}> {}

/**
 * Configuration validation error
 */
export class OpenTelemetryConfigError extends Data.TaggedError("OpenTelemetryConfigError")<{
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}> {}

/**
 * Union type of all OpenTelemetry errors
 */
export type OpenTelemetryErrorType =
  | OpenTelemetryError
  | OpenTelemetryInitError
  | OpenTelemetryExportError
  | OpenTelemetryConfigError
`)

  return builder.toString()
}
