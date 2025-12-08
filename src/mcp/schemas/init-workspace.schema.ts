/**
 * Init Workspace Tool Schema for MCP
 *
 * Effect Schema-based validation for init-workspace tool.
 * Generates JSON Schema for MCP tool definition.
 *
 * @module mcp/schemas/init-workspace
 */

import { JSONSchema, Schema } from "effect"

/**
 * Init Workspace Tool Arguments Schema
 *
 * Validates MCP tool arguments using Effect Schema.
 */
export class InitWorkspaceArgs extends Schema.Class<InitWorkspaceArgs>("InitWorkspaceArgs")({
  /**
   * Whether to overwrite existing files
   */
  overwrite: Schema.optionalWith(Schema.Boolean, { default: () => false }).annotations({
    title: "Overwrite Existing Files",
    description: "Whether to overwrite existing workspace dotfiles (default: false)"
  }),

  /**
   * Whether to merge with existing files
   */
  merge: Schema.optionalWith(Schema.Boolean, { default: () => true }).annotations({
    title: "Merge with Existing Files",
    description: "Whether to merge with existing dotfiles (default: true)"
  }),

  /**
   * Dry run mode
   */
  dryRun: Schema.optionalWith(Schema.Boolean, { default: () => false }).annotations({
    title: "Dry Run",
    description: "Preview changes without writing files (default: false)"
  })
}) {}

/**
 * MCP Tool Definition for Init Workspace
 *
 * Uses Effect Schema to generate JSON Schema for MCP.
 */
export const InitWorkspaceToolDefinition = {
  name: "init_workspace",
  description: `Initialize workspace-level dotfiles for consistent development experience.

Creates workspace-level configuration files at the repository root:
- .editorconfig: Editor formatting rules (shared by all editors/IDEs)
- .vscode/settings.json: VSCode workspace settings
- .vscode/extensions.json: Recommended VSCode extensions

These files are created ONCE at the workspace root and shared by all libraries.
Individual libraries will still have their own:
- eslint.config.mjs (library-specific linting rules)
- tsconfig.json (library-specific TypeScript config)

IMPORTANT: This should only be run once per workspace, not per library.`,

  inputSchema: JSONSchema.make(InitWorkspaceArgs)
}
