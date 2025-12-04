/**
 * Workspace Detection Utilities
 *
 * Detects whether the current workspace is:
 * - Nx monorepo (project.json, nx.json)
 * - Effect native monorepo (pnpm workspace with @effect/build-utils)
 *
 * @module monorepo-library-generator/workspace-detection
 */

import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import type { FileSystemAdapter } from "./filesystem-adapter"
import type { GeneratorContext } from "./shared/types"

/**
 * Detect workspace type and configuration
 *
 * @param tree - Virtual file system
 * @returns Generator context with workspace information
 */
export function detectWorkspace(tree: Tree) {
  const isNxWorkspace = detectNxWorkspace(tree)
  const isEffectNative = detectEffectNative(tree)
  const packageManager = detectPackageManager(tree)
  const workspaceRoot = tree.root

  return {
    workspaceRoot,
    packageManager,
    isNxWorkspace,
    isEffectNative
  }
}

/**
 * Check if workspace uses Nx
 *
 * Nx workspaces have:
 * - nx.json configuration file
 * - OR packages have project.json files
 */
function detectNxWorkspace(tree: Tree) {
  // Check for nx.json at root
  if (tree.exists("nx.json")) {
    return true
  }

  // Check for any project.json files (indicates Nx project structure)
  const hasProjectJson = tree
    .listChanges()
    .some((change) => change.path.includes("project.json"))

  return hasProjectJson
}

/**
 * Check if workspace is Effect native monorepo
 *
 * Effect monorepos have:
 * - pnpm-workspace.yaml
 * - Root package.json uses @effect/build-utils
 * - Packages under packages/ directory
 */
function detectEffectNative(tree: Tree) {
  // Must have pnpm workspace
  if (!tree.exists("pnpm-workspace.yaml")) {
    return false
  }

  // Check root package.json for @effect/build-utils
  if (!tree.exists("package.json")) {
    return false
  }

  const packageJsonContent = tree.read("package.json", "utf-8")
  if (!packageJsonContent) {
    return false
  }

  try {
    const packageJson = JSON.parse(packageJsonContent)

    // Check for @effect/build-utils in devDependencies
    const hasEffectBuildUtils = packageJson.devDependencies?.["@effect/build-utils"] !== undefined

    // Check for Effect-style scripts (codegen using build-utils)
    const hasEffectScripts = packageJson.scripts?.["codegen"]?.includes("build-utils") === true

    return hasEffectBuildUtils || hasEffectScripts
  } catch {
    return false
  }
}

/**
 * Detect package manager from lock files
 */
function detectPackageManager(
  tree: Tree
): "npm" | "yarn" | "pnpm" {
  if (tree.exists("pnpm-lock.yaml")) {
    return "pnpm"
  }
  if (tree.exists("yarn.lock")) {
    return "yarn"
  }
  return "npm"
}

/**
 * Get build mode based on workspace type
 *
 * @param context - Generator context
 * @returns 'nx' or 'effect'
 */
export function getBuildMode(context: GeneratorContext) {
  // Nx takes precedence if both are detected
  if (context.isNxWorkspace) {
    return "nx"
  }
  if (context.isEffectNative) {
    return "effect"
  }

  // Default to Nx for backwards compatibility
  return "nx"
}

/**
 * Check if project.json should be generated
 *
 * @param context - Generator context
 * @returns true if project.json should be created
 */
export function shouldGenerateProjectJson(context: GeneratorContext) {
  return context.isNxWorkspace
}

/**
 * Check if Effect build scripts should be generated
 *
 * @param context - Generator context
 * @returns true if Effect scripts should be added to package.json
 */
export function shouldGenerateEffectScripts(
  context: GeneratorContext
) {
  return context.isEffectNative
}

// ============================================================================
// New Workspace Configuration Detection (v1.2.3+)
// ============================================================================

/**
 * Workspace configuration detected from package.json and structure
 *
 * This interface represents the workspace-level configuration that affects
 * how libraries are generated, including package scope and directory structure.
 */
export interface WorkspaceConfig {
  /**
   * Package scope for generated libraries (e.g., "@myorg")
   * Extracted from root package.json name field
   */
  readonly scope: string

  /**
   * Root directory for generated libraries (e.g., "libs" or "packages")
   * Detected from nx.json workspaceLayout.libsDir or inferred from structure
   */
  readonly librariesRoot: string

  /**
   * Workspace type detected from file structure
   */
  readonly workspaceType: "nx" | "effect" | "hybrid" | "unknown"

  /**
   * Package manager detected from lockfiles
   */
  readonly packageManager: "npm" | "yarn" | "pnpm"

  /**
   * Build mode (nx or effect build-utils)
   */
  readonly buildMode: "nx" | "effect"

  /**
   * Workspace root path
   */
  readonly workspaceRoot: string
}

/**
 * Extract package scope from package.json name
 *
 * @param packageName - Package name from package.json (e.g., "@myorg/monorepo")
 * @returns Extracted scope (e.g., "@myorg")
 * @throws Error if packageName is missing or empty
 *
 * @example
 * extractScope("@myorg/monorepo") // "@myorg"
 * extractScope("my-monorepo") // "@my-monorepo"
 */
