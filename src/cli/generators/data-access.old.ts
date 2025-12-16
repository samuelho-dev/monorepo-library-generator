/**
 * Data Access Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates data-access generator core with Effect-based CLI.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to data-access-generator-core.ts for domain-specific
 *    files (repository, queries, validation, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with Nx generators
 * - Proper server-side platform configuration
 */

import { Console, Effect } from "effect"
import { generateDataAccessCore, type GeneratorResult } from "../../generators/core/data-access"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { createNamingVariants } from "../../utils/naming"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Data Access Generator Options (CLI)
 */
export interface DataAccessGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly includeCache?: boolean
  readonly contractLibrary?: string
}

/**
 * Compute CLI metadata for library generation
 *
 * Simplified version of computeLibraryMetadata() for standalone CLI use.
 */
function computeCliMetadata(name: string, libraryType: string, description?: string) {
  const nameVariants = createNamingVariants(name)
  const fileName = nameVariants.fileName
  const projectName = `${libraryType}-${fileName}`
  const projectRoot = `libs/${libraryType}/${fileName}`
  const sourceRoot = `${projectRoot}/src`

  // Simple offset computation (count slashes)
  const depth = projectRoot.split("/").length
  const offsetFromRoot = "../".repeat(depth)

  return {
    ...nameVariants,
    projectName,
    projectRoot,
    sourceRoot,
    packageName: getPackageName(libraryType, fileName),
    offsetFromRoot,
    description: description ?? `${nameVariants.className} ${libraryType} library`
  }
}

/**
 * Generate Data Access Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 */
export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Compute metadata
    const metadata = computeCliMetadata(options.name, "data-access", options.description)

    yield* Console.log(`Creating data-access library: ${options.name}...`)

    // Parse tags
    const tagsString = options.tags ?? "type:data-access,scope:shared,platform:node"
    const tags = tagsString.split(",").map((t) => t.trim())

    // Phase 1: Generate infrastructure files using infrastructure generator
    yield* generateLibraryInfrastructure(adapter, {
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      projectName: metadata.projectName,
      packageName: metadata.packageName,
      description: metadata.description,
      libraryType: "data-access",
      offsetFromRoot: metadata.offsetFromRoot,
      platform: "node",
      tags
    })

    // Add dotfiles to library
    yield* addDotfilesToLibrary(adapter, {
      projectRoot: metadata.projectRoot,
      merge: true
    })

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* generateDataAccessCore(adapter, {
      // Pre-computed metadata
      name: metadata.name,
      className: metadata.className,
      propertyName: metadata.propertyName,
      fileName: metadata.fileName,
      constantName: metadata.constantName,
      projectName: metadata.projectName,
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      packageName: metadata.packageName,
      offsetFromRoot: metadata.offsetFromRoot,
      description: metadata.description,
      tags: tagsString,

      // Feature flags
      ...(options.includeCache !== undefined && { includeCache: options.includeCache }),
      ...(options.contractLibrary !== undefined && { contractLibrary: options.contractLibrary })
    })

    yield* Console.log("✨ Data access library created successfully!")
    yield* Console.log(`  Location: ${result.projectRoot}`)
    yield* Console.log(`  Package: ${result.packageName}`)
    yield* Console.log(`\nNext steps:`)
    yield* Console.log(`  1. cd ${result.projectRoot}`)
    yield* Console.log(`  2. Customize repository implementation`)
    yield* Console.log(`  3. pnpm install && pnpm build`)

    return result
  })
}
