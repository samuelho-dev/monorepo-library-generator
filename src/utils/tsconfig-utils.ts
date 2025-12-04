/**
 * TypeScript Configuration Generator Utilities
 *
 * Dynamic generation of tsconfig files with:
 * - Automatic project reference detection via Nx project graph
 * - Circular dependency validation
 * - pnpm workspace compatibility
 * - Library-type and platform-type specific configurations
 * - TypeScript incremental compilation support
 */

import type { Tree } from "@nx/devkit"
import { createProjectGraphAsync, readProjectConfiguration } from "@nx/devkit"
import { join, relative } from "path"
import type { LibraryType, PlatformType } from "./build-config-utils"

export interface TsConfigOptions {
  projectRoot: string
  projectName: string
  offsetFromRoot: string
  libraryType: LibraryType
  platform: PlatformType
  includeClientServer?: boolean
  includeEdgeExports?: boolean
}

interface ProjectReference {
  path: string
}

interface DependencyInfo {
  projectName: string
  projectRoot: string
  relativeLibPath: string
}

/**
 * Compute project references from Nx dependency graph (with fallback for non-NX)
 *
 * This function:
 * 1. Attempts to read the Nx project graph to find all dependencies
 * 2. Falls back to empty references if Nx is not available
 * 3. Filters to only library dependencies (not apps or external deps)
 * 4. Computes relative paths to each dependency's tsconfig.lib.json
 * 5. Validates no circular dependencies exist (NX only)
 *
 * @param tree - Nx Tree API for file system access
 * @param projectName - Name of the project to compute references for
 * @returns Project references and dependency information
 *
 * @remarks
 * For non-NX monorepos, project references are not automatically computed.
 * Developers should manually add references to tsconfig.lib.json if needed
 * for incremental compilation benefits.
 */
export async function computeProjectReferences(
  tree: Tree,
  projectName: string
): Promise<{
  references: Array<ProjectReference>
  dependencies: Array<DependencyInfo>
}> {
  try {
    // Try to use Nx project graph
    const graph = await createProjectGraphAsync()
    const project = graph.nodes[projectName]

    if (!project) {
      console.warn(`Project ${projectName} not found in project graph`)
      return { references: [], dependencies: [] }
    }

    const projectConfig = readProjectConfiguration(tree, projectName)
    const projectRoot = projectConfig.root

    // Get all dependencies from the graph
    const deps = graph.dependencies[projectName] || []

    const dependencies: Array<DependencyInfo> = []
    const references: Array<ProjectReference> = []

    for (const dep of deps) {
      const targetNode = graph.nodes[dep.target]

      // Skip external dependencies (npm packages)
      if (!targetNode || dep.target.startsWith("npm:")) {
        continue
      }

      // Only include library dependencies (not apps)
      try {
        const targetConfig = readProjectConfiguration(tree, dep.target)
        if (targetConfig.projectType !== "library") {
          continue
        }

        // Check if the dependency's tsconfig.lib.json exists
        const depTsConfigPath = join(targetConfig.root, "tsconfig.lib.json")
        if (!tree.exists(depTsConfigPath)) {
          console.warn(
            `tsconfig.lib.json not found for ${dep.target} at ${depTsConfigPath}`
          )
          continue
        }

        // Compute relative path from current project to dependency's tsconfig.lib.json
        const relativePath = relative(projectRoot, depTsConfigPath)

        dependencies.push({
          projectName: dep.target,
          projectRoot: targetConfig.root,
          relativeLibPath: relativePath
        })

        references.push({
          path: relativePath
        })
      } catch (error) {
        // Skip dependencies that don't exist in the workspace (e.g., in test environments)
        const message = error instanceof Error ? error.message : String(error)
        console.warn(
          `Could not read configuration for ${dep.target}: ${message}. Skipping project reference.`
        )
        continue
      }
    }

    // Detect circular dependencies
    const circularDeps = detectCircularReferences(
      graph,
      projectName,
      new Set()
    )
    if (circularDeps && circularDeps.length > 0) {
      throw new Error(
        `Circular dependency detected in ${projectName}: ${
          circularDeps.join(
            " -> "
          )
        }`
      )
    }

    return { references, dependencies }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check if this is an NX not found error (non-NX monorepo)
    if (
      errorMessage.includes("Cannot find module") ||
      errorMessage.includes("createProjectGraphAsync") ||
      errorMessage.includes("nx.json")
    ) {
      console.log(
        `NX not detected for ${projectName}. Skipping automatic project references. ` +
          `For incremental TypeScript compilation, manually add references to tsconfig.lib.json.`
      )
      return { references: [], dependencies: [] }
    }

    // For other errors, log and return empty
    console.error(
      `Error computing project references for ${projectName}:`,
      errorMessage
    )
    return { references: [], dependencies: [] }
  }
}

