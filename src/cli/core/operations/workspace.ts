/**
 * Workspace Operations
 *
 * Workspace detection and context building.
 *
 * @module monorepo-library-generator/cli/core/operations/workspace
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import * as FileSystem from '@effect/platform/FileSystem'
import * as Path from '@effect/platform/Path'
import { Effect, Option } from 'effect'

import type { WorkspaceContext, WorkspaceType } from '../types'

/**
 * Detect workspace type from available config files
 */
export function detectWorkspaceType(
  hasNxJson: boolean,
  hasPnpmWorkspace: boolean,
  hasYarnWorkspaces: boolean
): WorkspaceType {
  if (hasNxJson) return 'nx'
  if (hasPnpmWorkspace) return 'pnpm'
  if (hasYarnWorkspaces) return 'yarn'
  return 'npm'
}

/**
 * Check if a file exists
 */
function fileExists(path: string) {
  return Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    return yield* Effect.either(fs.exists(path)).pipe(
      Effect.map((either) => (either._tag === 'Right' ? either.right : false))
    )
  })
}

/**
 * Read JSON file safely
 */
function readJsonFile(path: string) {
  return Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const content = yield* Effect.either(fs.readFileString(path))
    if (content._tag === 'Left') return Option.none()

    try {
      return Option.some(JSON.parse(content.right))
    } catch {
      return Option.none()
    }
  })
}

/**
 * Get libraries root from Nx configuration or defaults
 */
function getLibrariesRoot(nxJson: Option.Option<Record<string, unknown>>): string {
  if (Option.isSome(nxJson)) {
    const config = nxJson.value
    // Check workspaceLayout.libsDir
    const layout = config.workspaceLayout as Record<string, string> | undefined
    if (layout?.libsDir) {
      return layout.libsDir
    }
  }
  // Default to 'libs'
  return 'libs'
}

/**
 * Extract scope from package.json name
 */
function getScopeFromPackageJson(packageJson: Option.Option<Record<string, unknown>>): string {
  if (Option.isSome(packageJson)) {
    const name = packageJson.value.name as string | undefined
    if (name?.startsWith('@')) {
      const scopeMatch = name.match(/^(@[^/]+)/)
      if (scopeMatch) return scopeMatch[1]
    }
  }
  return '@scope'
}

/**
 * Detect workspace context from current directory
 */
export function detectWorkspace(rootPath: string) {
  return Effect.gen(function*() {
    const pathService = yield* Path.Path

    // Check for configuration files
    const nxJsonPath = pathService.join(rootPath, 'nx.json')
    const pnpmWorkspacePath = pathService.join(rootPath, 'pnpm-workspace.yaml')
    const packageJsonPath = pathService.join(rootPath, 'package.json')

    const hasNxJson = yield* fileExists(nxJsonPath)
    const hasPnpmWorkspace = yield* fileExists(pnpmWorkspacePath)

    // Read config files for additional info
    const nxJson = hasNxJson ? yield* readJsonFile(nxJsonPath) : Option.none()
    const packageJson = yield* readJsonFile(packageJsonPath)

    // Check for yarn workspaces in package.json
    const hasYarnWorkspaces = Option.isSome(packageJson) && 'workspaces' in packageJson.value

    const workspaceType = detectWorkspaceType(hasNxJson, hasPnpmWorkspace, hasYarnWorkspaces)
    const librariesRoot = getLibrariesRoot(nxJson)
    const scope = getScopeFromPackageJson(packageJson)

    const context: WorkspaceContext = {
      type: workspaceType,
      isNx: hasNxJson,
      librariesRoot,
      scope,
      root: rootPath
    }

    return context
  })
}

/**
 * Synchronous workspace detection for immediate use
 * Uses basic file system checks without Effect runtime
 */
export function detectWorkspaceSync(rootPath: string): WorkspaceContext {
  const nxJsonPath = path.join(rootPath, 'nx.json')
  const pnpmWorkspacePath = path.join(rootPath, 'pnpm-workspace.yaml')
  const packageJsonPath = path.join(rootPath, 'package.json')

  const hasNxJson = fs.existsSync(nxJsonPath)
  const hasPnpmWorkspace = fs.existsSync(pnpmWorkspacePath)

  // Read package.json for scope
  let scope = '@scope'
  let hasYarnWorkspaces = false

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const name = packageJson.name as string | undefined
    if (name?.startsWith('@')) {
      const scopeMatch = name.match(/^(@[^/]+)/)
      if (scopeMatch) scope = scopeMatch[1]
    }
    hasYarnWorkspaces = 'workspaces' in packageJson
  } catch {
    // Ignore errors
  }

  // Read nx.json for libraries root
  let librariesRoot = 'libs'
  if (hasNxJson) {
    try {
      const nxJson = JSON.parse(fs.readFileSync(nxJsonPath, 'utf-8'))
      if (nxJson.workspaceLayout?.libsDir) {
        librariesRoot = nxJson.workspaceLayout.libsDir
      }
    } catch {
      // Ignore errors
    }
  }

  const workspaceType = detectWorkspaceType(hasNxJson, hasPnpmWorkspace, hasYarnWorkspaces)

  return {
    type: workspaceType,
    isNx: hasNxJson,
    librariesRoot,
    scope,
    root: rootPath
  }
}
