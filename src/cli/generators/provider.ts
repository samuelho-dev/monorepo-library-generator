/**
 * Provider Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared provider generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 *
 * @module monorepo-library-generator/cli/generators/provider
 */

import { Console, Effect } from "effect"
import { generateProviderCore, type GeneratorResult } from "../../generators/core/provider-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import type { PlatformType } from "../../utils/platform-utils"

/**
 * Provider Generator Options
 */
export interface ProviderGeneratorOptions {
  readonly name: string
  readonly externalService: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: PlatformType
}

/**
 * Generate a provider library (CLI)
 *
 * Generates a provider library following Effect-based architecture patterns.
 * Uses Effect-native FileSystem operations.
 *
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating provider library: ${options.name}...`)

    // Import names from @nx/devkit for naming transformations
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)
    const serviceNameVariants = names(options.externalService)

    // Compute project identifiers
    const projectName = `provider-${nameVariants.fileName}`
    const projectRoot = `libs/provider/${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const packageName = `@custom-repo/${projectName}`

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
      description: options.description ||
        `${nameVariants.className} provider for ${options.externalService}`,
      tags: options.tags ||
        `type:provider,scope:provider,platform:${options.platform || "node"},service:${serviceNameVariants.fileName}`,
      offsetFromRoot: "../../..",
      workspaceRoot,
      externalService: options.externalService,
      platform: options.platform || "node"
    }

    const result: GeneratorResult = yield* (
      generateProviderCore(adapter, coreOptions) as Effect.Effect<GeneratorResult>
    )

    // CLI-specific output
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
