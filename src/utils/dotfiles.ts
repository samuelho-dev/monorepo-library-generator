/**
 * Dotfile Management for Effect.ts Code Quality Enforcement
 *
 * This module handles copying and managing dotfiles that enforce
 * Effect.ts code style guidelines across generated libraries.
 *
 * @module utils/dotfiles
 */

import { Effect } from "effect"
import * as path from "node:path"
import { mergeDotfileContent } from "./dotfile-merge"
import { type FileSystemAdapter, FileSystemError } from "./filesystem-adapter"

/**
 * Dotfile configuration options
 */
export interface DotfileOptions {
  /**
   * Target directory where dotfiles will be copied
   */
  readonly targetDir: string

  /**
   * Whether to overwrite existing dotfiles
   * @default false
   */
  readonly overwrite?: boolean

  /**
   * Whether to merge with existing dotfiles
   * @default true
   */
  readonly merge?: boolean

  /**
   * Specific dotfiles to include
   * If not specified, all dotfiles are included
   */
  readonly include?: ReadonlyArray<DotfileName>

  /**
   * Dotfiles to exclude
   */
  readonly exclude?: ReadonlyArray<DotfileName>
}

/**
 * Available dotfile names
 */
export type DotfileName =
  | ".editorconfig"
  | "eslint.config.mjs"
  | "tsconfig.json"
  | ".vscode/settings.json"
  | ".vscode/extensions.json"

/**
 * Dotfile metadata
 */
export interface DotfileMetadata {
  readonly name: DotfileName
  readonly templatePath: string
  readonly targetPath: string
  readonly description: string
  readonly required: boolean
}

/**
 * Get the path to a dotfile template
 */
export const getDotfileTemplatePath = (name: DotfileName) => {
  const templateMap: Record<DotfileName, string> = {
    ".editorconfig": ".editorconfig.template",
    "eslint.config.mjs": "eslint.config.template.mjs",
    "tsconfig.json": "tsconfig.template.json",
    ".vscode/settings.json": ".vscode-settings.template.json",
    ".vscode/extensions.json": ".vscode-extensions.template.json"
  }

  const templateFile = templateMap[name]
  return path.join(__dirname, "../dotfiles", templateFile)
}

/**
 * Get metadata for all available dotfiles
 */
export const getAllDotfiles = () =>
  [
    {
      name: ".editorconfig",
      templatePath: getDotfileTemplatePath(".editorconfig"),
      targetPath: ".editorconfig",
      description: "Editor configuration for consistent formatting across IDEs",
      required: true
    },
    {
      name: "eslint.config.mjs",
      templatePath: getDotfileTemplatePath("eslint.config.mjs"),
      targetPath: "eslint.config.mjs",
      description: "ESLint configuration with Effect.ts code style rules",
      required: true
    },
    {
      name: "tsconfig.json",
      templatePath: getDotfileTemplatePath("tsconfig.json"),
      targetPath: "tsconfig.json",
      description: "TypeScript configuration with strict type checking for Effect.ts",
      required: true
    },
    {
      name: ".vscode/settings.json",
      templatePath: getDotfileTemplatePath(".vscode/settings.json"),
      targetPath: ".vscode/settings.json",
      description: "VSCode settings optimized for Effect.ts development",
      required: false
    },
    {
      name: ".vscode/extensions.json",
      templatePath: getDotfileTemplatePath(".vscode/extensions.json"),
      targetPath: ".vscode/extensions.json",
      description: "Recommended VSCode extensions for Effect.ts projects",
      required: false
    }
  ] satisfies Array<DotfileMetadata>

/**
 * Copy a single dotfile to the target directory with merge support
 */
