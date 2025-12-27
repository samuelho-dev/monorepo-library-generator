/**
 * Build Configuration & Platform Utilities
 *
 * Unified build configuration utilities for all library types with:
 * - Platform-specific optimizations using @nx/esbuild:esbuild executor
 * - Platform export determination (client/server/edge)
 * - TypeScript configuration generation with project references
 * - Package.json exports generation for tree-shaking
 *
 * @module monorepo-library-generator/build
 */

import type { ProjectGraph, TargetConfiguration, Tree } from "@nx/devkit"
import { createProjectGraphAsync, readProjectConfiguration } from "@nx/devkit"
import { join, relative } from "node:path"
import type { LibraryType, PlatformType } from "./types"

// Re-export types for convenience
export type { LibraryType, PlatformType }

// ============================================================================
// Library Configuration Constants
// ============================================================================

/**
 * Default tags for different library types
 */
export const DEFAULT_LIBRARY_TAGS: {
  readonly contract: ReadonlyArray<string>
  readonly feature: ReadonlyArray<string>
  readonly dataAccess: ReadonlyArray<string>
  readonly infrastructure: ReadonlyArray<string>
  readonly provider: ReadonlyArray<string>
} = {
  contract: ["type:contract", "scope:shared"],
  feature: ["type:feature", "scope:shared"],
  dataAccess: ["type:data-access", "scope:server"],
  infrastructure: ["type:infrastructure", "scope:shared"],
  provider: ["type:provider", "scope:shared"]
}

// ============================================================================
// Build Configuration Types
// ============================================================================

export interface BuildConfigOptions {
  projectRoot: string
  platform: PlatformType
  libraryType: LibraryType
  includeClientServer?: boolean
  additionalEntryPoints?: Array<string>
  buildMode?: "nx" | "effect"
}

// ============================================================================
// Platform Export Types
// ============================================================================

/**
 * Options for determining platform exports
 */
export interface PlatformExportOptions {
  readonly libraryType: LibraryType
  readonly platform: PlatformType
  readonly includeClientServer?: boolean
}

/**
 * Result of platform export determination
 */
export interface PlatformExports {
  readonly shouldGenerateServer: boolean
  readonly shouldGenerateClient: boolean
}

/**
 * Options for computing platform configuration
 */
export interface PlatformConfigurationInput {
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
}

/**
 * Complete platform configuration for a generator
 */
export interface PlatformConfiguration {
  readonly platform: PlatformType
  readonly includeClientServer: boolean
}

// ============================================================================
// TypeScript Configuration Types
// ============================================================================

export interface TsConfigOptions {
  projectRoot: string
  projectName: string
  offsetFromRoot: string
  libraryType: LibraryType
  platform: PlatformType
  includeClientServer?: boolean
}

interface ProjectReference {
  path: string
}

