/**
 * Result Formatting Utilities
 *
 * Format MCP tool results (success and error messages).
 */

import type { WorkspaceContext } from "./workspace-detector.ts"

export interface SuccessResult {
  readonly libraryType: string
  readonly libraryName: string
  readonly filesCreated: ReadonlyArray<string>
  readonly workspaceType: WorkspaceContext["type"]
  readonly nextSteps: ReadonlyArray<string>
}

/**
 * Format successful generation result
 */
export const formatSuccessResult = (result: SuccessResult) => {
  const { filesCreated, libraryName, libraryType, nextSteps, workspaceType } = result

  const lines = [
    `✅ Generated ${libraryName} library`,
    "",
    `📦 Library Type: ${libraryType}`,
    `🏗️  Workspace: ${workspaceType}`,
    "",
    `📁 Files created (${filesCreated.length}):`,
    ...filesCreated.slice(0, 10).map((f) => `  - ${f}`)
  ]

  if (filesCreated.length > 10) {
    lines.push(`  ... and ${filesCreated.length - 10} more files`)
  }

  lines.push("")

  if (nextSteps.length > 0) {
    lines.push("🚀 Next steps:")
    for (const [i, step] of nextSteps.entries()) {
      lines.push(`  ${i + 1}. ${step}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Format error result
 */
export const formatErrorResult = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return [
    "❌ Generation failed",
    "",
    "Error:",
    `  ${message}`,
    "",
    "💡 Tips:",
    "  - Ensure the workspace root path is correct",
    "  - Check that the target directory exists",
    "  - Verify you have write permissions",
    "  - Try with dryRun: true to preview first"
  ].join("\n")
}