export const copyDotfile = (
  fs: FileSystemAdapter,
  dotfile: DotfileMetadata,
  targetDir: string,
  overwrite = false,
  merge = true
) =>
  Effect.gen(function*() {
    const targetPath = path.join(targetDir, dotfile.targetPath)

    // Read Effect.ts template content
    const templateContent = yield* fs.readFile(dotfile.templatePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to read dotfile template: ${dotfile.templatePath}`,
            path: dotfile.templatePath,
            cause: error
          })
      )
    )

    // Check if file exists
    const exists = yield* fs.exists(targetPath)
    let finalContent = templateContent
    let wasMerged = false

    if (exists && merge) {
      // MERGE PATH: Read user config and merge with Effect.ts template
      yield* Effect.logInfo(`Merging ${dotfile.name} with existing configuration`)

      const userContent = yield* fs.readFile(targetPath).pipe(
        Effect.mapError(
          (error) =>
            new FileSystemError({
              message: `Failed to read existing file: ${targetPath}`,
              path: targetPath,
              cause: error
            })
        )
      )

      const mergeResult = yield* mergeDotfileContent(
        dotfile.name,
        userContent,
        templateContent
      ).pipe(
        // Graceful fallback on merge error
        Effect.catchAll((error: any) =>
          Effect.gen(function*() {
            yield* Effect.logWarning(
              `Failed to merge ${dotfile.name}: ${error.message}. Using Effect.ts template.`
            )
            return {
              merged: templateContent,
              strategy: "override",
              hadExisting: true,
              effectRulesApplied: 0
            }
          })
        )
      )

      finalContent = mergeResult.merged
      wasMerged = true

      yield* Effect.logInfo(
        `✓ Merged ${dotfile.name} (${mergeResult.effectRulesApplied} Effect.ts rules applied)`
      )
    } else if (exists && !merge && !overwrite) {
      // SKIP PATH: File exists, no merge, no overwrite
      yield* Effect.logWarning(
        `Skipping ${dotfile.name} - file already exists (use overwrite: true or merge: true)`
      )
      return { copied: false, path: targetPath, reason: "already-exists", merged: false }
    }

    // Ensure target directory exists
    const targetDirPath = path.dirname(targetPath)
    yield* fs.makeDirectory(targetDirPath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to create directory for dotfile: ${targetDirPath}`,
            path: targetDirPath,
            cause: error
          })
      )
    )

    // Write final content
    yield* fs.writeFile(targetPath, finalContent).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to write dotfile: ${targetPath}`,
            path: targetPath,
            cause: error
          })
      )
    )

    const action = wasMerged ? "Merged" : exists ? "Overwritten" : "Copied"
    yield* Effect.logInfo(`✓ ${action} ${dotfile.name} to ${targetPath}`)

    return {
      copied: true,
      path: targetPath,
      merged: wasMerged,
      reason: undefined
    }
  })

/**
 * Copy all dotfiles to the target directory
 */
export const copyAllDotfiles = (
  fs: FileSystemAdapter,
  options: DotfileOptions
) =>
  Effect.gen(function*() {
    const allDotfiles = getAllDotfiles()

    // Filter dotfiles based on include/exclude
    const dotfilesToCopy = allDotfiles.filter((dotfile) => {
      if (options.include && !options.include.includes(dotfile.name)) {
        return false
      }
      if (options.exclude && options.exclude.includes(dotfile.name)) {
        return false
      }
      return true
    })

    const merge = options.merge ?? true
    const overwrite = options.overwrite ?? false

    yield* Effect.logInfo(
      `Processing ${dotfilesToCopy.length} dotfiles in ${options.targetDir} (merge: ${merge})`
    )

    // Copy each dotfile
    const results = yield* Effect.all(
      dotfilesToCopy.map((dotfile) => copyDotfile(fs, dotfile, options.targetDir, overwrite, merge)),
      { concurrency: "unbounded" }
    )

    const copiedCount = results.filter((r: any) => r.copied).length
    const mergedCount = results.filter((r: any) => r.merged).length
    const skippedCount = results.length - copiedCount

    yield* Effect.logInfo(
      `Dotfiles: ${copiedCount} processed (${mergedCount} merged, ${
        copiedCount - mergedCount
      } created/overwritten), ${skippedCount} skipped`
    )

    return {
      copied: copiedCount,
      merged: mergedCount,
      skipped: skippedCount,
      total: results.length,
      results
    }
  })

/**
 * Validate that required dotfiles exist
 */
export const validateDotfiles = (
  fs: FileSystemAdapter,
  targetDir: string
) =>
  Effect.gen(function*() {
    const allDotfiles = getAllDotfiles()
    const requiredDotfiles = allDotfiles.filter((d) => d.required)

    const validationResults = yield* Effect.all(
      requiredDotfiles.map((dotfile) =>
        Effect.gen(function*() {
          const targetPath = path.join(targetDir, dotfile.targetPath)
          const exists = yield* fs.exists(targetPath)
          return {
            dotfile: dotfile.name,
            exists,
            path: targetPath,
            required: dotfile.required
          }
        })
      ),
      { concurrency: "unbounded" }
    )

    const missing = validationResults.filter((r: any) => !r.exists)

    if (missing.length > 0) {
      yield* Effect.logWarning(
        `Missing required dotfiles: ${missing.map((m: any) => m.dotfile).join(", ")}`
      )
    }

    return {
      valid: missing.length === 0,
      missing: missing.map((m: any) => m.dotfile),
      results: validationResults
    }
  })
