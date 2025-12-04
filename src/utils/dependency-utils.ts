/**
 * Dependency Utilities
 *
 * Shared utilities for computing library dependencies across generators.
 * Handles dependency validation, path computation, and TypeScript project references.
 *
 * @module monorepo-library-generator/dependency-utils
 */

import type { Tree } from "@nx/devkit"
import * as path from "path"
import { createNamingVariants } from "./naming-utils"
import type { LibraryType } from "./shared/types"

/**
 * Dependency information for TypeScript project references and package.json
 */
export interface DependencyInfo {
  readonly packageName: string
  readonly projectName: string
  readonly relativePath: string
  readonly relativeLibPath: string
  readonly description: string
}

/**
 * Options for computing dependencies
 */
export interface ComputeDependenciesOptions {
  readonly dependencyNames: Array<string>
  readonly libraryType: LibraryType
  readonly projectRoot: string
  readonly tree: Tree
}

/**
 * Get default directory for library type
 */
function getLibraryDirectory(libraryType: LibraryType) {
  const directories: Record<LibraryType, string> = {
    contract: "libs/contract",
    "data-access": "libs/data-access",
    feature: "libs/feature",
    provider: "libs/provider",
    infra: "libs/infra",
    util: "libs/util"
  }
  return directories[libraryType]
}

/**
 * Compute dependency information for TypeScript references and package.json
 *
 * Validates that dependencies exist, computes relative paths, and generates
 * package names for TypeScript project references.
 *
 * @param options - Dependency computation options
 * @returns Array of dependency information
 * @throws Error if a dependency doesn't exist
 *
 * @example
 * ```typescript
 * const dependencies = computeDependencies({
 *   dependencyNames: ['user', 'product'],
 *   libraryType: 'contract',
 *   projectRoot: 'libs/contract/order',
 *   tree,
 * });
 *
 * // Returns:
 * // [
 * //   {
 * //     packageName: '@custom-repo/contract-user',
 * //     projectName: 'contract-user',
 * //     relativePath: '../user',
 * //     relativeLibPath: '../user/tsconfig.lib.json',
 * //     description: 'contract dependency'
 * //   },
 * //   ...
 * // ]
 * ```
 */
export function computeDependencies(
  options: ComputeDependenciesOptions
) {
  const { dependencyNames, libraryType, projectRoot, tree } = options
  const libraryDirectory = getLibraryDirectory(libraryType)

  return dependencyNames.map((depName) => {
    const depFileName = createNamingVariants(depName).fileName
    const depProjectRoot = `${libraryDirectory}/${depFileName}`

    // Validate that the dependency exists
    if (!tree.exists(depProjectRoot)) {
      throw new Error(
        `${libraryType} dependency '${depName}' not found at ${depProjectRoot}. ` +
          `Please create it first using: pnpm exec nx g @workspace:${libraryType} ${depName}`
      )
    }

    // Compute relative paths from this project to the dependency
    const relativePath = path.relative(projectRoot, depProjectRoot)
    const relativeLibPath = path.join(relativePath, "tsconfig.lib.json")
    const projectName = `${libraryType}-${depFileName}`

    return {
      packageName: `@custom-repo/${projectName}`,
      projectName,
      relativePath,
      relativeLibPath,
      description: `${libraryType} dependency`
    }
  })
}

/**
 * Validate that a library dependency exists
 *
 * @param tree - Nx virtual file system tree
 * @param dependencyName - Name of the dependency
 * @param libraryType - Type of library to check for
 * @returns true if dependency exists, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateDependencyExists(tree, 'user', 'contract')) {
 *   throw new Error('Contract library "user" must be created first');
 * }
 * ```
 */
export function validateDependencyExists(
  tree: Tree,
  dependencyName: string,
  libraryType: LibraryType
) {
  const depFileName = createNamingVariants(dependencyName).fileName
  const libraryDirectory = getLibraryDirectory(libraryType)
  const depProjectRoot = `${libraryDirectory}/${depFileName}`

  return tree.exists(depProjectRoot)
}