interface DependencyInfo {
  projectName: string
  projectRoot: string
  relativeLibPath: string
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Package.json export entry
 */
export interface ExportEntry {
  import?: string
  types?: string
  require?: string
}

/**
 * Export map for package.json
 */
export type ExportMap = Record<string, ExportEntry>

/**
 * Export configuration for a library
 */
export interface ExportConfig {
  libraryType: LibraryType
  platform: PlatformType
  includeClientServer?: boolean
  hasEntities?: boolean
  entityNames?: Array<string>
  subModuleNames?: Array<string>
}

// ============================================================================
// Platform Export Utilities
// ============================================================================

/**
 * Determine if platform-specific exports should be generated
 *
 * Implements the correct precedence logic:
 * 1. Explicit `includeClientServer` setting takes precedence
 * 2. Platform defaults apply if `includeClientServer` is undefined
 * 3. data-access and contract libraries never generate platform-specific exports
 */
export function resolvePlatformExports(options: PlatformExportOptions) {
  // Library types that don't support platform-specific exports
  const supportsPlatformExports = options.libraryType !== "data-access" && options.libraryType !== "contract"

  if (!supportsPlatformExports) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Explicit override: includeClientServer === true
  if (options.includeClientServer === true) {
    return { shouldGenerateServer: true, shouldGenerateClient: true }
  }

  // Explicit override: includeClientServer === false
  if (options.includeClientServer === false) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Platform defaults (includeClientServer is undefined)
  const shouldGenerateServer = options.platform === "node" || options.platform === "universal"
  const shouldGenerateClient = options.platform === "browser" || options.platform === "universal"

  return { shouldGenerateServer, shouldGenerateClient }
}

/**
 * Check if a library type supports platform-specific exports
 */
export function hasPlatformExports(libraryType: LibraryType) {
  return libraryType !== "data-access" && libraryType !== "contract"
}

/**
 * Compute complete platform configuration for a generator
 */
export function computePlatformConfiguration(
  input: PlatformConfigurationInput,
  defaults: {
    readonly defaultPlatform: PlatformType
    readonly libraryType: LibraryType
  }
) {
  const platform = input.platform ?? defaults.defaultPlatform

  const { shouldGenerateClient, shouldGenerateServer } = resolvePlatformExports({
    libraryType: defaults.libraryType,
    platform,
    ...(input.includeClientServer !== undefined && {
      includeClientServer: input.includeClientServer
    })
  })

  const includeClientServer = shouldGenerateClient && shouldGenerateServer

  return { platform, includeClientServer }
}

// ============================================================================
// Build Target Utilities
// ============================================================================

/**
 * Generate additional entry points based on library type and options
 */
function getAdditionalEntryPoints(options: BuildConfigOptions) {
  const {
    additionalEntryPoints = [],
    includeClientServer,
    libraryType,
    platform,
    projectRoot
  } = options

  const entryPoints = [...additionalEntryPoints]

  const { shouldGenerateClient, shouldGenerateServer } = resolvePlatformExports({
    libraryType,
    platform,
    ...(includeClientServer !== undefined && { includeClientServer })
  })

  if (shouldGenerateServer) {
    entryPoints.push(`${projectRoot}/src/server.ts`)
  }

  if (shouldGenerateClient) {
    entryPoints.push(`${projectRoot}/src/client.ts`)
  }

  switch (libraryType) {
    case "data-access":
      break
    case "provider":
      break
    case "infra":
      if (!entryPoints.includes(`${projectRoot}/src/server.ts`)) {
        entryPoints.push(`${projectRoot}/src/server.ts`)
      }
      break
    case "feature":
      break
  }

  return entryPoints
}

/**
 * Create unified build target configuration using TypeScript compiler
 */
export function createBuildTarget(options: BuildConfigOptions) {
  const additionalEntryPoints = getAdditionalEntryPoints(options)

  return {
    executor: "@nx/js:tsc",
    outputs: ["{options.outputPath}"],
    options: {
      outputPath: `dist/${options.projectRoot}`,
      main: `${options.projectRoot}/src/index.ts`,
      tsConfig: `${options.projectRoot}/tsconfig.lib.json`,
      ...(additionalEntryPoints.length > 0 && { additionalEntryPoints }),
      assets: [`${options.projectRoot}/*.md`],
      batch: true,
      declaration: true,
      declarationMap: true,
      clean: false
    }
  }
}

/**
 * Create standard test target configuration
 */
export function createTestTarget(projectRoot: string) {
  return {
    executor: "@nx/vite:test",
    outputs: ["{workspaceRoot}/coverage/{projectRoot}"],
    options: {
      config: `${projectRoot}/vitest.config.ts`,
      passWithNoTests: true
    }
  }
}

/**
 * Create standard lint target configuration
 */
export function createLintTarget(projectRoot: string) {
  return {
    executor: "@nx/eslint:lint",
    outputs: ["{options.outputFile}"],
    options: {
      lintFilePatterns: [`${projectRoot}/**/*.ts`]
    }
  }
}

/**
 * Create typecheck target configuration
 */
export function createTypecheckTarget(projectRoot: string) {
  return {
    executor: "nx:run-commands",
    options: {
      command: `tsc --noEmit -p ${projectRoot}/tsconfig.lib.json`
    }
  }
}

/**
 * Create complete target configuration object
 */
export function createStandardTargets(options: BuildConfigOptions) {
  const targets: Record<string, TargetConfiguration> = {
    build: createBuildTarget(options),
    lint: createLintTarget(options.projectRoot),
    typecheck: createTypecheckTarget(options.projectRoot)
  }

  targets.test = createTestTarget(options.projectRoot)

  return targets
}

/**
 * Generate Effect-style build scripts for package.json
 */
export function createEffectScripts() {
  return {
    codegen: "build-utils prepare-v2",
    build: "pnpm build-esm && pnpm build-annotate && pnpm build-cjs && build-utils pack-v2",
    "build-esm": `tsc -b tsconfig.lib.json`,
    "build-cjs":
      "babel build/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir build/cjs --source-maps",
    "build-annotate": "babel build/esm --plugins annotate-pure-calls --out-dir build/esm --source-maps",
    check: "tsc -b tsconfig.json",
    test: "vitest",
    "test:ci": "vitest run",
    lint: "eslint \"**/{src,test}/**/*.{ts,mjs}\"",
    "lint-fix": "pnpm lint --fix"
  }
}

// ============================================================================
// TypeScript Configuration Utilities
// ============================================================================

/**
 * Compute project references from Nx dependency graph
 */
export async function computeProjectReferences(tree: Tree, projectName: string) {
  try {
    const graph = await createProjectGraphAsync()
    const project = graph.nodes[projectName]

    if (!project) {
      return { references: [], dependencies: [] }
    }

    const projectConfig = readProjectConfiguration(tree, projectName)
    const projectRoot = projectConfig.root
    const deps = graph.dependencies[projectName] || []

    const dependencies: Array<DependencyInfo> = []
    const references: Array<ProjectReference> = []

    for (const dep of deps) {
      const targetNode = graph.nodes[dep.target]

      if (!targetNode || dep.target.startsWith("npm:")) {
        continue
      }

      try {
        const targetConfig = readProjectConfiguration(tree, dep.target)
        if (targetConfig.projectType !== "library") {
          continue
        }

        const depTsConfigPath = join(targetConfig.root, "tsconfig.lib.json")
        if (!tree.exists(depTsConfigPath)) {
          continue
        }

        const relativePath = relative(projectRoot, depTsConfigPath)

        dependencies.push({
          projectName: dep.target,
          projectRoot: targetConfig.root,
          relativeLibPath: relativePath
        })

        references.push({ path: relativePath })
      } catch {
        continue
      }
    }

    const circularDeps = detectCircularReferences(graph, projectName)
    if (circularDeps && circularDeps.length > 0) {
      throw new Error(
        `Circular dependency detected in ${projectName}: ${circularDeps.join(" -> ")}`
      )
    }

    return { references, dependencies }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (
      errorMessage.includes("Cannot find module") ||
      errorMessage.includes("createProjectGraphAsync") ||
      errorMessage.includes("nx.json")
    ) {
      return { references: [], dependencies: [] }
    }
    return { references: [], dependencies: [] }
  }
}

/**
 * Detect circular dependencies using iterative DFS
 */
function detectCircularReferences(graph: ProjectGraph, startProject: string) {
  const stack: Array<{ project: string; path: Array<string>; visited: Set<string> }> = [
    { project: startProject, path: [], visited: new Set() }
  ]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) break

