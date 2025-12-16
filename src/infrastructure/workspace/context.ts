/**
 * Unified Workspace Context
 *
 * Single source of truth for workspace context creation across all interfaces
 *
 * @module monorepo-library-generator/infrastructure/workspace/context
 */

import { Effect } from "effect"
import { detectWorkspaceContext } from "./detector"
import type { InterfaceType, WorkspaceContext } from "./types"
import { WorkspaceDetectionError } from "./types"

/**
 * Create unified workspace context from root path
 *
 * Auto-detects:
 * - Workspace root (by traversing up from startPath)
 * - Workspace type (nx vs standalone)
 * - Package scope (from package.json name)
 * - Package manager (from lock files)
 *
 * Used by all three interfaces (MCP, CLI, Nx) to ensure consistent workspace detection
 *
 * @param rootPath - Starting path for workspace detection (defaults to process.cwd())
 * @param interfaceType - Which interface is calling ("mcp", "cli", or "nx")
 * @returns Effect with complete WorkspaceContext
 *
 * @example
 * ```typescript
 * // MCP handler
 * const context = yield* createWorkspaceContext(args.workspaceRoot, "mcp")
 *
 * // CLI command
 * const context = yield* createWorkspaceContext(undefined, "cli")
 *
 * // Nx generator (receives tree.root)
 * const context = yield* createWorkspaceContext(tree.root, "nx")
 * ```
 */
export function createWorkspaceContext(
  rootPath: string | undefined,
  interfaceType: InterfaceType
): Effect.Effect<WorkspaceContext, WorkspaceDetectionError> {
  return Effect.gen(function* () {
    const startPath = rootPath ?? process.cwd()

    // Auto-detect workspace properties
    const detected = yield* detectWorkspaceContext(startPath)

    return {
      ...detected,
      interfaceType
    }
  })
}

/**
 * Create workspace context with explicit values (for testing)
 *
 * Bypasses auto-detection and uses provided values
 */
export function createWorkspaceContextExplicit(
  root: string,
  type: WorkspaceContext["type"],
  scope: string,
  packageManager: WorkspaceContext["packageManager"],
  interfaceType: InterfaceType
): WorkspaceContext {
  return {
    root,
    type,
    scope,
    packageManager,
    interfaceType
  }
}
