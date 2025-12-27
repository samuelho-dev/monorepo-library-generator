/**
 * File System Abstraction Layer
 *
 * Provides unified file system operations that work with both:
 * - @nx/devkit Tree API (for Nx generators)
 * - @effect/platform FileSystem (for Effect CLI)
 *
 * This enables the same core logic to work in both Nx and Effect-native contexts.
 *
 * @module monorepo-library-generator/filesystem
 */

import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { FileSystem, Path } from '@effect/platform'
import { NodeFileSystem, NodePath } from '@effect/platform-node'
import type { Tree } from '@nx/devkit'
import { Context, Data, Effect } from 'effect'
import type { WorkspaceContext } from '../infrastructure'

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base file system error
 */
export class FileSystemError extends Data.TaggedError('FileSystemError')<{
  readonly message: string
  readonly path?: string
  readonly cause?: unknown
}> {}

/**
 * File not found error
 */
export class FileNotFoundError extends Data.TaggedError('FileNotFoundError')<{
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Directory creation error
 */
export class DirectoryCreationError extends Data.TaggedError('DirectoryCreationError')<{
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * File write error
 */
export class FileWriteError extends Data.TaggedError('FileWriteError')<{
  readonly path: string
  readonly content?: string
  readonly cause?: unknown
}> {}

/**
 * File read error
 */
export class FileReadError extends Data.TaggedError('FileReadError')<{
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Type alias for all possible file system errors
 */
export type FileSystemErrors =
  | FileSystemError
  | FileNotFoundError
  | DirectoryCreationError
  | FileWriteError
  | FileReadError

// ============================================================================
// FileSystemAdapter Interface
// ============================================================================

/**
 * File System Adapter Interface
 *
 * Provides common file system operations that work across
 * both Nx Tree API and Effect platform FileSystem.
 */
export interface FileSystemAdapter {
  /**
   * Write a file to the specified path
   *
   * Creates parent directories if they don't exist.
   *
   * @param path - Absolute or relative file path
   * @param content - File content
   * @returns Effect that succeeds with void or fails with FileWriteError
   */
  writeFile(
    path: string,
    content: string
  ): Effect.Effect<void, FileWriteError | DirectoryCreationError>

  /**
   * Read a file from the specified path
   *
   * @param path - Absolute or relative file path
   * @returns Effect that succeeds with file content or fails with FileReadError
   */
  readFile(path: string): Effect.Effect<string, FileReadError>

  /**
   * Check if a file or directory exists
   *
   * @param path - Absolute or relative path
   * @returns Effect that succeeds with boolean (true if exists)
   */
  exists(path: string): Effect.Effect<boolean, FileSystemError>

  /**
   * Create a directory (including parent directories)
   *
   * @param path - Absolute or relative directory path
   * @returns Effect that succeeds with void or fails with DirectoryCreationError
   */
  makeDirectory(path: string): Effect.Effect<void, DirectoryCreationError>

  /**
   * List contents of a directory
   *
   * @param path - Absolute or relative directory path
   * @returns Effect that succeeds with array of file/directory names
   */
  listDirectory(path: string): Effect.Effect<ReadonlyArray<string>, FileSystemError>

  /**
   * Delete a file or directory
   *
   * @param path - Absolute or relative path
   * @param recursive - If true, delete directories recursively
   * @returns Effect that succeeds with void or fails with FileSystemError
   */
  remove(path: string, options?: { recursive?: boolean }): Effect.Effect<void, FileSystemError>

  /**
   * Get the root directory of the workspace
   *
   * @returns Workspace root path
   */
  getWorkspaceRoot(): string

