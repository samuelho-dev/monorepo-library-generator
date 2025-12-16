/**
 * Infrastructure Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates infrastructure generator core with Effect-based CLI.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to infra-generator-core.ts for domain-specific
 *    files (service, providers, configuration, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with Nx generators
 * - Platform-aware exports (client/server/edge)
 *
 * @module monorepo-library-generator/cli/generators/infra
 */

import { Console, Effect } from "effect"
import { generateInfraCore, type GeneratorResult } from "../../generators/core/infra"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import type { PlatformType } from "../../utils/platforms"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Infrastructure Generator Options (CLI)
 */
export interface InfraGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeEdge?: boolean
  readonly projectRoot?: string // Override default libs/infra/${name} path
}

/**
 * Generate Infrastructure Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateInfra(options: InfraGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating infrastructure library: ${options.name}...`)

    // Compute naming variants
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)

    // Compute project identifiers
    const projectRoot = options.projectRoot || `libs/infra/${nameVariants.fileName}`
    const isStandalone = !!options.projectRoot
    const projectName = isStandalone ? nameVariants.fileName : `infra-${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const libraryType = isStandalone ? nameVariants.fileName.split("-")[0] || "infra" : "infra"
    const packageName = getPackageName(libraryType, isStandalone ? nameVariants.fileName.replace(/^[^-]+-/, "") : nameVariants.fileName)
    const description = options.description || `${nameVariants.className} infrastructure library`
    const platform = options.platform || "node"

    // Compute offsetFromRoot dynamically based on projectRoot depth
    const depth = projectRoot.split("/").filter(p => p.length > 0).length
    const offsetFromRoot = depth === 1 ? "./" : "../".repeat(depth)

    // Parse tags
    const tagsString = options.tags || `type:infra,scope:shared,platform:${platform}`
    const tags = tagsString.split(",").map((t) => t.trim())

    // Phase 1: Generate infrastructure files using infrastructure generator
    yield* generateLibraryInfrastructure(adapter, {
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description,
      libraryType: "infra",
      platform,
      offsetFromRoot,
      tags,
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeEdge !== undefined && { includeEdgeExports: options.includeEdge })
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
      offsetFromRoot,
      workspaceRoot,
      platform,
      ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
      ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge })
    }

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* generateInfraCore(adapter, coreOptions)

    // Display CLI output
    yield* Console.log("✨ Infrastructure library created successfully!")
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
