/**
 * Workspace Detection Utility
 *
 * Auto-detect workspace context (root, scope, type, package manager)
 * using Effect and @effect/platform.
 */

import { FileSystem } from "@effect/platform"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Effect } from "effect"
import * as path from "node:path"

// Workspace type constants for literal type inference
const WORKSPACE_TYPE_NX = "nx" as const
const WORKSPACE_TYPE_PNPM = "pnpm" as const
const WORKSPACE_TYPE_YARN = "yarn" as const
const WORKSPACE_TYPE_TURBOREPO = "turborepo" as const
const WORKSPACE_TYPE_UNKNOWN = "unknown" as const

// Package manager constants for literal type inference
const PKG_MANAGER_NPM = "npm" as const
const PKG_MANAGER_PNPM = "pnpm" as const
const PKG_MANAGER_YARN = "yarn" as const

export interface WorkspaceContext {
  readonly root: string
  readonly scope: string
  readonly type: "nx" | "pnpm" | "yarn" | "turborepo" | "unknown"
  readonly packageManager: "npm" | "pnpm" | "yarn"
}

/**
 * Workspace Detection Error
 */
export class WorkspaceDetectionError extends Error {
  readonly _tag = "WorkspaceDetectionError"

  constructor(message: string) {
    super(message)
    this.name = "WorkspaceDetectionError"
  }
}

/**
 * Auto-detect workspace context from a given path
 */
export const detectWorkspace = (startPath: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem

    // Find workspace root
    const rootPath = yield* findWorkspaceRoot(fs, startPath)

    // Read root package.json
    const pkgPath = `${rootPath}/package.json`
    const pkgContent = yield* fs.readFileString(pkgPath).pipe(
      Effect.catchAll(() =>
        Effect.fail(
          new WorkspaceDetectionError(`Could not read package.json at ${pkgPath}`)
        )
      )
    )

    const pkg = JSON.parse(pkgContent)

    // Extract scope from name
    const scope = extractScope(pkg.name)

    // Detect workspace type
    const type = yield* detectWorkspaceType(fs, rootPath)

    // Detect package manager
    const packageManager = yield* detectPackageManager(fs, rootPath)

    return {
      root: rootPath,
      scope,
      type,
      packageManager
    }
  }).pipe(Effect.provide(NodeFileSystem.layer))

/**
 * Find workspace root by traversing up directory tree
 */
const findWorkspaceRoot = (
  fs: FileSystem.FileSystem,
  startPath: string
) =>
  Effect.gen(function*() {
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
 */
const isWorkspaceRoot = (
  fs: FileSystem.FileSystem,
  path: string
) =>
  Effect.gen(function*() {
    // Check for workspace indicators
    const indicators = [
      "nx.json",
      "pnpm-workspace.yaml",
      "lerna.json",
      "turbo.json"
    ]

    for (const indicator of indicators) {
      const exists = yield* fs
        .exists(`${path}/${indicator}`)
        .pipe(Effect.catchAll(() => Effect.succeed(false)))
      if (exists) return true
    }

    // Check package.json for workspaces field
    const pkgPath = `${path}/package.json`
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
 * Detect workspace type (nx, pnpm, yarn, turborepo)
 */
const detectWorkspaceType = (
  fs: FileSystem.FileSystem,
  rootPath: string
) =>
  Effect.gen(function*() {
    // Check for Nx
    const nxExists = yield* fs
      .exists(`${rootPath}/nx.json`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (nxExists) return WORKSPACE_TYPE_NX

    // Check for pnpm
    const pnpmExists = yield* fs
      .exists(`${rootPath}/pnpm-workspace.yaml`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (pnpmExists) return WORKSPACE_TYPE_PNPM

    // Check for Turborepo
    const turboExists = yield* fs
      .exists(`${rootPath}/turbo.json`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (turboExists) return WORKSPACE_TYPE_TURBOREPO

    // Check for Yarn workspaces
    const pkgPath = `${rootPath}/package.json`
    const content = yield* fs
      .readFileString(pkgPath)
      .pipe(Effect.catchAll(() => Effect.succeed("{}")))
    const pkg = JSON.parse(content)
    if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
      return WORKSPACE_TYPE_YARN
    }

    return WORKSPACE_TYPE_UNKNOWN
  })

/**
 * Detect package manager (npm, pnpm, yarn)
 */
const detectPackageManager = (
  fs: FileSystem.FileSystem,
  rootPath: string
) =>
  Effect.gen(function*() {
    // Check for pnpm
    const pnpmExists = yield* fs
      .exists(`${rootPath}/pnpm-lock.yaml`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (pnpmExists) return PKG_MANAGER_PNPM

    // Check for Yarn
    const yarnExists = yield* fs
      .exists(`${rootPath}/yarn.lock`)
      .pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (yarnExists) return PKG_MANAGER_YARN

    // Default to npm
    return PKG_MANAGER_NPM
  })

/**
 * Extract scope from package name
 */
const extractScope = (packageName?: string) => {
  if (!packageName) return "@myorg"
  if (packageName.startsWith("@")) {
    return packageName.split("/")[0] || "@myorg"
  }
  return "@myorg"
}
