/**
 * Sub-Modules Core Generator
 *
 * Generates feature sub-module services following the Hybrid DDD pattern.
 * This generator creates properly integrated sub-modules with:
 *
 * - Class-based Context.Tag (not GenericTag)
 * - Full infrastructure integration (Logging, Metrics)
 * - Proper Layer composition with Effect imports
 * - Parent service integration hooks
 *
 * Fixes all 7 integration gaps identified in the original implementation.
 *
 * @module monorepo-library-generator/core/sub-modules
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem"
import { createNamingVariants } from "../../utils/naming"
import { generateSubModuleHandlersFile } from "../feature/templates/sub-module/handlers.template"
import { generateSubModuleLayerFile } from "../feature/templates/sub-module/layer.template"
import { generateSubModuleServiceFile } from "../feature/templates/sub-module/service.template"

export interface SubModuleOptions {
  /** Project root directory */
  projectRoot: string
  /** Source root directory (e.g., /libs/feature-order/src) */
  sourceRoot: string
  /** Package name (e.g., @scope/feature-order) */
  packageName: string
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Parent file name (e.g., 'order') */
  parentFileName: string
  /** Array of sub-module names (e.g., ['cart', 'checkout', 'management']) */
  subModules: Array<string>
}

export interface SubModuleGenerationResult {
  /** List of generated sub-modules */
  generatedModules: Array<string>
  /** Total files generated */
  filesGenerated: number
  /** Parent integration code */
  parentIntegration: {
    /** Import statements for parent service */
    imports: string
    /** Yield statements for parent service */
    yields: string
    /** Layer composition for parent layers */
    layerProvides: string
    /** Barrel exports for server index */
    serverExports: string
  }
}

/**
 * Generate all sub-modules for a feature domain
 *
 * Creates sub-module directories with:
 * - service.ts (Context.Tag + implementation)
 * - layer.ts (Live + Test layers)
 * - index.ts (barrel exports)
 *
 * Also generates parent integration code for:
 * - Gap #1: Parent service imports and yields
 * - Gap #2: Layer composition
 * - Gap #3: Server barrel exports
 */
export const generateSubModules = (adapter: FileSystemAdapter, options: SubModuleOptions) =>
  Effect.gen(function*() {
    // Sub-modules go in lib/server/services/{submodule}/
    // The main service.ts is also in lib/server/services/
    const servicesDir = `${options.sourceRoot}/lib/server/services`

    // Generate each sub-module (services directory is created by feature.ts)
    yield* Effect.forEach(
      options.subModules,
      (moduleName) =>
        generateSingleSubModule(adapter, {
          ...options,
          servicesDir,
          moduleName
        }),
      { concurrency: "unbounded" }
    )

    // Generate parent integration code (for documentation/guidance)
    const parentIntegration = generateParentIntegrationCode(options)

    const result: SubModuleGenerationResult = {
      generatedModules: options.subModules,
      filesGenerated: options.subModules.length * 3, // 3 files per module (service, layer, handlers)
      parentIntegration
    }
    return result
  })

/**
 * Generate a single sub-module
 */
const generateSingleSubModule = (
  adapter: FileSystemAdapter,
  options: SubModuleOptions & { servicesDir: string; moduleName: string }
) =>
  Effect.gen(function*() {
    const serviceDir = `${options.servicesDir}/${options.moduleName}`
    const subModuleClassName = createNamingVariants(options.moduleName).className

    // Create service directory
    yield* adapter.makeDirectory(serviceDir)

    const templateOptions = {
      parentName: options.parentName,
      parentClassName: options.parentClassName,
      parentFileName: options.parentFileName,
      subModuleName: options.moduleName,
      subModuleClassName
    }

    // Generate service.ts (Context.Tag + implementation)
    yield* adapter.writeFile(
      `${serviceDir}/service.ts`,
      generateSubModuleServiceFile(templateOptions)
    )

    // Generate layer.ts (Live + Test layers)
    yield* adapter.writeFile(`${serviceDir}/layer.ts`, generateSubModuleLayerFile(templateOptions))

    // Generate handlers.ts (RPC handlers - Contract-First)
    yield* adapter.writeFile(
      `${serviceDir}/handlers.ts`,
      generateSubModuleHandlersFile(templateOptions)
    )

    // NOTE: index.ts barrel file eliminated - biome noBarrelFile compliance
    // Consumers should import directly from service.ts, layer.ts, handlers.ts
  })

/**
 * Generate parent service integration code
 *
 * Fixes Gaps #1, #2, #3 by providing code snippets that the parent
 * service/layers/index files need to include.
 */
function generateParentIntegrationCode(options: SubModuleOptions) {
  const subModules = options.subModules.map((name) => ({
    name,
    className: createNamingVariants(name).className,
    propertyName: createNamingVariants(name).propertyName
  }))

  // Gap #1: Parent service imports and yields
  const imports = subModules
    .map((s) => `import { ${s.className}Service } from "./services/${s.name}";`)
    .join("\n")

  const yields = subModules
    .map((s) => `    const ${s.propertyName}Service = yield* ${s.className}Service;`)
    .join("\n")

  // Gap #2: Layer composition
  const layerProvides = subModules
    .map((s) => `  Layer.provide(${s.className}Dependencies),`)
    .join("\n")

  // Gap #3: Server barrel exports
  const serverExports = `// Sub-Module Exports
export * from "./services"`

  return {
    imports,
    yields,
    layerProvides,
    serverExports
  }
}