/**
 * Detect circular dependencies using DFS
 * TypeScript --build mode fails with circular references, so we must prevent them
 */
function detectCircularReferences(
  graph: any,
  projectName: string,
  visited: Set<string>,
  path: Array<string> = []
): Array<string> | undefined {
  if (visited.has(projectName)) {
    // Found a cycle - return the path
    const cycleStart = path.indexOf(projectName)
    if (cycleStart !== -1) {
      return [...path.slice(cycleStart), projectName]
    }
    return []
  }

  visited.add(projectName)
  path.push(projectName)

  const deps = graph.dependencies[projectName] || []
  for (const dep of deps) {
    // Skip external dependencies
    if (!graph.nodes[dep.target] || dep.target.startsWith("npm:")) {
      continue
    }

    const cycle = detectCircularReferences(
      graph,
      dep.target,
      new Set(visited),
      [...path]
    )
    if (cycle && cycle.length > 0) {
      return cycle
    }
  }

  return []
}

/**
 * Generate base tsconfig.json
 *
 * This is the project's root TypeScript configuration that:
 * - Extends workspace tsconfig.base.json
 * - Sets module to 'esnext' for ESM libraries
 * - Includes all source files
 * - References tsconfig.lib.json (NOT tsconfig.spec.json)
 */
export function generateBaseTsConfig(options: TsConfigOptions) {
  const { offsetFromRoot } = options

  return {
    extends: `${offsetFromRoot}/tsconfig.base.json`,
    compilerOptions: {
      module: "esnext",
      forceConsistentCasingInFileNames: true,
      strict: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true
    },
    files: [],
    include: ["src/**/*.ts"],
    references: [
      {
        path: "./tsconfig.lib.json"
      }
    ]
  }
}

/**
 * Generate tsconfig.lib.json for library compilation
 *
 * This configuration:
 * - Enables composite mode for project references
 * - Configures incremental compilation with .tsbuildinfo in dist/
 * - Sets up declaration generation for d.ts files
 * - Includes project references to dependencies
 * - Excludes test files
 */
export function generateLibTsConfig(
  options: TsConfigOptions,
  references: Array<ProjectReference>
) {
  const { libraryType, offsetFromRoot, platform, projectRoot } = options

  // Platform-specific type definitions
  // Contract libraries are platform-agnostic and don't need platform types
  const types = libraryType === "contract" ? [] : getPlatformTypes(platform)

  // Contract libraries need typeRoots: [] to prevent auto-inclusion of all @types/* packages
  // TypeScript defaults to ["node_modules/@types"] which auto-includes packages like
  // @types/minimatch, @types/three, etc. from the workspace root
  const compilerOptions: any = {
    composite: true,
    declaration: true,
    declarationMap: true,
    outDir: `${offsetFromRoot}dist/${projectRoot}`,
    tsBuildInfoFile: `${offsetFromRoot}dist/${projectRoot}/tsconfig.lib.tsbuildinfo`,
    noEmit: false,
    ...(types.length > 0 && { types }),
    ...(libraryType === "contract" && { typeRoots: [] })
  }

  return {
    extends: "./tsconfig.json",
    compilerOptions,
    include: ["src/**/*.ts"],
    exclude: [
      "vitest.config.ts",

      "src/**/*.spec.ts",
      "src/**/*.test.ts",
      "src/**/__tests__/**/*"
    ],
    ...(references.length > 0 && { references })
  }
}

/**
 * Generate tsconfig.spec.json for test compilation
 *
 * Key differences from tsconfig.lib.json:
 * - References tsconfig.lib.json (NOT tsconfig.json)
 * - Includes test files
 * - Adds test framework types (vitest)
 * - Does NOT use composite mode (tests aren't referenced by other projects)
 */
