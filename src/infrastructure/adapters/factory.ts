/**
 * Adapter Factory
 *
 * Creates appropriate FileSystemAdapter based on workspace context and interface type
 *
 * @module monorepo-library-generator/infrastructure/adapters/factory
 */

import type { Tree } from "@nx/devkit";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect } from "effect";
import type { WorkspaceContext } from "../workspace/types";
import { createEffectFsAdapter } from "./effect-adapter";
import type { FileSystemAdapter } from "./filesystem";
import { FileSystemError } from "./filesystem";
import { createMCPAdapter } from "./mcp-adapter";
import { createTreeAdapter } from "./tree-adapter";

/**
 * Adapter creation options
 */
export interface AdapterOptions {
  /**
   * Workspace context (contains interface type and workspace root)
   */
  readonly context: WorkspaceContext;

  /**
   * Nx Tree instance (only required when interfaceType === "nx")
   */
  readonly nxTree?: Tree;
}

/**
 * Create appropriate adapter based on workspace context
 *
 * Selects adapter implementation based on interface type:
 * - "nx" -> TreeAdapter (wraps Nx Tree API)
 * - "cli" -> EffectFsAdapter (wraps @effect/platform FileSystem)
 * - "mcp" -> MCPFileSystemAdapter (wraps @effect/platform-node FileSystem)
 *
 * @param options - Adapter creation options
 * @returns Effect with appropriate FileSystemAdapter
 *
 * @example
 * ```typescript
 * // MCP handler
 * const context = yield* createWorkspaceContext(args.workspaceRoot, "mcp")
 * const adapter = yield* createAdapter({ context })
 *
 * // CLI command
 * const context = yield* createWorkspaceContext(undefined, "cli")
 * const adapter = yield* createAdapter({ context })
 *
 * // Nx generator
 * const context = yield* createWorkspaceContext(tree.root, "nx")
 * const adapter = yield* createAdapter({ context, nxTree: tree })
 * ```
 */
export function createAdapter(options: AdapterOptions) {
  const { context, nxTree } = options;

  return Effect.gen(function* () {
    switch (context.interfaceType) {
      case "nx": {
        if (!nxTree) {
          return yield* Effect.fail(
            new FileSystemError({
              message: "Nx Tree required for Nx interface but not provided",
              path: context.root,
            })
          );
        }
        return createTreeAdapter(nxTree);
      }

      case "cli": {
        return yield* createEffectFsAdapter(context.root);
      }

      case "mcp": {
        return createMCPAdapter(context.root);
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = context.interfaceType;
        return yield* Effect.fail(
          new FileSystemError({
            message: `Unknown interface type: ${_exhaustive}`,
            path: context.root,
          })
        );
      }
    }
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));
}

/**
 * Helper: Create adapter directly from context and optional tree
 *
 * Convenience function that wraps createAdapter with simpler parameters
 */
export function createAdapterFromContext(
  context: WorkspaceContext,
  nxTree?: Tree
) {
  const options: any = { context };
  if (nxTree !== undefined) {
    options.nxTree = nxTree;
  }
  return createAdapter(options);
}
