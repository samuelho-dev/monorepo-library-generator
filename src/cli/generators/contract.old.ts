/**
 * Contract Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates contract generator core with Effect-based CLI.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to contract-generator-core.ts for domain-specific
 *    files (entities, errors, ports, events, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files including CLAUDE.md)
 * - Consistent behavior with Nx generators
 * - Proper granular exports for bundle optimization
 *
 * @module monorepo-library-generator/cli/generators/contract
 */

import { Console, Effect } from "effect"
import { generateContractCore, type GeneratorResult } from "../../generators/core/contract"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { createNamingVariants } from "../../utils/naming"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Contract Generator Options (CLI)
 *
 * @property entities - List of entity names for bundle optimization
 */
export interface ContractGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean
  readonly entities?: ReadonlyArray<string>
}

/**
 * Compute CLI metadata for library generation
 *
 * Simplified version of computeLibraryMetadata() for standalone CLI use.
 *
 * @param name - Library name
 * @param libraryType - Type of library (contract, data-access, etc.)
 * @param description - Optional description
 * @returns Computed metadata including paths and naming variants
 */
function computeCliMetadata(name: string, libraryType: string, description?: string) {
  const nameVariants = createNamingVariants(name)
  const fileName = nameVariants.fileName
  const projectName = `${libraryType}-${fileName}`
  const projectRoot = `libs/${libraryType}/${fileName}`
  const sourceRoot = `${projectRoot}/src`

  // Compute offset from workspace root
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
 * Generate Contract Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateInfrastructureFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 *
 * @param options - User-provided generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function*() {
    // Get workspace root
    const workspaceRoot = yield* Effect.sync(() => process.cwd())

    // Create Effect FileSystem adapter
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Compute metadata
    const metadata = computeCliMetadata(options.name, "contract", options.description)

    // Phase 1: Generate infrastructure files using unified generator
    yield* Console.log(`Creating contract library: ${options.name}...`)

    // Parse tags
    const tagsString = options.tags ?? "type:contract,platform:universal"
    const tags = tagsString.split(",").map((t) => t.trim())

    yield* generateLibraryInfrastructure(adapter, {
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      projectName: metadata.projectName,
      packageName: metadata.packageName,
      description: metadata.description,
      libraryType: "contract",
      offsetFromRoot: metadata.offsetFromRoot,
      platform: "universal",
      tags,
      ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
      ...(options.entities !== undefined && { entities: options.entities })
    })

    // Add dotfiles to library
    yield* addDotfilesToLibrary(adapter, {
      projectRoot: metadata.projectRoot,
      merge: true
    })

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* generateContractCore(adapter, {
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
      tags: options.tags ?? "type:contract,platform:universal",

      // Feature flags
      ...(options.includeCQRS !== undefined && { includeCQRS: options.includeCQRS }),
      ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
      ...(options.entities && { entities: options.entities })
    })

    // Display CLI output
    yield* Console.log("✨ Contract library created successfully!")
    yield* Console.log(`  Location: ${result.projectRoot}`)
    yield* Console.log(`  Package: ${result.packageName}`)
    yield* Console.log(`\nNext steps:`)
    yield* Console.log(`  1. cd ${result.projectRoot}`)
    yield* Console.log(`  2. pnpm install`)
    yield* Console.log(`  3. pnpm build`)

    return result
  })
}
