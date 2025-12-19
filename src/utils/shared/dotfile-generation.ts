/**
 * Dotfile generation utilities for Nx generators
 *
 * Integrates the dotfiles module with generator FileSystemAdapter
 */
import { Effect } from "effect"
import { copyAllDotfiles, type DotfileName } from "../dotfiles"
import type { FileSystemAdapter } from "../tree-adapter"

/**
 * Generator-specific dotfile options
 */
export interface GeneratorDotfileOptions {
  readonly projectRoot: string
  readonly overwrite?: boolean
  readonly merge?: boolean
}

/**
 * Add Effect.ts dotfiles to a generated library
 *
 * IMPORTANT: Only library-specific dotfiles are included:
 * - eslint.config.mjs: Library-level linting rules (extends workspace config)
 * - tsconfig.json: Library-level TypeScript config (extends workspace config)
 *
 * Workspace-level dotfiles (.editorconfig, .vscode/*) should NOT be added per-library.
 *
 * @param adapter - FileSystem adapter for Nx Tree or CLI
 * @param options - Dotfile generation options
 * @returns Effect with copy results
 */
const LIBRARY_DOTFILES: ReadonlyArray<DotfileName> = ["eslint.config.mjs", "tsconfig.json"]

export const addDotfilesToLibrary = (
  adapter: FileSystemAdapter,
  options: GeneratorDotfileOptions
) =>
  Effect.gen(function*() {
    const { merge = true, overwrite = false, projectRoot } = options

    // Only include library-specific dotfiles (exclude workspace-level files)
    const dotfileOptions = {
      targetDir: projectRoot,
      overwrite,
      merge,
      include: LIBRARY_DOTFILES
    }

    // Copy dotfiles with merge support
    const result = yield* copyAllDotfiles(adapter, dotfileOptions)

    yield* Effect.logInfo(
      `Added ${result.copied} library-specific dotfiles to ${projectRoot} (${result.merged} merged)`
    )

    return result
  })
