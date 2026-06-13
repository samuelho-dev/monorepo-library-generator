/**
 * Unified Workspace Context
 *
 * Single source of truth for workspace context creation across all interfaces
 * Combines detection, context creation, and type definitions.
 *
 * @module monorepo-library-generator/infrastructure/workspace
 */

import { FileSystem } from "@effect/platform"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as path from "node:path"

// ============================================================================
// Types
// ============================================================================

/**
 * Workspace type - identifies the monorepo tool being used
 */
export type WorkspaceType = "nx" | "standalone"

/**
 * Package manager type
 */
export type PackageManager = "pnpm" | "npm" | "yarn"

/**
 * Interface type - identifies which interface is calling the generator
 */
export type InterfaceType = "mcp" | "cli" | "nx"

/**
 * Unified workspace context used by all three interfaces (MCP, CLI, Nx)
 *
 * This replaces:
 * - MCP's WorkspaceContext (in workspace-detector.ts)
 * - CLI's workspace detection logic
 * - Nx's workspace detection logic
 */
export interface WorkspaceContext {
  readonly root: string
  readonly type: WorkspaceType
  readonly scope: string
  readonly packageManager: PackageManager
  readonly interfaceType: InterfaceType
  /**
   * Relative path from workspace root to libraries directory
   * Examples: "libs", "packages/libs", "packages", "src/libs"
   */
  readonly librariesRoot: string
}

/**
 * Effect Schema for WorkspaceContext
 */
export const WorkspaceContextSchema = Schema.Struct({
  root: Schema.String,
  type: Schema.Literal("nx", "standalone"),
  scope: Schema.String,
  packageManager: Schema.Literal("pnpm", "npm", "yarn"),
  interfaceType: Schema.Literal("mcp", "cli", "nx"),
  librariesRoot: Schema.String
})

/**
 * Workspace Detection Error
 */
export class WorkspaceDetectionError extends Error {
  readonly _tag = "WorkspaceDetectionError"

  constructor(
    message: string,
    override readonly cause?: unknown
  ) {
    super(message)
    this.name = "WorkspaceDetectionError"
  }
}

// ============================================================================
// Private Detection Functions (not exported)
// ============================================================================

/**
 * Library type subdirectories to check for
 * These indicate an established library structure
 */
const LIBRARY_TYPE_SUBDIRS: ReadonlyArray<string> = Object.freeze([
  "contract",
  "data-access",
  "feature",
  "infra",
  "provider",
  "util"
])

/**
 * Find workspace root by traversing up directory tree
 *
 * Looks for workspace indicators like package.json with workspaces field,
 * nx.json, pnpm-workspace.yaml, etc.
 */
const findWorkspaceRoot = (fs: FileSystem.FileSystem, startPath: string) =>
  Effect.gen(function*() {
    let currentPath = startPath
    const maxDepth = 10
    let depth = 0

    while (depth < maxDepth) {
      const pkgPath = `${currentPath}/package.json`
      const exists = yield* fs.exists(pkgPath).pipe(Effect.orElseSucceed(() => false))

      if (exists) {
        // Check if this is the workspace root
        const isRoot = yield* isWorkspaceRoot(fs, currentPath)
        if (isRoot) return currentPath
      }

      // Go up one level
      const parent = path.dirname(currentPath)
      if (parent === currentPath) break
      currentPath = parent
      depth++
    }

    return yield* Effect.fail(
      new WorkspaceDetectionError(`Could not find workspace root from ${startPath}`)
    )
  })

/**
 * Check if directory is workspace root
 *
 * Looks for:
 * - nx.json (Nx workspace)
 * - pnpm-workspace.yaml (pnpm workspace)
 * - lerna.json (Lerna workspace)
 * - turbo.json (Turborepo)
 * - package.json with workspaces field (Yarn/npm workspaces)
 */
