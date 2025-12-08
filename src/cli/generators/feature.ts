/**
 * Feature Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates feature generator core with Effect-based CLI.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to feature-generator-core.ts for domain-specific
 *    files (service, layers, types, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with Nx generators
 * - Correct file generation across all library types
 *
 * @module monorepo-library-generator/cli/generators/feature
 */

import { Console, Effect } from "effect"
import { generateFeatureCore, type GeneratorResult } from "../../generators/core/feature"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import type { PlatformType } from "../../utils/platforms"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"

/**
 * Feature Generator Options (CLI)
 */
export interface FeatureGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly scope?: string
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
}

/**
 * Generate Feature Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateFeature(options: FeatureGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating feature library: ${options.name}...`)

    // Compute naming variants
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)

    // Compute project identifiers
    const projectName = `feature-${nameVariants.fileName}`
    const projectRoot = `libs/feature/${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const packageName = `@custom-repo/${projectName}`
    const description = options.description || `${nameVariants.className} feature library`
    const platform = options.platform || "universal"

    // Parse tags
    const tagsString = options.tags ||
      `type:feature,scope:${options.scope || options.name},platform:${platform}`
    const tags = tagsString.split(",").map((t) => t.trim())

    // Phase 1: Generate infrastructure files using infrastructure generator
    yield* generateLibraryInfrastructure(adapter, {
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description,
      libraryType: "feature",
      platform,
      offsetFromRoot: "../../..",
      tags,
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
      ...(options.includeEdge !== undefined && { includeEdgeExports: options.includeEdge })
    })

    // Add dotfiles to library
    yield* addDotfilesToLibrary(adapter, {
      projectRoot,
      merge: true
    })

    // Prepare core options for domain file generation
    const coreOptions = {
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description,
      tags: tagsString,
      offsetFromRoot: "../../..",
      workspaceRoot,
      platform,
      ...(options.scope !== undefined && { scope: options.scope }),
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
      ...(options.includeCQRS !== undefined && { includeCQRS: options.includeCQRS }),
      ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge })
    }

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* generateFeatureCore(adapter, coreOptions)

    // Display CLI output
    yield* Console.log("✨ Feature library created successfully!")
    yield* Console.log(`  Location: ${result.projectRoot}`)
    yield* Console.log(`  Package: ${result.packageName}`)
    yield* Console.log(`  Files generated: ${result.filesGenerated.length}`)
    yield* Console.log(`\nNext steps:`)
    yield* Console.log(`  1. cd ${result.projectRoot}`)
    yield* Console.log(`  2. Customize service implementation`)
    yield* Console.log(`  3. pnpm install && pnpm build`)

    return result
  })
}