    const { path, project, visited } = current

    if (visited.has(project)) {
      const cycleStart = path.indexOf(project)
      if (cycleStart !== -1) {
        return [...path.slice(cycleStart), project]
      }
      continue
    }

    const newVisited = new Set(visited)
    newVisited.add(project)
    const newPath = [...path, project]

    const deps = graph.dependencies[project] || []
    for (const dep of deps) {
      if (!graph.nodes[dep.target] || dep.target.startsWith("npm:")) {
        continue
      }
      stack.push({ project: dep.target, path: newPath, visited: newVisited })
    }
  }

  const emptyResult: Array<string> = []
  return emptyResult
}

/**
 * Get offset from project root to workspace root
 */
export function getOffsetFromRoot(projectRoot: string) {
  const depth = projectRoot.split("/").length
  return depth === 1 ? "./" : "../".repeat(depth)
}

// ============================================================================
// Package.json Exports Utilities
// ============================================================================

/**
 * Generate granular exports for contract libraries
 */
export function generateContractExports(config: ExportConfig) {
  const exports: ExportMap = {
    ".": { import: "./src/index.ts", types: "./src/index.ts" },
    "./types": { import: "./src/types.ts", types: "./src/types.ts" },
    "./errors": { import: "./src/lib/errors.ts", types: "./src/lib/errors.ts" },
    "./ports": { import: "./src/lib/ports.ts", types: "./src/lib/ports.ts" },
    // RPC definitions (imported by feature libraries for handler implementation)
    "./rpc": { import: "./src/lib/rpc.ts", types: "./src/lib/rpc.ts" }
  }

  if (config.hasEntities) {
    exports["./entities"] = {
      import: "./src/lib/entities/index.ts",
      types: "./src/lib/entities/index.ts"
    }
    exports["./entities/*"] = {
      import: "./src/lib/entities/*.ts",
      types: "./src/lib/entities/*.ts"
    }
  }

  exports["./events"] = { import: "./src/lib/events.ts", types: "./src/lib/events.ts" }

  // Add sub-module subpath exports (Hybrid DDD pattern)
  // e.g., "./authentication" -> "./src/authentication/index.ts"
  if (config.subModuleNames && config.subModuleNames.length > 0) {
    for (const subModuleName of config.subModuleNames) {
      exports[`./${subModuleName}`] = {
        import: `./src/${subModuleName}/index.ts`,
        types: `./src/${subModuleName}/index.ts`
      }
    }
  }

  return exports
}