const isWorkspaceRoot = (fs: FileSystem.FileSystem, dirPath: string) =>
  Effect.gen(function*() {
    // Check for workspace indicators
    const indicators = ["nx.json", "pnpm-workspace.yaml", "lerna.json", "turbo.json"]

    for (const indicator of indicators) {
      const exists = yield* fs
        .exists(`${dirPath}/${indicator}`)
        .pipe(Effect.orElseSucceed(() => false))
      if (exists) return true
    }

    // Check package.json for workspaces field
    const pkgPath = `${dirPath}/package.json`
    const exists = yield* fs.exists(pkgPath).pipe(Effect.orElseSucceed(() => false))

    if (exists) {
      const content = yield* fs.readFileString(pkgPath).pipe(Effect.orElseSucceed(() => "{}"))
      const pkg = JSON.parse(content)
      if (pkg.workspaces) return true
    }

    return false
  })

/**
 * Detect workspace type (nx or standalone)
 *
 * For our unified infrastructure:
 * - "nx" = Nx-managed workspace (has nx.json)
 * - "standalone" = Other workspace types (pnpm, yarn, turborepo, or plain)
 */
const detectWorkspaceType = (fs: FileSystem.FileSystem, rootPath: string) =>
  Effect.gen(function*() {
    // Check for Nx
    const nxExists = yield* fs.exists(`${rootPath}/nx.json`).pipe(Effect.orElseSucceed(() => false))

    if (nxExists) {
      return "nx" as const
    }

    // All other workspace types are considered "standalone"
    return "standalone" as const
  })

/**
 * Detect package manager (pnpm, yarn, or npm)
 *
 * Checks for lock files in this order:
 * 1. pnpm-lock.yaml -> pnpm
 * 2. yarn.lock -> yarn
 * 3. default -> npm
 */
const detectPackageManager = (fs: FileSystem.FileSystem, rootPath: string) =>
  Effect.gen(function*() {
    // Check for pnpm
    const pnpmExists = yield* fs
      .exists(`${rootPath}/pnpm-lock.yaml`)
      .pipe(Effect.orElseSucceed(() => false))
    if (pnpmExists) return "pnpm" as const

    // Check for Yarn
    const yarnExists = yield* fs
      .exists(`${rootPath}/yarn.lock`)
      .pipe(Effect.orElseSucceed(() => false))
    if (yarnExists) return "yarn" as const

    // Default to npm
    return "npm" as const
  })

/**
 * Extract scope from package.json name field
 *
 * Examples:
 * - "@custom-repo/monorepo-library-generator" -> "@custom-repo"
 * - "@myorg/lib" -> "@myorg"
 * - "no-scope" -> "@myorg" (default)
 */
const extractScope = (packageName?: string) => {
  if (!packageName) return "@myorg"
  if (packageName.startsWith("@")) {
    return packageName.split("/")[0] || "@myorg"
  }
  return "@myorg"
}

/**
 * Read package.json scope from workspace root
 */
const readScope = (fs: FileSystem.FileSystem, rootPath: string) =>
  Effect.gen(function*() {
    const pkgPath = `${rootPath}/package.json`
    const content = yield* fs
      .readFileString(pkgPath)
      .pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new WorkspaceDetectionError(`Could not read package.json at ${pkgPath}`, error)
          )
        )
      )

    const pkg = JSON.parse(content)
    return extractScope(pkg.name)
  })

/**
 * Check if a directory has any library type subdirectories
 *
 * Used to validate that a candidate libraries root actually contains
 * library type directories (contract, data-access, feature, etc.)
 */
const hasLibraryTypeSubdirs = (fs: FileSystem.FileSystem, dirPath: string) =>
  Effect.gen(function*() {
    for (const subdir of LIBRARY_TYPE_SUBDIRS) {
      const exists = yield* fs
        .exists(`${dirPath}/${subdir}`)
        .pipe(Effect.orElseSucceed(() => false))
      if (exists) return true
    }
    return false
  })

