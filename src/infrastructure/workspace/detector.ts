/**
 * Workspace Detection Utilities
 *
 * Universal workspace detection for all interfaces (MCP, CLI, Nx)
 *
 * @module monorepo-library-generator/infrastructure/workspace/detector
 */

import { FileSystem } from "@effect/platform"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Effect } from "effect"
import * as path from "node:path"
import type { PackageManager, WorkspaceType } from "./types"
import { WorkspaceDetectionError } from "./types"

/**
 * Find workspace root by traversing up directory tree
 *
 * Looks for workspace indicators like package.json with workspaces field,
 * nx.json, pnpm-workspace.yaml, etc.
 */
export const findWorkspaceRoot = (
  fs: FileSystem.FileSystem,
  startPath: string
) =>
  Effect.gen(function* () {
    let currentPath = startPath
    const maxDepth = 10
    let depth = 0

    while (depth < maxDepth) {
      const pkgPath = `${currentPath}/package.json`
      const exists = yield* fs
        .exists(pkgPath)
        .pipe(Effect.catchAll(() => Effect.succeed(false)))

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
      new WorkspaceDetectionError(
        `Could not find workspace root from ${startPath}`
      )
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
export const isWorkspaceRoot = (
  fs: FileSystem.FileSystem,
  dirPath: string
) =>
  Effect.gen(function* () {
    // Check for workspace indicators
    const indicators = [
      "nx.json",
      "pnpm-workspace.yaml",
      "lerna.json",
      "turbo.json"
    ]

    for (const indicator of indicators) {
      const exists = yield* fs
        .exists(`${dirPath}/${indicator}`)
        .pipe(Effect.catchAll(() => Effect.succeed(false)))
      if (exists) return true
    }

    // Check package.json for workspaces field
    const pkgPath = `${dirPath}/package.json`
    const exists = yield* fs
      .exists(pkgPath)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))

    if (exists) {
      const content = yield* fs
        .readFileString(pkgPath)
        .pipe(Effect.catchAll(() => Effect.succeed("{}")))
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
export const detectWorkspaceType = (
  fs: FileSystem.FileSystem,
  rootPath: string
): Effect.Effect<WorkspaceType, WorkspaceDetectionError> =>
  Effect.gen(function* () {
    // Check for Nx
    const nxExists = yield* fs
      .exists(`${rootPath}/nx.json`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))

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
export const detectPackageManager = (
  fs: FileSystem.FileSystem,
  rootPath: string
): Effect.Effect<PackageManager, WorkspaceDetectionError> =>
  Effect.gen(function* () {
    // Check for pnpm
    const pnpmExists = yield* fs
      .exists(`${rootPath}/pnpm-lock.yaml`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (pnpmExists) return "pnpm" as const

    // Check for Yarn
    const yarnExists = yield* fs
      .exists(`${rootPath}/yarn.lock`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
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
export const extractScope = (packageName?: string): string => {
  if (!packageName) return "@myorg"
  if (packageName.startsWith("@")) {
    return packageName.split("/")[0] || "@myorg"
  }
  return "@myorg"
}

/**
 * Read package.json scope from workspace root
 */
export const readScope = (
  fs: FileSystem.FileSystem,
  rootPath: string
): Effect.Effect<string, WorkspaceDetectionError> =>
  Effect.gen(function* () {
    const pkgPath = `${rootPath}/package.json`
    const content = yield* fs.readFileString(pkgPath).pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new WorkspaceDetectionError(
            `Could not read package.json at ${pkgPath}`,
            error
          )
        )
      )
    )

    const pkg = JSON.parse(content)
    return extractScope(pkg.name)
  })

/**
 * Auto-detect complete workspace context
 *
 * Combines all detection utilities into single operation
 */
export const detectWorkspaceContext = (startPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // Find workspace root
    const rootPath = yield* findWorkspaceRoot(fs, startPath)

    // Detect workspace type
    const type = yield* detectWorkspaceType(fs, rootPath)

    // Read scope from package.json
    const scope = yield* readScope(fs, rootPath)

    // Detect package manager
    const packageManager = yield* detectPackageManager(fs, rootPath)

    return {
      root: rootPath,
      type,
      scope,
      packageManager
    }
  }).pipe(Effect.provide(NodeFileSystem.layer))
