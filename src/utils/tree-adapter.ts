/**
 * Tree Adapter for Nx
 *
 * Wraps @nx/devkit Tree API to implement FileSystemAdapter interface.
 * This allows existing Nx generators to work with the abstraction layer
 * without any code changes.
 *
 * @module monorepo-library-generator/tree-adapter
 */

import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import * as fs from "node:fs"
import type { FileSystemAdapter } from "./filesystem-adapter"
import { DirectoryCreationError, FileReadError, FileSystemError, FileWriteError } from "./filesystem-adapter"

// Re-export FileSystemAdapter type for use in other modules
export type { FileSystemAdapter } from "./filesystem-adapter"

/**
 * Tree Adapter Implementation
 *
 * Wraps Nx Tree API and provides Effect-based interface
 */
export class TreeAdapter implements FileSystemAdapter {
  constructor(
    private readonly tree: Tree,
    private readonly mode: "nx" | "effect" = "nx"
  ) {}

  /**
   * Write a file using Tree API
   *
   * Tree.write automatically creates parent directories
   */
  writeFile(
    path: string,
    content: string
  ) {
    return Effect.try({
      try: () => {
        // Tree API expects paths relative to workspace root
        // Strip workspace root prefix if present
        const relativePath = this.toRelativePath(path)
        this.tree.write(relativePath, content)
      },
      catch: (error) =>
        new FileWriteError({
          path,
          content,
          cause: error
        })
    })
  }

  /**
   * Read a file using Tree API
   *
   * Tree.read returns Buffer | null
   *
   * Falls back to real filesystem if file not in virtual tree.
   * This allows tests to read template files (like dotfiles) that exist
   * on the real filesystem but not in the virtual test tree.
   */
  readFile(path: string) {
    return Effect.try({
      try: () => {
        const relativePath = this.toRelativePath(path)
        const content = this.tree.read(relativePath)

        if (content === null) {
          // Fallback: Try reading from real filesystem
          // This allows tests to work with template files outside virtual tree
          // (e.g., dotfile templates in src/dotfiles/)
          if (fs.existsSync(path)) {
            return fs.readFileSync(path, "utf-8")
          }

          throw new Error(`File not found: ${path}`)
        }

        // Convert Buffer to string
        return content.toString("utf-8")
      },
      catch: (error) =>
        new FileReadError({
          path,
          cause: error
        })
    })
  }

  /**
   * Check if a file exists using Tree API
   */
  exists(path: string) {
    return Effect.try({
      try: () => {
        const relativePath = this.toRelativePath(path)
        return this.tree.exists(relativePath)
      },
      catch: (error) =>
        new FileSystemError({
          message: `Failed to check existence of: ${path}`,
          path,
          cause: error
        })
    })
  }

  /**
   * Create a directory using Tree API
   *
   * Note: Tree API doesn't have explicit directory creation.
   * Directories are created implicitly when files are written.
   * This is a no-op for Tree API.
   */
  makeDirectory(path: string) {
    return Effect.try({
      try: () => {
        // Tree API creates directories implicitly when writing files
        // No explicit directory creation needed
      },
      catch: (error) =>
        new DirectoryCreationError({
          path,
          cause: error
        })
    })
  }

  /**
   * List directory contents using Tree API
   */
  listDirectory(
    path: string
  ) {
    return Effect.try({
      try: () => {
        const relativePath = this.toRelativePath(path)
        const children = this.tree.children(relativePath)
        const result: ReadonlyArray<string> = children
        return result
      },
      catch: (error) =>
        new FileSystemError({
          message: `Failed to list directory: ${path}`,
          path,
          cause: error
        })
    })
  }

  /**
   * Delete a file or directory using Tree API
   */
  remove(
    path: string
  ) {
    return Effect.try({
      try: () => {
        const relativePath = this.toRelativePath(path)
        this.tree.delete(relativePath)
      },
      catch: (error) =>
        new FileSystemError({
          message: `Failed to delete: ${path}`,
          path,
          cause: error
        })
    })
  }

  /**
   * Get workspace root from Tree
   */
  getWorkspaceRoot() {
    return this.tree.root
  }

  /**
   * Get mode (always 'nx' for TreeAdapter)
   */
  getMode() {
    return this.mode
  }

  /**
   * Convert absolute path to relative path for Tree API
   *
   * Tree API expects paths relative to workspace root.
   * If path starts with workspace root, strip it.
   */
  private toRelativePath(path: string) {
    const workspaceRoot = this.tree.root
    if (path.startsWith(workspaceRoot + "/")) {
      return path.slice(workspaceRoot.length + 1)
    }
    if (path.startsWith(workspaceRoot)) {
      return path.slice(workspaceRoot.length)
    }
    return path
  }
}

/**
 * Create a TreeAdapter from an Nx Tree
 *
 * @param tree - Nx Tree instance
 * @returns TreeAdapter instance
 */
export function createTreeAdapter(tree: Tree) {
  return new TreeAdapter(tree)
}
