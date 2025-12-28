/**
 * Execution Operations
 *
 * Library generation execution logic.
 *
 * @module monorepo-library-generator/cli/core/operations/execution
 */

import { Data, Effect } from "effect"

import type { FilePreview, GeneratorOptions, LibraryType } from "../types"
import { getEffectiveTags } from "../types"

/**
 * Error type for generation failures
 */
export class GenerationError extends Data.TaggedError("GenerationError")<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Result from wizard ready for generation
 */
export interface GenerationInput {
  readonly libraryType: LibraryType
  readonly libraryName: string
  readonly externalService?: string
  readonly targetDirectory: string
  readonly options: GeneratorOptions
  readonly filesToCreate: ReadonlyArray<FilePreview>
}

/**
 * Execute library generation based on input
 *
 * This is the single source of truth for executing generation.
 * Both the CLI commands and the TUI use this function.
 */
export function executeGeneration(input: GenerationInput) {
  return Effect.gen(function* () {
    // Import generators dynamically to avoid circular dependencies
    const { generateContract } = yield* Effect.tryPromise({
      try: () => import("../../generators/contract"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load contract generator" })
    })
    const { generateDataAccess } = yield* Effect.tryPromise({
      try: () => import("../../generators/data-access"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load data-access generator" })
    })
    const { generateFeature } = yield* Effect.tryPromise({
      try: () => import("../../generators/feature"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load feature generator" })
    })
    const { generateInfra } = yield* Effect.tryPromise({
      try: () => import("../../generators/infra"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load infra generator" })
    })
    const { generateProvider } = yield* Effect.tryPromise({
      try: () => import("../../generators/provider"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load provider generator" })
    })
    const { generateDomain } = yield* Effect.tryPromise({
      try: () => import("../../generators/domain"),
      catch: (error) =>
        new GenerationError({ cause: error, message: "Failed to load domain generator" })
    })

    // Get tags as string for generators
    const effectiveTags = getEffectiveTags(input.options)
    const tagsString = effectiveTags.join(",")

    const baseArgs = {
      name: input.libraryName,
      description: input.options.description,
      tags: tagsString
    }

    switch (input.libraryType) {
      case "contract":
        yield* generateContract({
          ...baseArgs,
          includeCQRS: input.options.includeCQRS ?? false,
          ...(input.options.includeSubModules && { includeSubModules: true }),
          ...(input.options.subModules && { subModules: input.options.subModules }),
          ...(input.options.typesDatabasePackage && {
            typesDatabasePackage: input.options.typesDatabasePackage
          })
        })
        break

      case "data-access":
        yield* generateDataAccess({
          ...baseArgs,
          ...(input.options.includeSubModules && { includeSubModules: true }),
          ...(input.options.subModules && { subModules: input.options.subModules })
        })
        break

      case "feature":
        yield* generateFeature({
          ...baseArgs,
          scope: input.options.scope,
          platform: input.options.platform,
          includeClientServer: input.options.includeClientServer,
          includeCQRS: input.options.includeCQRS,
          ...(input.options.includeSubModules && { includeSubModules: true }),
          ...(input.options.subModules && { subModules: input.options.subModules })
        })
        break

      case "infra":
        yield* generateInfra({
          ...baseArgs,
          platform: input.options.platform,
          includeClientServer: input.options.includeClientServer
        })
        break

      case "provider":
        yield* generateProvider({
          ...baseArgs,
          externalService: input.externalService ?? input.libraryName,
          platform: input.options.platform
        })
        break

      case "domain":
        yield* generateDomain({
          name: input.libraryName,
          ...(input.options.description && { description: input.options.description }),
          tags: tagsString,
          ...(input.options.scope && { scope: input.options.scope }),
          ...(input.options.includeClientServer && {
            includeClientServer: input.options.includeClientServer
          }),
          ...(input.options.includeCQRS && { includeCQRS: input.options.includeCQRS }),
          ...(input.options.includeSubModules && { includeSubModules: true }),
          ...(input.options.subModules && { subModules: input.options.subModules })
        })
        break
    }

    return input
  })
}
