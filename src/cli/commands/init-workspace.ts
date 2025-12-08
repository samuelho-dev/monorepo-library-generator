/**
 * Workspace Initialization Command
 *
 * Initializes workspace-level dotfiles for consistent development experience.
 * This is a standalone command that generates workspace-level configuration files:
 * - .editorconfig
 * - .vscode/settings.json
 * - .vscode/extensions.json
 *
 * These files should be created ONCE at the workspace root, not per-library.
 *
 * Usage:
 * ```bash
 * npx mlg init-workspace
 * ```
 *
 * @module cli/commands/init-workspace
 */

import { Console, Effect } from "effect"
import { copyAllDotfiles, type DotfileName } from "../../utils/dotfiles"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"

/**
 * Workspace initialization options
 */
export interface InitWorkspaceOptions {
  /**
   * Target directory (defaults to current working directory)
   */
  readonly targetDir?: string

  /**
   * Whether to overwrite existing files
   * @default false
   */
  readonly overwrite?: boolean | undefined

  /**
   * Whether to merge with existing files
   * @default true
   */
  readonly merge?: boolean | undefined
}

/**
 * Initialize workspace-level dotfiles
 *
 * Generates workspace-level configuration files:
 * - .editorconfig: Editor formatting rules
 * - .vscode/settings.json: VSCode workspace settings
 * - .vscode/extensions.json: Recommended VSCode extensions
 *
 * These files are created at the workspace root and shared by all libraries.
 */
export function initWorkspace(options: InitWorkspaceOptions = {}) {
  return Effect.gen(function*() {
    const targetDir = options.targetDir ?? (yield* Effect.sync(() => process.cwd()))
    const overwrite = options.overwrite ?? false
    const merge = options.merge ?? true

    yield* Console.log("🚀 Initializing workspace-level dotfiles...")
    yield* Console.log(`Target: ${targetDir}`)
    yield* Console.log("")

    // Create filesystem adapter
    const adapter = yield* createEffectFsAdapter(targetDir)

    // Copy only workspace-level dotfiles
    const workspaceDotfiles: ReadonlyArray<DotfileName> = [
      ".editorconfig",
      ".vscode/settings.json",
      ".vscode/extensions.json"
    ]

    const result = yield* copyAllDotfiles(adapter, {
      targetDir,
      overwrite,
      merge,
      include: workspaceDotfiles
    })

    yield* Console.log("")
    yield* Console.log("✨ Workspace initialization complete!")
    yield* Console.log(`  Files created: ${result.copied}`)
    yield* Console.log(`  Files merged: ${result.merged}`)
    yield* Console.log(`  Files skipped: ${result.skipped}`)
    yield* Console.log("")
    yield* Console.log("📁 Created workspace-level dotfiles:")
    yield* Console.log("  - .editorconfig - Editor formatting rules")
    yield* Console.log("  - .vscode/settings.json - VSCode workspace settings")
    yield* Console.log("  - .vscode/extensions.json - Recommended VSCode extensions")
    yield* Console.log("")
    yield* Console.log("💡 These files are shared by all libraries in your workspace.")
    yield* Console.log("   Individual libraries will still have their own:")
    yield* Console.log("   - eslint.config.mjs (library-specific linting)")
    yield* Console.log("   - tsconfig.json (library-specific TypeScript config)")

    return result
  })
}
