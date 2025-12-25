/**
 * File Batch Operations
 *
 * Provides utilities for batch file operations to reduce boilerplate
 * in generator code. Simplifies common patterns like writing multiple
 * files and creating directory structures.
 *
 * @module monorepo-library-generator/utils/file-batch
 *
 * @example
 * ```typescript
 * import { writeFilesBatch, createDirectories } from './file-batch';
 *
 * // Write multiple files in one call
 * yield* writeFilesBatch(adapter, [
 *   { path: 'src/index.ts', content: indexContent },
 *   { path: 'src/types.ts', content: typesContent, condition: includeTypes },
 * ]);
 *
 * // Create directory structure
 * yield* createDirectories(adapter, basePath, ['lib', 'lib/shared', 'lib/server']);
 * ```
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "./filesystem"
import type { LibraryType } from "./types"

// ============================================================================
// Types
// ============================================================================

/**
 * Specification for a file to write
 */
export interface FileSpec {
  /** Absolute or relative file path */
  readonly path: string

  /** File content - string or function that returns string (lazy evaluation) */
  readonly content: string | (() => string)

  /** Optional condition - if false, file is skipped (default: true) */
  readonly condition?: boolean
}

/**
 * Result of a batch file write operation
 */
export interface BatchWriteResult {
  /** Paths of successfully written files */
  readonly written: ReadonlyArray<string>

  /** Paths of skipped files (condition was false) */
  readonly skipped: ReadonlyArray<string>
}

/**
 * Options for batch write operations
 */
export interface BatchWriteOptions {
  /** If true, stop on first error. Default: false (continue on errors) */
  readonly failFast?: boolean
}

// ============================================================================
// File Batch Operations
// ============================================================================

/**
 * Write multiple files in a single operation
 *
 * Iterates through file specifications and writes each file that passes
 * its condition check. Supports lazy content evaluation for performance.
 *
 * @param adapter - FileSystem adapter
 * @param files - Array of file specifications
 * @param options - Optional configuration
 * @returns Effect yielding BatchWriteResult with written and skipped paths
 *
 * @example Basic usage
 * ```typescript
 * const result = yield* writeFilesBatch(adapter, [
 *   { path: 'src/index.ts', content: 'export * from "./lib";' },
 *   { path: 'src/types.ts', content: () => generateTypes() },
 * ]);
 * console.log(`Wrote ${result.written.length} files`);
 * ```
 *
 * @example With conditions
 * ```typescript
 * yield* writeFilesBatch(adapter, [
 *   { path: 'src/index.ts', content: indexContent },
 *   { path: 'src/rpc.ts', content: rpcContent, condition: options.includeRPC },
 *   { path: 'src/cqrs.ts', content: cqrsContent, condition: options.includeCQRS },
 * ]);
 * ```
 */
export function writeFilesBatch(
  adapter: FileSystemAdapter,
  files: ReadonlyArray<FileSpec>
) {
  return Effect.gen(function*() {
    const written: Array<string> = []
    const skipped: Array<string> = []

    for (const file of files) {
      // Check condition (default true)
      if (file.condition === false) {
        skipped.push(file.path)
        continue
      }

      // Evaluate content (support lazy evaluation)
      const content = typeof file.content === "function" ? file.content() : file.content

      // Write file
      yield* adapter.writeFile(file.path, content)
      written.push(file.path)
    }

    return { written, skipped }
  })
}

/**
 * Write files and return only the paths of written files
 *
 * Simplified version of writeFilesBatch that returns just the array of
 * written file paths. Useful when you don't need to track skipped files.
 *
 * @param adapter - FileSystem adapter
 * @param files - Array of file specifications
 * @returns Effect yielding array of written file paths
 *
 * @example
 * ```typescript
 * const files = yield* writeFiles(adapter, [
 *   { path: 'src/index.ts', content: indexContent },
 *   { path: 'src/types.ts', content: typesContent },
 * ]);
 * // files = ['src/index.ts', 'src/types.ts']
 * ```
 */