function extractScope(packageName: string | undefined) {
  // Require package.json name field
  if (!packageName || packageName.trim() === "") {
    throw new Error(
      "package.json must have a 'name' field. " +
        "Set it to your workspace name (e.g., '@myorg/monorepo' or 'my-workspace')"
    )
  }

  // If already scoped (starts with @), extract the scope part
  if (packageName.startsWith("@")) {
    const scope = packageName.split("/")[0]
    if (!scope) {
      throw new Error(`Invalid scoped package name: ${packageName}`)
    }
    return scope
  }

  // No scope - use package name as scope (add @ prefix)
  return `@${packageName}`
}

/**
 * Detect libraries root directory from nx.json or workspace structure
 *
 * Detection strategy:
 * 1. Check nx.json for workspaceLayout.libsDir
 * 2. Check for packages/ directory (Effect monorepos)
 * 3. Check for libs/ directory (Nx default)
 * 4. Default to "libs"
 *
 * @param adapter - File system adapter
 * @param workspaceRoot - Workspace root path
 * @param hasNxJson - Whether nx.json exists
 * @returns Effect that resolves to libraries root directory
 */
function detectLibrariesRoot(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  hasNxJson: boolean
) {
  return Effect.gen(function*() {
    // 1. Check nx.json for workspaceLayout.libsDir
    if (hasNxJson) {
      const nxJsonContent = yield* adapter.readFile(`${workspaceRoot}/nx.json`).pipe(
        Effect.catchAll(() => Effect.succeed("{}"))
      )

      try {
        const nxJson: {
          workspaceLayout?: {
            libsDir?: string
          }
        } = JSON.parse(nxJsonContent)

        if (nxJson.workspaceLayout?.libsDir) {
          return nxJson.workspaceLayout.libsDir
        }
      } catch {
        // Invalid JSON, continue with detection
      }
    }

    // 2. Check for packages/ directory (Effect monorepos)
    const hasPackages = yield* adapter.exists(`${workspaceRoot}/packages`)
    if (hasPackages) {
      return "packages"
    }

    // 3. Check for libs/ directory (Nx default)
    const hasLibs = yield* adapter.exists(`${workspaceRoot}/libs`)
    if (hasLibs) {
      return "libs"
    }

    // 4. Default to "libs"
    return "libs"
  })
}

/**
 * Detect workspace configuration from package.json and structure
 *
 * This function works with FileSystemAdapter, making it compatible with both
 * Nx Tree API and Effect FileSystem. It reads the root package.json to extract
 * the package scope and detects workspace type and libraries root.
 *
 * Configuration detection:
 * 1. Auto-detects scope from package.json name field
 * 2. Detects libraries root from nx.json or workspace structure
 * 3. Throws error if name field is missing
 *
 * @param adapter - File system adapter (Tree or Effect FS)
 * @returns Effect that succeeds with WorkspaceConfig or fails with file system errors
 *
 * @example
 * // In CLI wrapper
 * const config = yield* detectWorkspaceConfig(effectAdapter)
 *
 * // In Nx wrapper
 * const config = yield* detectWorkspaceConfig(treeAdapter)
 */
export function detectWorkspaceConfig(
  adapter: FileSystemAdapter
) {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()

    // Read root package.json
    const packageJsonContent = yield* adapter.readFile(`${workspaceRoot}/package.json`).pipe(
      Effect.catchAll(() => Effect.succeed("{}"))
    )

    const packageJson: {
      name?: string
      devDependencies?: Record<string, string>
      scripts?: Record<string, string>
    } = JSON.parse(packageJsonContent)

    // Detect workspace type
    const hasNxJson = yield* adapter.exists(`${workspaceRoot}/nx.json`)
    const hasPnpmWorkspace = yield* adapter.exists(`${workspaceRoot}/pnpm-workspace.yaml`)
    const hasEffectBuildUtils = packageJson.devDependencies?.["@effect/build-utils"] !== undefined

    let workspaceType: "nx" | "effect" | "hybrid" | "unknown"
    if (hasNxJson && hasEffectBuildUtils) {
      workspaceType = "hybrid"
    } else if (hasNxJson) {
      workspaceType = "nx"
    } else if (hasPnpmWorkspace && hasEffectBuildUtils) {
      workspaceType = "effect"
    } else {
      workspaceType = "unknown"
    }

    // Detect package manager
    const hasPnpmLock = yield* adapter.exists(`${workspaceRoot}/pnpm-lock.yaml`)
    const hasYarnLock = yield* adapter.exists(`${workspaceRoot}/yarn.lock`)
    const packageManager: "pnpm" | "yarn" | "npm" = hasPnpmLock ? "pnpm" : hasYarnLock ? "yarn" : "npm"

    // Auto-detect configuration from package.json and workspace structure
    const scope = extractScope(packageJson.name)
    const librariesRoot = yield* detectLibrariesRoot(adapter, workspaceRoot, hasNxJson)
    const buildMode: "nx" | "effect" = hasNxJson ? "nx" : "effect"

    return {
      scope,
      librariesRoot,
      workspaceType,
      packageManager,
      buildMode,
      workspaceRoot
    }
  })
}
