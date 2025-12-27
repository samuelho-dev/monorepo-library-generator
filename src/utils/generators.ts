/**
 * Generator Utilities
 *
 * Shared utilities for all generator implementations.
 * Provides common functions for path calculation, tag parsing, and validation.
 *
 * @module monorepo-library-generator/generator-utils
 */

import type { Tree } from "@nx/devkit"
import type { LibraryType, PlatformType } from "./build"

/**
 * Calculate relative path from project root to workspace root
 *
 * Computes how many "../" segments are needed to traverse from the project
 * directory back to the workspace root.
 *
 * @param projectRoot - Relative path from workspace root to project (e.g., "libs/contract/user")
 * @returns Relative path back to workspace root (e.g., "../../../")
 *
 * @example
 * ```typescript
 * calculateOffsetFromRoot("libs/contract/user")  // Returns: "../../../"
 * calculateOffsetFromRoot("apps/web")            // Returns: "../../"
 * ```
 */
export function calculateOffsetFromRoot(projectRoot: string) {
  const depth = projectRoot.split("/").length
  return "../".repeat(depth)
}

/**
 * Create standardized tags for library types
 *
 * @param libraryType - Type of library (contract, data-access, feature, etc.)
 * @param platform - Platform type (universal, node, browser, edge)
 * @returns Array of standard tags
 *
 * @example
 * ```typescript
 * createStandardTags("contract", "universal")
 * // Returns: ["type:contract", "platform:universal"]
 * ```
 */
export function createStandardTags(libraryType: LibraryType, platform: PlatformType = "universal") {
  return [`type:${libraryType}`, `platform:${platform}`]
}

/**
 * Parse tags from comma-separated string with defaults
 *
 * Merges user-provided tags with default tags, removing duplicates.
 * Tags can be provided as:
 * - Comma-separated string: "tag1,tag2,tag3"
 * - With whitespace: "tag1, tag2, tag3"
 * - undefined (uses only defaults)
 *
 * @param tags - Comma-separated tag string or undefined
 * @param defaults - Default tags to always include
 * @returns Merged array of unique tags
 *
 * @example
 * ```typescript
 * parseTags("custom:tag1,custom:tag2", ["type:library", "scope:shared"])
 * // Returns: ["type:library", "scope:shared", "custom:tag1", "custom:tag2"]
 *
 * parseTags(undefined, ["type:library"])
 * // Returns: ["type:library"]
 * ```
 */
export function parseTags(tags: string | undefined, defaults: Array<string>) {
  if (!tags) return defaults

  const parsed = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  // Merge with defaults, removing duplicates
  return Array.from(new Set([...defaults, ...parsed]))
}

/**
 * Validate that a library does not already exist
 *
 * @param tree - Nx Tree instance
 * @param projectRoot - Project root path
 * @param projectName - Project name
 * @throws Error if library already exists
 */
export function validateLibraryDoesNotExist(tree: Tree, projectRoot: string, projectName: string) {
  if (tree.exists(projectRoot)) {
    throw new Error(`Library "${projectName}" already exists at ${projectRoot}`)
  }
}