export function generateSpecTsConfig(options: TsConfigOptions) {
  const { offsetFromRoot, platform, projectRoot } = options

  const types = [...getPlatformTypes(platform), "vitest"]

  return {
    extends: "./tsconfig.json",
    compilerOptions: {
      outDir: `${offsetFromRoot}dist/libs/${projectRoot}/src`,
      types,
      target: "es2022",
      module: "esnext"
    },
    include: [
      "vitest.config.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/*.d.ts"
    ]
  }
}

/**
 * Get platform-specific type definitions
 *
 * Returns TypeScript type definition packages to include based on platform:
 * - node: Includes @types/node for Node.js APIs
 * - browser: No types (uses DOM types from lib)
 * - edge: No types (limited runtime APIs)
 * - universal: Includes @types/node (server-side default)
 *
 * Note: Contract libraries override this via libraryType check in generateLibTsConfig()
 * to remain platform-agnostic regardless of platform setting.
 */
function getPlatformTypes(platform: PlatformType) {
  switch (platform) {
    case "node":
      return ["node"]
    case "browser":
      return []
    case "edge":
      return []
    case "universal":
      return ["node"]
    default:
      return ["node"]
  }
}

/**
 * Get library-type specific compiler options
 */
export function getLibraryTypeOptions(libraryType: LibraryType) {
  switch (libraryType) {
    case "contract":
      // Pure type definitions, minimal runtime
      return {
        noEmitOnError: true
      }
    case "data-access":
      // Database and data layer
      return {
        strictNullChecks: true,
        strictPropertyInitialization: true
      }
    case "feature":
      // Business logic, may include React
      return {}
    case "provider":
      // Provider service adapters
      return {}
    case "infra":
      // Infrastructure services
      return {}
    default:
      return {}
  }
}

/**
 * Add all TypeScript configuration files to the Nx tree
 *
 * This is the main function generators should call to create
 * TypeScript configurations dynamically instead of using templates
 *
 * @param tree - Nx Tree API for file system access
 * @param options - TypeScript configuration options
 * @returns Project references and dependencies
 *
 * @remarks
 * **NX Workspaces**: Automatically computes project references from the dependency graph
 * **Non-NX Workspaces**: Falls back to empty references; developers can manually add them
 *
 * For incremental TypeScript compilation in non-NX monorepos, manually add
 * project references to tsconfig.lib.json after generation.
 */
export async function addTsConfigFiles(tree: Tree, options: TsConfigOptions) {
  const { projectName, projectRoot } = options

  // Compute project references from Nx graph (or empty if non-NX)
  const { dependencies, references } = await computeProjectReferences(
    tree,
    projectName
  )

  // Generate base tsconfig.json
  const baseTsConfig = generateBaseTsConfig(options)
  tree.write(
    join(projectRoot, "tsconfig.json"),
    JSON.stringify(baseTsConfig, null, 2) + "\n"
  )

  // Generate tsconfig.lib.json with project references
  const libTsConfig = generateLibTsConfig(options, references)
  tree.write(
    join(projectRoot, "tsconfig.lib.json"),
    JSON.stringify(libTsConfig, null, 2) + "\n"
  )

  // Generate tsconfig.spec.json
  const specTsConfig = generateSpecTsConfig(options)
  tree.write(
    join(projectRoot, "tsconfig.spec.json"),
    JSON.stringify(specTsConfig, null, 2) + "\n"
  )

  return { references, dependencies }
}

/**
 * Get offset from project root to workspace root
 * Used for computing relative paths in tsconfig
 */
export function getOffsetFromRoot(projectRoot: string) {
  const depth = projectRoot.split("/").length
  return depth === 1 ? "./" : "../".repeat(depth)
}

// ============================================================================
// Path Mapping Utilities - REMOVED
// ============================================================================
//
// TypeScript path mappings (paths property) are NOT compatible with pnpm workspaces.
// All imports work through package.json exports defined via pnpm workspace packages.
//
// See NX_STANDARDS.md lines 443-476 for details on why paths must NOT be used.
//
// Import resolution now works via:
// 1. package.json "exports" field in each library
// 2. pnpm workspace protocol (workspace:*) for dependencies
// 3. TypeScript project references in tsconfig.lib.json
//
// This eliminates the need for tsconfig path aliases entirely.
