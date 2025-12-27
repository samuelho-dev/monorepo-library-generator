/**
 * Template Generation Spans
 *
 * Helper utilities for adding OpenTelemetry spans to template generation.
 * Provides consistent observability across all template generators.
 *
 * @module monorepo-library-generator/utils/template-spans
 */

import { Effect, Metric } from 'effect'
import { taggedTemplateDuration, templateCompilations } from '../infrastructure/metrics'
import type { FileSystemAdapter } from './filesystem'

/**
 * Template generator function type
 *
 * Represents a function that takes template options and returns file content.
 */
export type TemplateGeneratorFn<TOptions> = (options: TOptions) => string

/**
 * Generate a template file with observability
 *
 * Wraps template generation with OpenTelemetry spans and metrics.
 * Tracks compilation time, file writes, and any errors.
 *
 * @param adapter - FileSystem adapter for writing files
 * @param templateId - Unique identifier for the template (e.g., "contract/errors")
 * @param filePath - Destination file path
 * @param generator - Template generator function
 * @param options - Template options passed to generator
 * @returns Effect that writes the file with observability
 */
export function generateTemplateWithSpan<TOptions>(
  adapter: FileSystemAdapter,
  templateId: string,
  filePath: string,
  generator: TemplateGeneratorFn<TOptions>,
  options: TOptions
) {
  return Effect.gen(function* () {
    const startTime = Date.now()

    // Track template compilation
    yield* templateCompilations.pipe(Metric.tagged('template_id', templateId), Metric.increment)

    // Generate content
    const content = generator(options)

    // Write file
    yield* adapter.writeFile(filePath, content)

    // Track duration
    const duration = Date.now() - startTime
    yield* taggedTemplateDuration(templateId).pipe(Metric.update(duration))

    return filePath
  }).pipe(
    Effect.withSpan(`template.${templateId}`, {
      attributes: {
        'template.id': templateId,
        'template.file_path': filePath
      }
    })
  )
}

/**
 * Generate multiple template files with observability
 *
 * Efficiently generates multiple templates with a single span for the batch.
 * Individual templates still get their own spans.
 *
 * @param adapter - FileSystem adapter for writing files
 * @param templates - Array of template configurations
 * @param basePath - Base directory path for all templates
 * @returns Effect that writes all files and returns list of paths
 */
export function generateTemplatesWithSpan<TOptions>(
  adapter: FileSystemAdapter,
  templates: ReadonlyArray<{
    readonly id: string
    readonly path: string
    readonly generator: TemplateGeneratorFn<TOptions>
  }>,
  basePath: string,
  options: TOptions
) {
  return Effect.gen(function* () {
    const files: Array<string> = []

    for (const template of templates) {
      const filePath = `${basePath}/${template.path}`
      yield* generateTemplateWithSpan(adapter, template.id, filePath, template.generator, options)
      files.push(filePath)
    }

    return files
  }).pipe(
    Effect.withSpan('template.batch', {
      attributes: {
        'template.batch_size': templates.length,
        'template.base_path': basePath
      }
    })
  )
}

/**
 * Write raw content with observability
 *
 * For content that doesn't come from a template generator
 * (e.g., CLAUDE.md documentation).
 *
 * @param adapter - FileSystem adapter for writing files
 * @param templateId - Unique identifier for observability
 * @param filePath - Destination file path
 * @param content - Raw content to write
 * @returns Effect that writes the file with observability
 */
export function writeContentWithSpan(
  adapter: FileSystemAdapter,
  templateId: string,
  filePath: string,
  content: string
) {
  return Effect.gen(function* () {
    yield* adapter.writeFile(filePath, content)
    return filePath
  }).pipe(
    Effect.withSpan(`template.${templateId}`, {
      attributes: {
        'template.id': templateId,
        'template.file_path': filePath,
        'template.content_length': content.length
      }
    })
  )
}
