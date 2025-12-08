/**
 * Dry Run Utility
 *
 * Preview file generation without writing to disk.
 */

import { Effect } from "effect"

export interface FilePreview {
  readonly path: string
  readonly size: number
  readonly preview: string
}

export interface DryRunResult {
  readonly dryRun: true
  readonly filesCount: number
  readonly totalSize: number
  readonly files: ReadonlyArray<FilePreview>
}

/**
 * Preview files that would be generated without writing to disk
 */
export const previewGeneration = (
  files: ReadonlyArray<{ readonly path: string; readonly content: string }>
) =>
  Effect.sync(() => {
    const previews = files.map((file) => ({
      path: file.path,
      size: file.content.length,
      preview: file.content.slice(0, 300) + (file.content.length > 300 ? "\n..." : "")
    }))

    const totalSize = files.reduce((sum, file) => sum + file.content.length, 0)

    return {
      dryRun: true,
      filesCount: files.length,
      totalSize,
      files: previews
    }
  })

/**
 * Format dry-run result for MCP response
 */
export const formatDryRunResult = (result: DryRunResult) => {
  const lines = [
    "🔍 DRY RUN - No files were written",
    "",
    `📊 Would generate ${result.filesCount} files (${formatBytes(result.totalSize)})`,
    "",
    "📁 Files:",
    ...result.files.map((f) => `  - ${f.path} (${formatBytes(f.size)})`),
    ""
  ]

  if (result.files[0]) {
    lines.push("Preview of first file:")
    lines.push("─".repeat(60))
    lines.push(result.files[0].preview)
    lines.push("─".repeat(60))
    lines.push("")
  }

  lines.push("To actually generate files, remove the dryRun flag")

  return lines.join("\n")
}

/**
 * Format bytes to human-readable string
 */
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