  /**
   * Check if running in Nx mode or Effect mode
   *
   * @returns 'nx' or 'effect'
   */
  getMode(): 'nx' | 'effect'
}

/**
 * FileSystemService context tag for dependency injection
 */
export class FileSystemService extends Context.Tag('FileSystemService')<
  FileSystemService,
  FileSystemAdapter
>() {}

// ============================================================================
// Effect FileSystem Adapter Implementation
// ============================================================================

/**
 * Effect FileSystem Adapter Implementation
 *
 * Implements FileSystemAdapter by wrapping pre-provided @effect/platform services.
 * Services (FileSystem, Path) are bound at construction time.
 */
class EffectFsAdapterImpl implements FileSystemAdapter {
  constructor(
    private readonly workspaceRoot: string,
    private readonly fs: FileSystem.FileSystem,
    private readonly pathService: Path.Path,
    private readonly mode: 'nx' | 'effect' = 'effect'
  ) {}

  /**
   * Write a file using @effect/platform FileSystem
   *
   * Creates parent directories if they don't exist
   */
  writeFile(path: string, content: string) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    // Create parent directory
    const parentDir = this.pathService.dirname(absolutePath)
    const createDir = this.fs.makeDirectory(parentDir, { recursive: true }).pipe(
      Effect.mapError(
        (error) =>
          new DirectoryCreationError({
            path: parentDir,
            cause: error
          })
      )
    )

    // Write file
    const writeFile = this.fs.writeFileString(absolutePath, content).pipe(
      Effect.mapError(
        (error) =>
          new FileWriteError({
            path: absolutePath,
            content,
            cause: error
          })
      )
    )

    return Effect.gen(function* () {
      yield* createDir
      yield* writeFile
    })
  }

  /**
   * Read a file using @effect/platform FileSystem
   */
  readFile(path: string) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    return this.fs.readFileString(absolutePath).pipe(
      Effect.mapError(
        (error) =>
          new FileReadError({
            path: absolutePath,
            cause: error
          })
      )
    )
  }

