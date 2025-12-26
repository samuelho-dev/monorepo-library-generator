/**
 * Template Generator
 *
 * Generates files from template definitions using the registry.
 * Integrates with the template compiler and provides observability.
 *
 * @module monorepo-library-generator/templates/registry/generator
 */

import { Data, Effect, Metric, MetricBoundaries } from "effect"
import { createNamingVariants } from "../../utils/naming"
import { TemplateCompiler } from "../core/compiler"
import type { TemplateContext } from "../core/types"
import { getTemplateRegistry, validateContext } from "./registry"
import type {
  FileType,
  GeneratedFile,
  GenerationResult,
  GeneratorOptions,
  LibraryType,
  TemplateKey
} from "./types"

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when template is not found
 */
export class TemplateNotFoundError extends Data.TaggedError("TemplateNotFoundError")<{
  readonly libraryType: LibraryType
  readonly fileType: FileType
  readonly message: string
}> {}

/**
 * Error thrown when context validation fails
 */
export class ContextValidationError extends Data.TaggedError("ContextValidationError")<{
  readonly templateKey: TemplateKey
  readonly missingVariables: ReadonlyArray<string>
  readonly message: string
}> {}

/**
 * Error thrown during file generation
 */
export class GenerationError extends Data.TaggedError("GenerationError")<{
  readonly templateKey: TemplateKey
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Union of all generator errors
 */
export type GeneratorError =
  | TemplateNotFoundError
  | ContextValidationError
  | GenerationError

// ============================================================================
// Metrics
// ============================================================================

const filesGenerated = Metric.counter("template_files_generated_total", {
  description: "Total number of files generated"
})

const generationDuration = Metric.histogram(
  "template_generation_duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 })
)

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Build template context from generator options
 */
function buildContext(options: GeneratorOptions): TemplateContext {
  const naming = createNamingVariants(options.name)

  // Build package and project names based on library type
  const packageName = `${options.scope}/${options.libraryType}-${naming.fileName}`
  const projectName = `${options.libraryType}-${naming.fileName}`

  // Default entity type source to local types file (can be overridden via context)
  const entityTypeSource = (options.context?.entityTypeSource as string) ?? "./types"

  return {
    ...naming,
    scope: options.scope,
    packageName,
    projectName,
    libraryType: options.libraryType,
    entityTypeSource,
    ...options.context
  }
}

/**
 * Get output file path for a template
 */
function getOutputPath(libraryType: LibraryType, fileType: FileType, fileName: string): string {
  // Map file types to actual file paths
  const pathMappings: Record<FileType, string> = {
    errors: `src/${fileName}/errors.ts`,
    events: `src/${fileName}/events.ts`,
    ports: `src/${fileName}/ports.ts`,
    layers: `src/server/layers.ts`,
    service: `src/server/service.ts`,
    types: `src/${fileName}/types.ts`,
    index: `src/index.ts`,
    config: `src/${fileName}/config.ts`
  }

  return pathMappings[fileType] ?? `src/${fileType}.ts`
}

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Generate a single file from a template
 *
 * Requires TemplateCompiler service to be provided.
 */
export function generateFile(
  libraryType: LibraryType,
  fileType: FileType,
  context: TemplateContext
): Effect.Effect<GeneratedFile, GeneratorError, TemplateCompiler> {
  return Effect.gen(function* () {
    const templateKey = `${libraryType}/${fileType}` as TemplateKey
    const registry = getTemplateRegistry()
    const entry = registry.get(templateKey)

    if (!entry) {
      return yield* Effect.fail(
        new TemplateNotFoundError({
          libraryType,
          fileType,
          message: `Template not found: ${templateKey}`
        })
      )
    }

    // Validate context
    const validation = validateContext(templateKey, context)
    if (!validation.valid) {
      return yield* Effect.fail(
        new ContextValidationError({
          templateKey,
          missingVariables: validation.missing,
          message: `Missing required context variables: ${validation.missing.join(", ")}`
        })
      )
    }

    // Compile template using Effect service pattern
    const compiler = yield* TemplateCompiler
    const content = yield* compiler.compile(entry.template, context).pipe(
      Effect.mapError(err => new GenerationError({
        templateKey,
        message: err.message,
        cause: err
      }))
    )

    // Track metrics
    yield* filesGenerated.pipe(
      Metric.tagged("library_type", libraryType),
      Metric.tagged("file_type", fileType),
      Metric.increment
    )

    return {
      path: getOutputPath(libraryType, fileType, context.fileName),
      content,
      templateId: entry.template.id
    }
  }).pipe(
    Effect.withSpan(`generate.file.${libraryType}.${fileType}`, {
      attributes: {
        "template.library_type": libraryType,
        "template.file_type": fileType,
        "context.class_name": context.className
      }
    })
  )
}

/**
 * Generate all files for a library type
 *
 * Requires TemplateCompiler service to be provided.
 */
export function generateLibrary(
  options: GeneratorOptions
): Effect.Effect<GenerationResult, GeneratorError, TemplateCompiler> {
  return Effect.gen(function* () {
    const startTime = Date.now()
    const registry = getTemplateRegistry()
    const context = buildContext(options)

    // Get available templates for this library type
    const entries = registry.getByLibraryType(options.libraryType)
    const fileTypes = options.fileTypes ?? entries.map(e => e.metadata.fileType)

    // Generate each file
    const files: GeneratedFile[] = []
    const warnings: string[] = []

    for (const fileType of fileTypes) {
      const templateKey = `${options.libraryType}/${fileType}` as TemplateKey

      if (!registry.has(templateKey)) {
        warnings.push(`Template not found: ${templateKey}`)
        continue
      }

      const file = yield* generateFile(options.libraryType, fileType, context)
      files.push(file)
    }

    const durationMs = Date.now() - startTime

    // Track generation duration
    yield* generationDuration.pipe(
      Metric.tagged("library_type", options.libraryType),
      Metric.update(durationMs)
    )

    return {
      libraryType: options.libraryType,
      files,
      durationMs,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }).pipe(
    Effect.withSpan(`generate.library.${options.libraryType}`, {
      attributes: {
        "generator.library_type": options.libraryType,
        "generator.name": options.name,
        "generator.scope": options.scope
      }
    })
  )
}

/**
 * Generate files for multiple library types (full domain generation)
 *
 * Requires TemplateCompiler service to be provided.
 */
export function generateDomain(
  name: string,
  scope: string,
  libraryTypes: ReadonlyArray<LibraryType>,
  context?: Record<string, unknown>
): Effect.Effect<ReadonlyArray<GenerationResult>, GeneratorError, TemplateCompiler> {
  return Effect.gen(function* () {
    const results: GenerationResult[] = []

    for (const libraryType of libraryTypes) {
      const result = yield* generateLibrary({
        name,
        scope,
        libraryType,
        context
      })
      results.push(result)
    }

    return results
  }).pipe(
    Effect.withSpan(`generate.domain.${name}`, {
      attributes: {
        "generator.name": name,
        "generator.scope": scope,
        "generator.library_count": libraryTypes.length
      }
    })
  )
}

/**
 * Quick generation helper for common use cases
 */
export const generate = {
  /**
   * Generate a contract library
   */
  contract: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateLibrary({ name, scope, libraryType: "contract", context }),

  /**
   * Generate a data-access library
   */
  dataAccess: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateLibrary({ name, scope, libraryType: "data-access", context }),

  /**
   * Generate a feature library
   */
  feature: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateLibrary({ name, scope, libraryType: "feature", context }),

  /**
   * Generate an infra library
   */
  infra: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateLibrary({ name, scope, libraryType: "infra", context }),

  /**
   * Generate a provider library
   */
  provider: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateLibrary({ name, scope, libraryType: "provider", context }),

  /**
   * Generate a full domain (contract + data-access + feature)
   */
  fullDomain: (name: string, scope: string, context?: Record<string, unknown>) =>
    generateDomain(name, scope, ["contract", "data-access", "feature"], context)
}