/**
 * Generate granular exports for data-access libraries
 */
export function generateDataAccessExports() {
  return {
    ".": { import: "./src/index.ts", types: "./src/index.ts" },
    "./types": { import: "./src/types.ts", types: "./src/types.ts" },
    "./repository": {
      import: "./src/lib/repository/index.ts",
      types: "./src/lib/repository/index.ts"
    },
    "./repository/operations": {
      import: "./src/lib/repository/operations/index.ts",
      types: "./src/lib/repository/operations/index.ts"
    },
    "./repository/operations/*": {
      import: "./src/lib/repository/operations/*.ts",
      types: "./src/lib/repository/operations/*.ts"
    },
    "./queries": { import: "./src/lib/queries/index.ts", types: "./src/lib/queries/index.ts" },
    "./queries/*": { import: "./src/lib/queries/*.ts", types: "./src/lib/queries/*.ts" },
    "./validation": {
      import: "./src/lib/validation/index.ts",
      types: "./src/lib/validation/index.ts"
    },
    "./validation/*": { import: "./src/lib/validation/*.ts", types: "./src/lib/validation/*.ts" },
    "./layers": { import: "./src/lib/layers/index.ts", types: "./src/lib/layers/index.ts" },
    "./layers/*": { import: "./src/lib/layers/*.ts", types: "./src/lib/layers/*.ts" }
  }
}

/**
 * Generate granular exports for feature libraries
 *
 * RPC is always prewired - exports are always generated
 */
export function generateFeatureExports() {
  const exports: ExportMap = {
    ".": { import: "./src/index.ts", types: "./src/index.ts" },
    "./types": { import: "./src/types.ts", types: "./src/types.ts" },
    // RPC always prewired
    "./rpc/handlers": {
      import: "./src/lib/rpc/handlers/index.ts",
      types: "./src/lib/rpc/handlers/index.ts"
    },
    "./rpc/handlers/*": {
      import: "./src/lib/rpc/handlers/*.ts",
      types: "./src/lib/rpc/handlers/*.ts"
    }
  }

  return exports
}

/**
 * Generate granular exports for infra libraries
 */
export function generateInfraExports() {
  return {
    ".": { import: "./src/index.ts", types: "./src/index.ts" },
    "./types": { import: "./src/types.ts", types: "./src/types.ts" },
    "./service": { import: "./src/lib/service/index.ts", types: "./src/lib/service/index.ts" },
    "./providers/*": { import: "./src/lib/providers/*.ts", types: "./src/lib/providers/*.ts" },
    "./layers/*": { import: "./src/lib/layers/*.ts", types: "./src/lib/layers/*.ts" }
  }
}

/**
 * Generate granular exports for provider libraries
 */
