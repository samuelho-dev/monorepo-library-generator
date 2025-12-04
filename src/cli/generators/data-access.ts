/**
 * Data Access Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared data-access generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 */

import { Console, Effect } from "effect"
import { generateDataAccessCore, type GeneratorResult } from "../../generators/core/data-access-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { createNamingVariants } from "../../utils/naming-utils"

/**
 * Data Access Generator Options
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
    packageName: `@scope/${projectName}`,
    offsetFromRoot,
    description: description ?? `${nameVariants.className} ${libraryType} library`
  }
}

/**
 * Generate a data-access library (CLI)
 */
export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Compute metadata
    const metadata = computeCliMetadata(options.name, "data-access", options.description)

    yield* Console.log(`Creating data-access library: ${options.name}...`)

    const result: GeneratorResult = yield* (
      generateDataAccessCore(adapter, {
        // Pass pre-computed metadata
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
        tags: options.tags ?? "type:data-access,scope:shared,platform:server",

        // Feature flags (only include if defined)
        ...(options.includeCache !== undefined && { includeCache: options.includeCache }),
        ...(options.contractLibrary !== undefined && { contractLibrary: options.contractLibrary })
      }) as Effect.Effect<GeneratorResult>
    )

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
