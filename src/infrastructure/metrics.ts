/**
 * Generator Metrics
 *
 * OpenTelemetry metrics for generator execution observability.
 *
 * Provides histogram and counter metrics for:
 * - Generator execution duration
 * - Files generated per execution
 * - Generator errors by type
 * - Template compilation times
 *
 * @module monorepo-library-generator/infrastructure/metrics
 */

import { Metric, MetricBoundaries } from "effect"

// ============================================================================
// Duration Metrics
// ============================================================================

/**
 * Generator execution duration histogram
 *
 * Tracks the total time for generator execution in milliseconds.
 * Uses exponential boundaries starting at 10ms with factor 2.
 *
 * Boundaries: 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120ms
 */
export const generatorDuration = Metric.histogram(
  "generator.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 })
)

/**
 * Template compilation duration histogram
 *
 * Tracks time spent compiling individual templates.
 * Uses finer granularity for template-level operations.
 *
 * Boundaries: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512ms
 */
export const templateDuration = Metric.histogram(
  "generator.template_duration_ms",
  MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 })
)

/**
 * Infrastructure generation duration histogram
 *
 * Tracks time spent generating infrastructure files (package.json, tsconfig, etc.)
 */
export const infrastructureDuration = Metric.histogram(
  "generator.infrastructure_duration_ms",
  MetricBoundaries.exponential({ start: 5, factor: 2, count: 8 })
)

// ============================================================================
// Counter Metrics
// ============================================================================

/**
 * Files generated counter
 *
 * Counts total files generated across all generator executions.
 * Tagged by library type for granular analysis.
 */
export const filesGenerated = Metric.counter("generator.files_generated")

/**
 * Generator execution counter
 *
 * Counts total generator executions.
 * Tagged by library type and interface type (cli, mcp, nx).
 */
export const generatorExecutions = Metric.counter("generator.executions")

/**
 * Generator error counter
 *
 * Counts generator errors by error type.
 * Useful for identifying common failure modes.
 */
export const generatorErrors = Metric.counter("generator.errors")

/**
 * Template compilation counter
 *
 * Counts template compilations by template ID.
 */
export const templateCompilations = Metric.counter("generator.template_compilations")

// ============================================================================
// Gauge Metrics
// ============================================================================

/**
 * Active generators gauge
 *
 * Tracks currently executing generators.
 * Useful for concurrency monitoring.
 */
export const activeGenerators = Metric.gauge("generator.active")

// ============================================================================
// Tagged Metric Helpers
// ============================================================================

/**
 * Create tagged duration metric for a specific library type
 */
export const taggedGeneratorDuration = (libraryType: string) =>
  generatorDuration.pipe(Metric.tagged("library_type", libraryType))

/**
 * Create tagged execution counter for a specific library type and interface
 */
export const taggedGeneratorExecution = (libraryType: string, interfaceType: string) =>
  generatorExecutions.pipe(
    Metric.tagged("library_type", libraryType),
    Metric.tagged("interface_type", interfaceType)
  )

/**
 * Create tagged error counter for a specific error type
 */
export const taggedGeneratorError = (errorType: string, libraryType: string) =>
  generatorErrors.pipe(
    Metric.tagged("error_type", errorType),
    Metric.tagged("library_type", libraryType)
  )

/**
 * Create tagged template duration for a specific template
 */
export const taggedTemplateDuration = (templateId: string) =>
  templateDuration.pipe(Metric.tagged("template_id", templateId))

/**
 * Create tagged files counter for a specific library type
 */
export const taggedFilesGenerated = (libraryType: string) =>
  filesGenerated.pipe(Metric.tagged("library_type", libraryType))
