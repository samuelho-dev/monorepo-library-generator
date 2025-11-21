/**
 * Effect FileSystem Adapter
 *
 * Wraps @effect/platform FileSystem to implement FileSystemAdapter interface.
 * This allows the CLI to work directly with the file system in Effect-native mode.
 *
 * @module monorepo-library-generator/effect-fs-adapter
 */

import { FileSystem, Path } from '@effect/platform';
import { Effect } from 'effect';
import type { FileSystemAdapter } from './filesystem-adapter';
import {
  DirectoryCreationError,
  FileReadError,
  FileSystemError,
  FileWriteError,
} from './filesystem-adapter';

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
    private readonly mode: 'nx' | 'effect' = 'effect',
  ) {}

  /**
   * Write a file using @effect/platform FileSystem
   *
   * Creates parent directories if they don't exist
   */
  writeFile(path: string, content: string): Effect.Effect<void, FileWriteError | DirectoryCreationError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    // Create parent directory
    const parentDir = this.pathService.dirname(absolutePath);
    const createDir = this.fs.makeDirectory(parentDir, { recursive: true }).pipe(
      Effect.mapError((error) =>
        new DirectoryCreationError({
          path: parentDir,
          cause: error,
        }),
      ),
    );

    // Write file
    const writeFile = this.fs.writeFileString(absolutePath, content).pipe(
      Effect.mapError((error) =>
        new FileWriteError({
          path: absolutePath,
          content,
          cause: error,
        }),
      ),
    );

    return Effect.gen(function* () {
      yield* createDir;
      yield* writeFile;
    });
  }

  /**
   * Read a file using @effect/platform FileSystem
   */
  readFile(path: string): Effect.Effect<string, FileReadError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    return this.fs.readFileString(absolutePath).pipe(
      Effect.mapError((error) =>
        new FileReadError({
          path: absolutePath,
          cause: error,
        }),
      ),
    );
  }

  /**
   * Check if a file exists using @effect/platform FileSystem
   */
  exists(path: string): Effect.Effect<boolean, FileSystemError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    return this.fs.exists(absolutePath).pipe(
      Effect.mapError((error) =>
        new FileSystemError({
          message: `Failed to check existence of: ${absolutePath}`,
          path: absolutePath,
          cause: error,
        }),
      ),
    );
  }

  /**
   * Create a directory using @effect/platform FileSystem
   */
  makeDirectory(path: string): Effect.Effect<void, DirectoryCreationError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    return this.fs.makeDirectory(absolutePath, { recursive: true }).pipe(
      Effect.mapError((error) =>
        new DirectoryCreationError({
          path: absolutePath,
          cause: error,
        }),
      ),
    );
  }

  /**
   * List directory contents using @effect/platform FileSystem
   */
  listDirectory(path: string): Effect.Effect<readonly string[], FileSystemError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    return this.fs.readDirectory(absolutePath).pipe(
      Effect.mapError((error) =>
        new FileSystemError({
          message: `Failed to list directory: ${absolutePath}`,
          path: absolutePath,
          cause: error,
        }),
      ),
    );
  }

  /**
   * Delete a file or directory using @effect/platform FileSystem
   */
  remove(path: string, options?: { recursive?: boolean }): Effect.Effect<void, FileSystemError> {
    const absolutePath = this.pathService.isAbsolute(path)
      ? path
      : this.pathService.resolve(path);

    return this.fs.remove(absolutePath, { recursive: options?.recursive ?? false }).pipe(
      Effect.mapError((error) =>
        new FileSystemError({
          message: `Failed to delete: ${absolutePath}`,
          path: absolutePath,
          cause: error,
        }),
      ),
    );
  }

  /**
   * Get workspace root
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Get mode (always 'effect' for EffectFsAdapter)
   */
  getMode(): 'nx' | 'effect' {
    return this.mode;
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
export function createEffectFsAdapter(
  workspaceRoot: string
): Effect.Effect<FileSystemAdapter, never, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;

    return new EffectFsAdapterImpl(workspaceRoot, fs, pathService);
  });
}
