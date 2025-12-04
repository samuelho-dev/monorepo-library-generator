/**
 * Contract Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared contract generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 *
 * @module monorepo-library-generator/cli/generators/contract
 */

import { Console, Effect } from "effect"
import { generateContractCore, type GeneratorResult } from "../../generators/core/contract-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { createNamingVariants } from "../../utils/naming-utils"

/**
 * Contract Generator Options
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
 * Generate a contract library (CLI)
 *
 * Generates a contract library following Effect-based architecture patterns.
 * Uses Effect-native FileSystem operations.
 *
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function*() {
    // 1. Get workspace root
    const workspaceRoot = yield* Effect.sync(() => process.cwd())

    // 2. Create Effect FileSystem adapter (requires FileSystem and Path services)
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // 3. Compute metadata
    const metadata = computeCliMetadata(options.name, "contract", options.description)

    // 4. Run core generator
    yield* Console.log(`Creating contract library: ${options.name}...`)

    const result: GeneratorResult = yield* (
      generateContractCore(adapter, {
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
        tags: options.tags ?? "type:contract,platform:universal",

        // Feature flags (only include if defined)
        ...(options.includeCQRS !== undefined && { includeCQRS: options.includeCQRS }),
        ...(options.includeRPC !== undefined && { includeRPC: options.includeRPC }),
        ...(options.entities && { entities: options.entities })
      }) as Effect.Effect<GeneratorResult>
    )

    // 5. CLI-specific output
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
