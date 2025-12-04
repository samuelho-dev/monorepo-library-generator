/**
 * Feature Generator Core
 *
 * Shared core logic for feature generation used by both Nx and CLI.
 * Uses FileSystemAdapter for portability across different file system implementations.
 *
 * @module monorepo-library-generator/generators/core/feature-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platform-utils"
import type { FeatureTemplateOptions } from "../../utils/shared/types"
import {
  generateAtomsFile,
  generateAtomsIndexFile,
  generateErrorsFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateIndexFile,
  generateLayersFile,
  generateMiddlewareFile,
  generateRpcErrorsFile,
  generateRpcFile,
  generateRpcHandlersFile,
  generateSchemasFile,
  generateServiceFile,
  generateServiceSpecFile,
  generateTypesFile
} from "../feature/templates/index"

/**
 * Core options for feature generator
 */
export interface FeatureGeneratorCoreOptions {
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
  readonly scope?: string
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
}

/**
 * Result returned by feature generator
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly filesGenerated: Array<string>
}

/**
 * Generate feature library domain files
 *
 * This is the core generation logic shared between Nx and CLI implementations.
 * Uses FileSystemAdapter to be portable across different file system implementations.
 *
 * @param adapter - File system adapter (Tree or Effect FS)
 * @param options - Feature generator options
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateFeatureCore(
  adapter: FileSystemAdapter,
  options: FeatureGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform configuration
    const includeRPC = options.includeRPC ?? false
    const includeCQRS = options.includeCQRS ?? false
    const includeEdge = options.includeEdge ?? false

    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
        ...(includeEdge && { includeEdge })
      },
      {
        defaultPlatform: "universal",
        libraryType: "feature"
      }
    )

    const { includeClientServer: shouldIncludeClientServer, includeEdge: shouldIncludeEdge } = platformConfig

    // Prepare template options
    const templateOptions: FeatureTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "feature",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      includeClient: shouldIncludeClientServer,
      includeServer: true,
      includeRPC,
      includeCQRS,
      includeEdge: shouldIncludeEdge
    }

    // Generate domain files
    const filesGenerated: Array<string> = []

    // Compute paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const sharedPath = `${sourceLibPath}/shared`
    const serverPath = `${sourceLibPath}/server`
    const rpcPath = `${sourceLibPath}/rpc`
    const clientPath = `${sourceLibPath}/client`
    const edgePath = `${sourceLibPath}/edge`

    // Generate main index.ts (barrel exports)
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Always generate shared layer
    yield* adapter.writeFile(`${sharedPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sharedPath}/errors.ts`)

    yield* adapter.writeFile(`${sharedPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sharedPath}/types.ts`)

    yield* adapter.writeFile(`${sharedPath}/schemas.ts`, generateSchemasFile(templateOptions))
    filesGenerated.push(`${sharedPath}/schemas.ts`)

    // Generate server layer (always generated for features)
    yield* adapter.writeFile(`${serverPath}/service.ts`, generateServiceFile(templateOptions))
    filesGenerated.push(`${serverPath}/service.ts`)

    yield* adapter.writeFile(`${serverPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${serverPath}/layers.ts`)

    yield* adapter.writeFile(`${serverPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${serverPath}/service.spec.ts`)

    // Create CQRS directory placeholders (conditional)
    if (includeCQRS) {
      yield* adapter.writeFile(`${serverPath}/commands/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/commands/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/queries/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/queries/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/operations/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/operations/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/projections/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/projections/.gitkeep`)
    }

    // Generate RPC layer (conditional)
    if (includeRPC) {
      yield* adapter.writeFile(`${rpcPath}/rpc.ts`, generateRpcFile(templateOptions))
      filesGenerated.push(`${rpcPath}/rpc.ts`)

      yield* adapter.writeFile(`${rpcPath}/handlers.ts`, generateRpcHandlersFile(templateOptions))
      filesGenerated.push(`${rpcPath}/handlers.ts`)

      yield* adapter.writeFile(`${rpcPath}/errors.ts`, generateRpcErrorsFile(templateOptions))
      filesGenerated.push(`${rpcPath}/errors.ts`)
    }

    // Generate client layer (conditional)
    if (shouldIncludeClientServer) {
      yield* adapter.writeFile(`${clientPath}/hooks/use-${options.fileName}.ts`, generateHooksFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/use-${options.fileName}.ts`)

      yield* adapter.writeFile(`${clientPath}/hooks/index.ts`, generateHooksIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/index.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/${options.fileName}-atoms.ts`, generateAtomsFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/${options.fileName}-atoms.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/index.ts`, generateAtomsIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/index.ts`)

      yield* adapter.writeFile(`${clientPath}/components/.gitkeep`, "")
      filesGenerated.push(`${clientPath}/components/.gitkeep`)
    }

    // Generate edge layer (conditional)
    if (shouldIncludeEdge) {
      yield* adapter.writeFile(`${edgePath}/middleware.ts`, generateMiddlewareFile(templateOptions))
      filesGenerated.push(`${edgePath}/middleware.ts`)
    }

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
