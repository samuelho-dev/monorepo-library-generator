/**
 * Shared types for MCP tool handlers
 */

export interface ToolResult {
  readonly success: boolean
  readonly message: string
  readonly files?: readonly string[]
}

export interface GeneratorResult {
  readonly files: readonly string[]
  readonly projectName: string
  readonly projectRoot: string
}
