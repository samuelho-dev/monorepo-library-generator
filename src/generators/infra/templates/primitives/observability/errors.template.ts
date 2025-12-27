/**
 * Observability Error Types Template
 *
 * Generates Schema.TaggedError-based error types for observability operations.
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate observability error types
 */
export function generateObservabilityErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Errors`,
    description: `Data.TaggedError-based error types for observability operations.

Uses Data.TaggedError for internal infrastructure errors (not serializable).
Schema.TaggedError is reserved for RPC boundary errors only.

Error types:
- ${className}ConfigError: Invalid configuration
- ${className}ExportError: Failed to export telemetry
- ${className}ConnectionError: Cannot connect to OTEL collector
- ${className}InitError: SDK initialization failed`,
    module: `${scope}/infra-${fileName}/errors`
  })

  builder.addImports([{ from: "effect", imports: ["Data"] }])

  builder.addSectionComment("Base Error")

  builder.addRaw(`/**
 * Base error for all observability errors
 */
export class ${className}Error extends Data.TaggedError(
  "${className}Error"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}
`)

  builder.addSectionComment("Configuration Error")

  builder.addRaw(`/**
 * Invalid observability configuration
 *
 * @example
 * \`\`\`typescript
 * new ${className}ConfigError({
 *   message: "Invalid sampling ratio: must be between 0.0 and 1.0",
 *   field: "traces.samplingRatio",
 *   value: 2.5,
 * })
 * \`\`\`
 */
export class ${className}ConfigError extends Data.TaggedError(
  "${className}ConfigError"
)<{
  readonly message: string
  readonly field?: string
  readonly value?: unknown
  readonly cause?: unknown
}> {}
`)

  builder.addSectionComment("Export Error")

  builder.addRaw(`/**
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
 * \`\`\`typescript
 * new ${className}ExportError({
 *   message: "Failed to export traces to collector",
 *   exporterType: "traces",
 *   endpoint: "http://localhost:4318/v1/traces",
 *   statusCode: 503,
 * })
 * \`\`\`
 */
export class ${className}ExportError extends Data.TaggedError(
  "${className}ExportError"
)<{
  readonly message: string
  readonly exporterType?: "traces" | "metrics" | "logs"
  readonly endpoint?: string
  readonly statusCode?: number
  readonly cause?: unknown
}> {}
`)

  builder.addSectionComment("Connection Error")

  builder.addRaw(`/**
 * Cannot connect to OTEL collector
 *
 * @example
 * \`\`\`typescript
 * new ${className}ConnectionError({
 *   message: "Connection refused to OTEL collector",
 *   endpoint: "http://localhost:4318",
 *   retryCount: 3,
 * })
 * \`\`\`
 */
export class ${className}ConnectionError extends Data.TaggedError(
  "${className}ConnectionError"
)<{
  readonly message: string
  readonly endpoint?: string
  readonly retryCount?: number
  readonly cause?: unknown
}> {}
`)

  builder.addSectionComment("Initialization Error")

  builder.addRaw(`/**
 * SDK initialization failed
 *
 * @example
 * \`\`\`typescript
 * new ${className}InitError({
 *   message: "Failed to initialize OTEL SDK",
 *   component: "BatchSpanProcessor",
 * })
 * \`\`\`
 */
export class ${className}InitError extends Data.TaggedError(
  "${className}InitError"
)<{
  readonly message: string
  readonly component?: string
  readonly cause?: unknown
}> {}
`)

  builder.addSectionComment("Error Union")

  builder.addRaw(`/**
 * Union of all observability error types
 */
export type ${className}ErrorType =
  | ${className}Error
  | ${className}ConfigError
  | ${className}ExportError
  | ${className}ConnectionError
  | ${className}InitError
`)

  return builder.toString()
}
