/**
 * Infrastructure Generator Core
 *
 * Shared core logic for infrastructure generation used by both Nx and CLI.
 * Uses FileSystemAdapter for portability across different file system implementations.
 *
 * @module monorepo-library-generator/generators/core/infra-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platform-utils"
import type { InfraTemplateOptions } from "../../utils/shared/types"
import {
  generateClientFile,
  generateClientLayersFile,
  generateConfigFile,
  generateEdgeFile,
  generateEdgeLayersFile,
  generateErrorsFile,
  generateIndexFile,
  generateInterfaceFile,
  generateMemoryProviderFile,
  generateServerFile,
  generateServerLayersFile,
  generateUseHookFile
} from "../infra/templates/index"

/**
 * Core options for infra generator
 */
export interface InfraGeneratorCoreOptions {
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
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeEdge?: boolean
}

/**
 * Result returned by infra generator
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly filesGenerated: Array<string>
}

/**
 * Generate infrastructure library domain files
 *
 * This is the core generation logic shared between Nx and CLI implementations.
 * Uses FileSystemAdapter to be portable across different file system implementations.
 *
 * @param adapter - File system adapter (Tree or Effect FS)
 * @param options - Infra generator options
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateInfraCore(
  adapter: FileSystemAdapter,
  options: InfraGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform configuration
    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
        ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge })
      },
      {
        defaultPlatform: "node",
        libraryType: "infra"
      }
    )

    const { includeClientServer, includeEdge } = platformConfig

    // Prepare template options
    const templateOptions: InfraTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "infra",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      includeClientServer,
      includeEdge
    }

    // Generate domain files
    const filesGenerated: Array<string> = []

    // Compute paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const serviceLibPath = `${sourceLibPath}/service`
    const layersLibPath = `${sourceLibPath}/layers`
    const providersLibPath = `${sourceLibPath}/providers`

    // Generate service files
    yield* adapter.writeFile(`${serviceLibPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${serviceLibPath}/errors.ts`)

    yield* adapter.writeFile(`${serviceLibPath}/interface.ts`, generateInterfaceFile(templateOptions))
    filesGenerated.push(`${serviceLibPath}/interface.ts`)

    yield* adapter.writeFile(`${serviceLibPath}/config.ts`, generateConfigFile(templateOptions))
    filesGenerated.push(`${serviceLibPath}/config.ts`)

    // Generate providers
    yield* adapter.writeFile(`${providersLibPath}/memory.ts`, generateMemoryProviderFile(templateOptions))
    filesGenerated.push(`${providersLibPath}/memory.ts`)

    // Generate server layers (always)
    yield* adapter.writeFile(`${layersLibPath}/server-layers.ts`, generateServerLayersFile(templateOptions))
    filesGenerated.push(`${layersLibPath}/server-layers.ts`)

    // Generate client files (conditional - client and server are generated together)
    if (includeClientServer) {
      const clientLayersContent = generateClientLayersFile(templateOptions)
      if (clientLayersContent) {
        yield* adapter.writeFile(`${layersLibPath}/client-layers.ts`, clientLayersContent)
        filesGenerated.push(`${layersLibPath}/client-layers.ts`)
      }

      const useHookContent = generateUseHookFile(templateOptions)
      if (useHookContent) {
        const clientHooksPath = `${sourceLibPath}/client/hooks`
        yield* adapter.writeFile(`${clientHooksPath}/use-${options.fileName}.ts`, useHookContent)
        filesGenerated.push(`${clientHooksPath}/use-${options.fileName}.ts`)
      }

      const clientContent = generateClientFile(templateOptions)
      if (clientContent) {
        yield* adapter.writeFile(`${options.sourceRoot}/client.ts`, clientContent)
        filesGenerated.push(`${options.sourceRoot}/client.ts`)
      }

      const serverContent = generateServerFile(templateOptions)
      if (serverContent) {
        yield* adapter.writeFile(`${options.sourceRoot}/server.ts`, serverContent)
        filesGenerated.push(`${options.sourceRoot}/server.ts`)
      }
    }

    // Generate edge files (conditional)
    if (includeEdge) {
      const edgeLayersContent = generateEdgeLayersFile(templateOptions)
      if (edgeLayersContent) {
        yield* adapter.writeFile(`${layersLibPath}/edge-layers.ts`, edgeLayersContent)
        filesGenerated.push(`${layersLibPath}/edge-layers.ts`)
      }

      const edgeContent = generateEdgeFile(templateOptions)
      if (edgeContent) {
        yield* adapter.writeFile(`${options.sourceRoot}/edge.ts`, edgeContent)
        filesGenerated.push(`${options.sourceRoot}/edge.ts`)
      }
    }

    // Generate index file (barrel exports)
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
