/**
 * Provider Generator Core
 *
 * Shared core logic for provider generation used by both Nx and CLI.
 * Uses FileSystemAdapter for portability across different file system implementations.
 *
 * @module monorepo-library-generator/generators/core/provider-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter, FileSystemErrors } from "../../utils/filesystem-adapter"
import type { PlatformType } from "../../utils/platform-utils"
import type { Platform, ProviderTemplateOptions } from "../../utils/shared/types"
import {
  generateErrorsFile,
  generateLayersFile,
  generateServiceFile,
  generateServiceSpecFile,
  generateTypesFile,
  generateValidationFile
} from "../provider/templates/index"

/**
 * Core options for provider generator
 */
export interface ProviderGeneratorCoreOptions {
  readonly name: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly description: string
  readonly tags: string
  readonly offsetFromRoot: string
  readonly workspaceRoot?: string
  readonly externalService: string
  readonly platform: PlatformType
}

/**
 * Result returned by provider generator
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly filesGenerated: Array<string>
}

/**
 * Generate provider library domain files
 *
 * This is the core generation logic shared between Nx and CLI implementations.
 * Uses FileSystemAdapter to be portable across different file system implementations.
 *
 * @param adapter - File system adapter (Tree or Effect FS)
 * @param options - Provider generator options
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateProviderCore(
  adapter: FileSystemAdapter,
  options: ProviderGeneratorCoreOptions
): Effect.Effect<GeneratorResult, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    // Map PlatformType to Platform for template options
    const platformMapping: Record<PlatformType, Platform> = {
      node: "server",
      browser: "client",
      edge: "edge",
      universal: "universal"
    }

    // Prepare template options
    const templateOptions: ProviderTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "provider",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      externalService: options.externalService,
      platforms: [platformMapping[options.platform]]
    }

    // Generate domain files
    const filesGenerated: Array<string> = []
    const sourceLibPath = `${options.sourceRoot}/lib`

    // Generate all provider-specific files
    yield* adapter.writeFile(`${sourceLibPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/errors.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/types.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/validation.ts`, generateValidationFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/validation.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/service.ts`, generateServiceFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/service.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/layers.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`)

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
