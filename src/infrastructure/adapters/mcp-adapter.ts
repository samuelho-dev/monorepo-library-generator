/**
 * MCP FileSystem Adapter
 *
 * Wraps @effect/platform-node/FileSystem for direct disk I/O in MCP server context.
 * This allows MCP handlers to work with the unified adapter layer.
 *
 * @module monorepo-library-generator/infrastructure/adapters/mcp-adapter
 */

import { FileSystem } from "@effect/platform"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Effect } from "effect"
import * as Path from "path"
import type { FileSystemAdapter } from "./filesystem"
import {
  DirectoryCreationError as DirError,
  FileReadError as ReadError,
  FileSystemError as FSError,
  FileWriteError as WriteError
} from "./filesystem"

// Mode constant for literal type inference
const ADAPTER_MODE_EFFECT = "effect" as const

/**
 * MCP FileSystem Adapter
 *
 * Implements FileSystemAdapter using @effect/platform-node/FileSystem
 * for direct disk I/O (non-Nx mode)
 */
export class MCPFileSystemAdapter implements FileSystemAdapter {
  constructor(private readonly workspaceRoot: string) {}

  writeFile(path: string, content: string) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      // Ensure parent directory exists
      const dir = Path.dirname(path)
      yield* fs.makeDirectory(dir, { recursive: true }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DirError({
              path: dir,
              cause: error
            })
          )
        )
      )

      // Write file
      yield* fs.writeFileString(path, content).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new WriteError({
              path,
              content,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  readFile(path: string) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.readFileString(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new ReadError({
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  exists(path: string) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.exists(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FSError({
              message: `Failed to check if path exists: ${path}`,
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  makeDirectory(path: string) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(path, { recursive: true }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DirError({
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  listDirectory(path: string) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.readDirectory(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FSError({
              message: `Failed to list directory: ${path}`,
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  remove(path: string, options?: { recursive?: boolean }) {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      yield* fs.remove(path, options).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FSError({
              message: `Failed to remove: ${path}`,
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  getWorkspaceRoot() {
    return this.workspaceRoot
  }

  getMode() {
    return ADAPTER_MODE_EFFECT
  }
}

/**
 * Create an MCP filesystem adapter
 *
 * @param workspaceRoot - Workspace root directory path
 * @returns MCP FileSystemAdapter instance
 */
export const createMCPAdapter = (workspaceRoot: string) => new MCPFileSystemAdapter(workspaceRoot)