  /**
   * Check if a file exists using @effect/platform FileSystem
   */
  exists(path: string) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    return this.fs.exists(absolutePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to check existence of: ${absolutePath}`,
            path: absolutePath,
            cause: error
          })
      )
    )
  }

  /**
   * Create a directory using @effect/platform FileSystem
   */
  makeDirectory(path: string) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    return this.fs.makeDirectory(absolutePath, { recursive: true }).pipe(
      Effect.mapError(
        (error) =>
          new DirectoryCreationError({
            path: absolutePath,
            cause: error
          })
      )
    )
  }

  /**
   * List directory contents using @effect/platform FileSystem
   */
  listDirectory(path: string) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    return this.fs.readDirectory(absolutePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to list directory: ${absolutePath}`,
            path: absolutePath,
            cause: error
          })
      )
    )
  }

  /**
   * Delete a file or directory using @effect/platform FileSystem
   */
  remove(path: string, options?: { recursive?: boolean }) {
    const absolutePath = this.pathService.isAbsolute(path) ? path : this.pathService.resolve(path)

    return this.fs.remove(absolutePath, { recursive: options?.recursive ?? false }).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to delete: ${absolutePath}`,
            path: absolutePath,
            cause: error
          })
      )
    )
  }

  /**
   * Get workspace root
   */
  getWorkspaceRoot() {
    return this.workspaceRoot
  }

  /**
   * Get mode (always 'effect' for EffectFsAdapter)
   */
  getMode() {
    return this.mode
  }
}

/**
 * Create an EffectFsAdapter for the current workspace
 *
 * This function returns an Effect that, when run, provides a FileSystemAdapter
 * with all required services pre-bound.
 *
 * @param workspaceRoot - Workspace root directory path
 * @returns Effect that provides FileSystemAdapter
 */
export function createEffectFsAdapter(workspaceRoot: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path

    return new EffectFsAdapterImpl(workspaceRoot, fs, pathService)
  })
}

// ============================================================================
// MCP FileSystem Adapter Implementation
// ============================================================================

class MCPFileSystemAdapter implements FileSystemAdapter {
  constructor(private readonly workspaceRoot: string) {}

  writeFile(path: string, content: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const dir = nodePath.dirname(path)

      yield* fs.makeDirectory(dir, { recursive: true }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DirectoryCreationError({
              path: dir,
              cause: error
            })
          )
        )
      )

      yield* fs.writeFileString(path, content).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FileWriteError({
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
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.readFileString(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FileReadError({
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  exists(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.exists(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FileSystemError({
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
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(path, { recursive: true }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new DirectoryCreationError({
              path,
              cause: error
            })
          )
        )
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))
  }

  listDirectory(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      return yield* fs.readDirectory(path).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FileSystemError({
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
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      yield* fs.remove(path, options).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new FileSystemError({
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
    return 'effect' as const
  }
}

export function createMCPAdapter(workspaceRoot: string) {
  return new MCPFileSystemAdapter(workspaceRoot)
}

// ============================================================================
// Tree Adapter Implementation (for Nx)
// ============================================================================

/**
 * Tree Adapter Implementation
 *
 * Wraps Nx Tree API and provides Effect-based interface
 */
export class TreeAdapter implements FileSystemAdapter {
  constructor(
    private readonly tree: Tree,
    private readonly mode: 'nx' | 'effect' = 'nx'
  ) {}

  /**
   * Write a file using Tree API
   *
   * Tree.write automatically creates parent directories
   */
  writeFile(path: string, content: string) {
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
          if (nodeFs.existsSync(path)) {
            return nodeFs.readFileSync(path, 'utf-8')
          }

          throw new Error(`File not found: ${path}`)
        }

        // Convert Buffer to string
        return content.toString('utf-8')
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
  listDirectory(path: string) {
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
  remove(path: string) {
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
    if (path.startsWith(`${workspaceRoot}/`)) {
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

// ============================================================================
// Adapter Factory
// ============================================================================

export interface AdapterOptions {
  readonly context: WorkspaceContext
  readonly nxTree?: Tree
}

export function createAdapter(options: AdapterOptions) {
  const { context, nxTree } = options

  return Effect.gen(function* () {
    switch (context.interfaceType) {
      case 'nx': {
        if (!nxTree) {
          return yield* Effect.fail(
            new FileSystemError({
              message: 'Nx Tree required for Nx interface but not provided',
              path: context.root
            })
          )
        }
        return createTreeAdapter(nxTree)
      }

      case 'cli': {
        return yield* createEffectFsAdapter(context.root)
      }

      case 'mcp': {
        return createMCPAdapter(context.root)
      }

      default: {
        const _exhaustive: never = context.interfaceType
        return yield* Effect.fail(
          new FileSystemError({
            message: `Unknown interface type: ${_exhaustive}`,
            path: context.root
          })
        )
      }
    }
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer))
}

export function createAdapterFromContext(context: WorkspaceContext, nxTree?: Tree) {
  return createAdapter({ context, nxTree })
}

// ============================================================================
// Environment Variable Injection Utilities
// ============================================================================

/**
 * Environment variable to inject into libs/env/src/env.ts
 */
export interface EnvVarToInject {
  readonly name: string
  readonly type: 'string' | 'number' | 'redacted'
  readonly context?: 'server' | 'client' | 'shared'
}

/**
 * Inject environment variables into libs/env/src/env.ts
 *
 * This function modifies the env.ts file to add new environment variables
 * to the appropriate section (server, client, or shared).
 *
 * @param adapter - FileSystem adapter for Nx Tree or CLI
 * @param vars - Array of environment variables to inject
 * @returns Effect that succeeds with void or fails with file system errors
 */
export function injectEnvVars(adapter: FileSystemAdapter, vars: ReadonlyArray<EnvVarToInject>) {
  return Effect.gen(function* () {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const envFilePath = `${workspaceRoot}/libs/env/src/env.ts`

    // Check if env file exists
    const envFileExists = yield* adapter.exists(envFilePath)
    if (!envFileExists) {
      yield* Effect.logWarning(
        `libs/env/src/env.ts not found. Environment variables not injected: ${vars.map((v) => v.name).join(', ')}`
      )
      return
    }

    // Read current content
    const content = yield* adapter.readFile(envFilePath)

    // Group vars by context
    const serverVars = vars.filter((v) => v.context === 'server' || !v.context)
    const clientVars = vars.filter((v) => v.context === 'client')
    const sharedVars = vars.filter((v) => v.context === 'shared')

    let updatedContent = content

    // Helper to create config line
    const makeConfigLine = (v: EnvVarToInject) => {
      switch (v.type) {
        case 'redacted':
          return `    ${v.name}: Config.redacted("${v.name}"),`
        case 'number':
          return `    ${v.name}: Config.number("${v.name}"),`
        default:
          return `    ${v.name}: Config.string("${v.name}"),`
      }
    }

    // Inject server vars
    if (serverVars.length > 0) {
      for (const v of serverVars) {
        // Check if var already exists
        if (updatedContent.includes(`${v.name}:`)) {
          continue
        }

        // Find the closing brace of the server section
        const serverMatch = updatedContent.match(/server:\s*\{([^}]*)\}/s)
        if (serverMatch) {
          const serverSection = serverMatch[0]
          const closingBrace = serverSection.lastIndexOf('}')
          const beforeBrace = serverSection.slice(0, closingBrace)
          const afterBrace = serverSection.slice(closingBrace)

          // Trim trailing whitespace and ensure no double comma
          const trimmed = beforeBrace.trimEnd()
          const withComma = trimmed.endsWith(',') ? trimmed : `${trimmed},`
          const newServerSection = `${withComma}\n${makeConfigLine(v)}\n  ${afterBrace}`

          updatedContent = updatedContent.replace(serverSection, newServerSection)
        }
      }
    }

    // Inject client vars
    if (clientVars.length > 0) {
      for (const v of clientVars) {
        if (updatedContent.includes(`${v.name}:`)) {
          continue
        }

        const clientMatch = updatedContent.match(/client:\s*\{([^}]*)\}/s)
        if (clientMatch) {
          const clientSection = clientMatch[0]
          const closingBrace = clientSection.lastIndexOf('}')
          const beforeBrace = clientSection.slice(0, closingBrace)
          const afterBrace = clientSection.slice(closingBrace)

          const trimmed = beforeBrace.trimEnd()
          const withComma = trimmed.endsWith(',') ? trimmed : `${trimmed},`
          const newClientSection = `${withComma}\n${makeConfigLine(v)}\n  ${afterBrace}`

          updatedContent = updatedContent.replace(clientSection, newClientSection)
        }
      }
    }

    // Inject shared vars
    if (sharedVars.length > 0) {
      for (const v of sharedVars) {
        if (updatedContent.includes(`${v.name}:`)) {
          continue
        }

        const sharedMatch = updatedContent.match(/shared:\s*\{([^}]*)\}/s)
        if (sharedMatch) {
          const sharedSection = sharedMatch[0]
          const closingBrace = sharedSection.lastIndexOf('}')
          const beforeBrace = sharedSection.slice(0, closingBrace)
          const afterBrace = sharedSection.slice(closingBrace)

          const trimmed = beforeBrace.trimEnd()
          const withComma = trimmed.endsWith(',') ? trimmed : `${trimmed},`
          const newSharedSection = `${withComma}\n${makeConfigLine(v)}\n  ${afterBrace}`

          updatedContent = updatedContent.replace(sharedSection, newSharedSection)
        }
      }
    }

    // Write updated content if changed
    if (updatedContent !== content) {
      yield* adapter.writeFile(envFilePath, updatedContent)
      yield* Effect.logInfo(
        `Injected environment variables into libs/env/src/env.ts: ${vars.map((v) => v.name).join(', ')}`
      )
    }
  })
}
