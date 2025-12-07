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
  readonly includeVSCodeSettings?: boolean
  readonly overwrite?: boolean
  readonly merge?: boolean
}

/**
 * Add Effect.ts dotfiles to a generated library
 *
 * @param adapter - FileSystem adapter for Nx Tree or CLI
 * @param options - Dotfile generation options
 * @returns Effect with copy results
 */
export const addDotfilesToLibrary = (
  adapter: FileSystemAdapter,
  options: GeneratorDotfileOptions
) =>
  Effect.gen(function*() {
    const { includeVSCodeSettings = true, merge = true, overwrite = false, projectRoot } = options

    // Build options object based on includeVSCodeSettings
    // With exactOptionalPropertyTypes, we can't pass undefined - must omit the property
    const dotfileOptions = includeVSCodeSettings
      ? {
        targetDir: projectRoot,
        overwrite,
        merge
      }
      : {
        targetDir: projectRoot,
        overwrite,
        merge,
        include: [".editorconfig", "eslint.config.mjs", "tsconfig.json"] satisfies ReadonlyArray<DotfileName>
      }

    // Copy dotfiles with merge support
    const result = yield* copyAllDotfiles(adapter, dotfileOptions)

    yield* Effect.logInfo(
      `Added ${result.copied} dotfiles to ${projectRoot} (${result.merged} merged)`
    )

    return result
  })