export function writeFiles(
  adapter: FileSystemAdapter,
  files: ReadonlyArray<FileSpec>
) {
  return writeFilesBatch(adapter, files).pipe(Effect.map((result) => result.written))
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Directory specification
 */
export interface DirectorySpec {
  /** Relative path from base directory */
  readonly path: string

  /** Optional condition - if false, directory is skipped (default: true) */
  readonly condition?: boolean
}

/**
 * Create multiple directories
 *
 * Creates directories in order. Skips directories where condition is false.
 * Uses recursive: true so parent directories are created automatically.
 *
 * @param adapter - FileSystem adapter
 * @param basePath - Base path to prepend to all directory paths
 * @param directories - Array of directory paths or DirectorySpec objects
 * @returns Effect yielding array of created directory paths
 *
 * @example Simple usage with strings
 * ```typescript
 * yield* createDirectories(adapter, '/workspace/libs/feature-user', [
 *   'lib',
 *   'lib/shared',
 *   'lib/server',
 *   'lib/server/service',
 * ]);
 * ```
 *
 * @example With conditions
 * ```typescript
 * yield* createDirectories(adapter, basePath, [
 *   { path: 'lib', condition: true },
 *   { path: 'lib/shared', condition: true },
 *   { path: 'lib/client', condition: options.includeClientServer },
 *   { path: 'lib/edge', condition: options.includeEdge },
 * ]);
 * ```
 */
export function createDirectories(
  adapter: FileSystemAdapter,
  basePath: string,
  directories: ReadonlyArray<string | DirectorySpec>
) {
  return Effect.gen(function*() {
    const created: Array<string> = []

    for (const dir of directories) {
      // Normalize to DirectorySpec
      const spec: DirectorySpec = typeof dir === "string" ? { path: dir } : dir

      // Check condition
      if (spec.condition === false) {
        continue
      }

      const fullPath = `${basePath}/${spec.path}`
      yield* adapter.makeDirectory(fullPath)
      created.push(fullPath)
    }

    return created
  })
}

// ============================================================================
// Library Directory Presets
// ============================================================================

/**
 * Library types that have directory structure presets
 * (excludes 'util' which uses a minimal structure)
 */
export type DirectoryPresetLibraryType = Exclude<LibraryType, "util">

/**
 * Directory structure presets for each library type
 *
 * These are the standard directories created for each library type.
 * Additional directories may be created based on feature flags.
 */
export const LIBRARY_DIRECTORIES: Record<DirectoryPresetLibraryType, ReadonlyArray<string>> = {
  contract: ["lib", "lib/types"],

  "data-access": [
    "lib",
    "lib/shared",
    "lib/server",
    "lib/repository",
    "lib/repository/operations"
  ],

  feature: [
    "lib",
    "lib/shared",
    "lib/server",
    "lib/server/service",
    "lib/server/events",
    "lib/server/jobs"
  ],

  infra: ["lib", "lib/service"],

  provider: ["lib", "lib/service"]
}

/**
 * Optional directories that are created based on feature flags
 */
export const OPTIONAL_DIRECTORIES: Record<
  DirectoryPresetLibraryType,
  Record<string, ReadonlyArray<string>>
> = {
  contract: {
    includeCQRS: ["lib/commands", "lib/queries", "lib/projections"],
    includeRPC: ["lib/rpc"],
    includeSubModules: ["lib/modules"]
  },

  "data-access": {
    includeCache: ["lib/cache"],
    includeSubModules: ["lib/modules"]
  },

  feature: {
    includeRPC: ["lib/rpc", "lib/rpc/external", "lib/rpc/internal"],
    includeClientServer: ["lib/client", "lib/client/hooks", "lib/client/atoms"],
    includeEdge: ["lib/edge"],
    includeCQRS: ["lib/server/cqrs", "lib/server/cqrs/commands", "lib/server/cqrs/queries"],
    includeSubModules: ["lib/modules"]
  },

  infra: {
    includeClientServer: ["lib/client", "lib/edge"]
  },

  provider: {}
}

/**
 * Create standard directory structure for a library type
 *
 * Creates the base directories for the specified library type, plus
 * any optional directories based on the provided feature flags.
 *
 * @param adapter - FileSystem adapter
 * @param basePath - Base path for the library
 * @param libraryType - Type of library (contract, data-access, feature, infra, provider)
 * @param options - Feature flags to determine optional directories
 * @returns Effect yielding array of created directory paths
 *
 * @example
 * ```typescript
 * yield* createLibraryDirectories(adapter, '/workspace/libs/feature-user', 'feature', {
 *   includeRPC: true,
 *   includeClientServer: true,
 *   includeCQRS: false,
 * });
 * ```
 */
export function createLibraryDirectories(
  adapter: FileSystemAdapter,
  basePath: string,
  libraryType: DirectoryPresetLibraryType,
  options?: Record<string, boolean>
) {
  return Effect.gen(function*() {
    // Get base directories for library type
    const baseDirectories = LIBRARY_DIRECTORIES[libraryType] ?? []

    // Get optional directories based on feature flags
    const optionalDirs = OPTIONAL_DIRECTORIES[libraryType] ?? {}
    const additionalDirectories: Array<string> = []

    if (options) {
      for (const [flag, dirs] of Object.entries(optionalDirs)) {
        if (options[flag]) {
          for (const dir of dirs) {
            additionalDirectories.push(dir)
          }
        }
      }
    }

    // Combine and create all directories
    const allDirectories = [...baseDirectories, ...additionalDirectories]
    return yield* createDirectories(adapter, basePath, allDirectories)
  })
}
