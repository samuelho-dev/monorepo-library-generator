/**
 * Provider Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates provider generator core with Effect-based CLI.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to provider-generator-core.ts for domain-specific
 *    files (service wrapper, layers, types, validation, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with Nx generators
 * - External service SDK integration patterns
 *
 * @module monorepo-library-generator/cli/generators/provider
 */

import { Console, Effect } from "effect"
import { generateProviderCore, type GeneratorResult } from "../../generators/core/provider"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import type { PlatformType } from "../../utils/platforms"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Provider Generator Options (CLI)
 */
export interface ProviderGeneratorOptions {
  readonly name: string
  readonly externalService: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: PlatformType
}

/**
 * Generate Provider Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating provider library: ${options.name}...`)

    // Compute naming variants
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)
    const serviceNameVariants = names(options.externalService)

    // Compute project identifiers
    const projectName = `provider-${nameVariants.fileName}`
    const projectRoot = `libs/provider/${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const packageName = getPackageName("provider", nameVariants.fileName)
    const description = options.description ||
      `${nameVariants.className} provider for ${options.externalService}`
    const platform = options.platform || "node"

    // Parse tags
    const tagsString = options.tags ||
      `type:provider,scope:provider,platform:${platform},service:${serviceNameVariants.fileName}`
    const tags = tagsString.split(",").map((t) => t.trim())

    // Phase 1: Generate infrastructure files using infrastructure generator
    yield* generateLibraryInfrastructure(adapter, {
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description,
      libraryType: "provider",
      platform,
      offsetFromRoot: "../../..",
      tags
    })

    // Add dotfiles to library
    yield* addDotfilesToLibrary(adapter, {
      projectRoot,
      merge: true
    })

    // Prepare core options
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
      externalService: options.externalService,
      platform
    }

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* generateProviderCore(adapter, coreOptions)

    // Display CLI output
    yield* Console.log("✨ Provider library created successfully!")
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