export function generateProviderExports() {
  return {
    ".": { import: "./src/index.ts", types: "./src/index.ts" },
    "./types": { import: "./src/types.ts", types: "./src/types.ts" },
    "./service": { import: "./src/lib/service/index.ts", types: "./src/lib/service/index.ts" },
    "./service/*": {
      import: "./src/lib/service/operations/*.ts",
      types: "./src/lib/service/operations/*.ts"
    },
    "./errors": { import: "./src/lib/errors.ts", types: "./src/lib/errors.ts" },
    "./validation": { import: "./src/lib/validation.ts", types: "./src/lib/validation.ts" }
  }
}

/**
 * Generate granular exports based on library type
 */
export function generateGranularExports(config: ExportConfig) {
  switch (config.libraryType) {
    case "contract":
      return generateContractExports(config)
    case "data-access":
      return generateDataAccessExports()
    case "feature":
      return generateFeatureExports()
    case "infra":
      return generateInfraExports()
    case "provider":
      return generateProviderExports()
    default:
      return { ".": { import: "./src/index.ts", types: "./src/index.ts" } }
  }
}

/**
 * Merge exports with granular exports, prioritizing granular exports
 */
export function mergeExports(baseExports: ExportMap, granularExports: ExportMap) {
  return { ...baseExports, ...granularExports }
}

/**
 * Validate export paths exist
 */
export function validateExportPaths(exports: ExportMap) {
  const errors: Array<string> = []

  for (const [key, value] of Object.entries(exports)) {
    if (!value.import) {
      errors.push(`Export "${key}" missing import path`)
    }
    if (!value.types) {
      errors.push(`Export "${key}" missing types path`)
    }
  }

  return errors
}

/**
 * Get export path for specific import
 */
export function getExportPathForImport(exports: ExportMap, importPath: string) {
  if (exports[importPath]) {
    return importPath
  }

  for (const key of Object.keys(exports)) {
    if (key.endsWith("/*")) {
      const basePath = key.slice(0, -2)
      if (importPath.startsWith(`${basePath}/`)) {
        return key
      }
    }
  }

  return undefined
}

/**
 * Generate import example documentation for README
 */
export function generateImportExamples(config: ExportConfig) {
  const examples: Array<string> = []

  switch (config.libraryType) {
    case "contract":
      examples.push(
        "// Granular entity import (optimal tree-shaking)",
        "import { Product } from '@scope/contract-product/entities/product'",
        "",
        "// Barrel import (convenience)",
        "import { Product, Category } from '@scope/contract-product/entities'",
        "",
        "// Type-only import (zero runtime overhead)",
        "import type { Product } from '@scope/contract-product/types'"
      )
      break
    case "data-access":
      examples.push(
        "// Granular operation import (only bundles create logic)",
        "import { createUser } from '@scope/data-access-user/repository/operations/create'",
        "",
        "// Specific query builder",
        "import { buildFindByIdQuery } from '@scope/data-access-user/queries/find-queries'",
        "",
        "// Type-only import",
        "import type { User, UserCreateInput } from '@scope/data-access-user/types'"
      )
      break
    case "feature":
      if (
        config.platform === "browser" ||
        config.platform === "universal" ||
        config.includeClientServer
      ) {
        examples.push(
          "// Granular hook import",
          "import { useUser } from '@scope/feature-user/client/hooks/use-user'",
          "",
          "// Type-only import",
          "import type { UserData } from '@scope/feature-user/types'"
        )
      }
      if (
        config.platform === "node" ||
        config.platform === "universal" ||
        config.includeClientServer
      ) {
        examples.push(
          "// Granular service operation",
          "import { createUser } from '@scope/feature-user/server/service/create-user'",
          "",
          "// Full server exports",
          "import { UserService } from '@scope/feature-user/server'"
        )
      }
      break
    case "provider":
      examples.push(
        "// Granular operation import",
        "import { createItem } from '@scope/provider-cache/service/create'",
        "",
        "// Type-only import",
        "import type { CacheItem } from '@scope/provider-cache/types'"
      )
      break
    case "infra":
      examples.push(
        "// Service import",
        "import { DatabaseService } from '@scope/infra-database/service'",
        "",
        "// Specific provider",
        "import { PostgresProvider } from '@scope/infra-database/providers/postgres'",
        "",
        "// Type-only import",
        "import type { DatabaseConfig } from '@scope/infra-database/types'"
      )
      break
  }

  return examples.join("\n")
}
