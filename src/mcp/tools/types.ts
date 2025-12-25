/**
 * Shared types for MCP tool handlers
 */

export interface ToolResult {
  readonly success: boolean
  readonly message: string
  readonly files?: ReadonlyArray<string>
}

export interface GeneratorResult {
  readonly files: ReadonlyArray<string>
  readonly projectName: string
  readonly projectRoot: string
}