/**
 * Detect libraries root directory structure
 *
 * Scans workspace root to find where libraries are stored.
 * Priority order: packages/libs > libs > packages > src/libs
 *
 * Returns the relative path from workspace root to libraries directory.
 *
 * @example
 * // Workspace with packages/libs/contract/user
 * detectLibrariesRoot(fs, "/project") // Effect.succeed("packages/libs")
 *
 * // Workspace with libs/contract/user
 * detectLibrariesRoot(fs, "/project") // Effect.succeed("libs")
 *
 * // New workspace with nothing yet
 * detectLibrariesRoot(fs, "/project") // Effect.succeed("libs") (default)
 */
const detectLibrariesRoot = (fs: FileSystem.FileSystem, rootPath: string) =>
  Effect.gen(function*() {
    const candidates = ["packages/libs", "libs", "packages", "src/libs"]

    for (const candidate of candidates) {
      const candidatePath = `${rootPath}/${candidate}`
      const exists = yield* fs.exists(candidatePath).pipe(Effect.orElseSucceed(() => false))

      if (exists) {
        // Check if it has library type subdirectories
        const hasTypes = yield* hasLibraryTypeSubdirs(fs, candidatePath)
        if (hasTypes) return candidate
      }
    }

    // If no established structure found, check which candidate directory exists
    for (const candidate of candidates) {
      const exists = yield* fs
        .exists(`${rootPath}/${candidate}`)
        .pipe(Effect.orElseSucceed(() => false))
      if (exists) return candidate
    }

    // Default fallback for new projects
    return "libs"
  })

/**
 * Auto-detect complete workspace context
 *
 * Combines all detection utilities into single operation
 */
const detectWorkspaceContext = (startPath: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem

    // Find workspace root
    const rootPath = yield* findWorkspaceRoot(fs, startPath)

    // Detect workspace type
    const type = yield* detectWorkspaceType(fs, rootPath)

    // Read scope from package.json
    const scope = yield* readScope(fs, rootPath)

    // Detect package manager
    const packageManager = yield* detectPackageManager(fs, rootPath)

    // Detect libraries root directory
    const librariesRoot = yield* detectLibrariesRoot(fs, rootPath)

    return {
      root: rootPath,
      type,
      scope,
      packageManager,
      librariesRoot
    }
  }).pipe(Effect.provide(NodeFileSystem.layer))

// ============================================================================
// Public API
// ============================================================================

/**
 * Create unified workspace context from root path
 *
 * Auto-detects:
 * - Workspace root (by traversing up from startPath)
 * - Workspace type (nx vs standalone)
 * - Package scope (from package.json name)
 * - Package manager (from lock files)
 *
 * Used by all three interfaces (MCP, CLI, Nx) to ensure consistent workspace detection
 *
 * @param rootPath - Starting path for workspace detection (defaults to process.cwd())
 * @param interfaceType - Which interface is calling ("mcp", "cli", or "nx")
 * @returns Effect with complete WorkspaceContext
 *
 * @example
 * ```typescript
 * // MCP handler
 * const context = yield* createWorkspaceContext(args.workspaceRoot, "mcp")
 *
 * // CLI command
 * const context = yield* createWorkspaceContext(undefined, "cli")
 *
 * // Nx generator (receives tree.root)
 * const context = yield* createWorkspaceContext(tree.root, "nx")
 * ```
 */
export function createWorkspaceContext(rootPath: string | undefined, interfaceType: InterfaceType) {
  return Effect.gen(function*() {
    const startPath = rootPath ?? process.cwd()

    // Auto-detect workspace properties
    const detected = yield* detectWorkspaceContext(startPath)

    return {
      ...detected,
      interfaceType
    }
  })
}

/**
 * Create workspace context with explicit values (for testing)
 *
 * Bypasses auto-detection and uses provided values
 */
export function createWorkspaceContextExplicit(
  root: string,
  type: WorkspaceContext["type"],
  scope: string,
  packageManager: WorkspaceContext["packageManager"],
  interfaceType: InterfaceType,
  librariesRoot: string = "libs"
) {
  return {
    root,
    type,
    scope,
    packageManager,
    interfaceType,
    librariesRoot
  }
}
