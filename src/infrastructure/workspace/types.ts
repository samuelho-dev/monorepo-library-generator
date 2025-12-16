/**
 * Workspace Types
 *
 * Shared types for unified workspace context
 *
 * @module monorepo-library-generator/infrastructure/workspace/types
 */

import * as Schema from "effect/Schema"

/**
 * Workspace type - identifies the monorepo tool being used
 */
export type WorkspaceType = "nx" | "standalone"

/**
 * Package manager type
 */
export type PackageManager = "pnpm" | "npm" | "yarn"

/**
 * Interface type - identifies which interface is calling the generator
 */
export type InterfaceType = "mcp" | "cli" | "nx"

/**
 * Unified workspace context used by all three interfaces (MCP, CLI, Nx)
 *
 * This replaces:
 * - MCP's WorkspaceContext (in workspace-detector.ts)
 * - CLI's workspace detection logic
 * - Nx's workspace detection logic
 */
export interface WorkspaceContext {
  readonly root: string
  readonly type: WorkspaceType
  readonly scope: string
  readonly packageManager: PackageManager
  readonly interfaceType: InterfaceType
}

/**
 * Effect Schema for WorkspaceContext
 */
export const WorkspaceContextSchema = Schema.Struct({
  root: Schema.String,
  type: Schema.Literal("nx", "standalone"),
  scope: Schema.String,
  packageManager: Schema.Literal("pnpm", "npm", "yarn"),
  interfaceType: Schema.Literal("mcp", "cli", "nx")
})

/**
 * Workspace Detection Error
 */
export class WorkspaceDetectionError extends Error {
  readonly _tag = "WorkspaceDetectionError"

  constructor(message: string, override readonly cause?: unknown) {
    super(message)
    this.name = "WorkspaceDetectionError"
  }
}
