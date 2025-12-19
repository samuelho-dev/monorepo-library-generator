/**
 * WorkspaceService - Workspace detection as Effect Service
 *
 * Wraps workspace-detector utility as a Context.Tag service
 * with Live and Test layer implementations for DI.
 */

import { Context, Effect, Layer } from "effect"
import type { WorkspaceContext, WorkspaceDetectionError } from "../utils/workspace-detector"
import { detectWorkspace } from "../utils/workspace-detector"

// Constants for test mocks
const TEST_SCOPE = "@test"
const TEST_WORKSPACE_TYPE = "nx"
const TEST_PKG_MANAGER = "pnpm"

/**
 * WorkspaceService interface
 */
export interface WorkspaceServiceImpl {
  readonly detect: (root: string) => Effect.Effect<WorkspaceContext, WorkspaceDetectionError>
}

/**
 * WorkspaceService Tag
 */
export class WorkspaceService extends Context.Tag("WorkspaceService")<WorkspaceService, WorkspaceServiceImpl>() {
  /**
   * Live implementation - uses real workspace detection
   */
  static readonly Live = Layer.succeed(this, {
    detect: (root: string) => detectWorkspace(root)
  })

  /**
   * Test implementation - returns mock workspace context
   */
  static readonly Test = Layer.succeed(this, {
    detect: (root: string) =>
      Effect.succeed({
        root,
        scope: TEST_SCOPE,
        type: TEST_WORKSPACE_TYPE,
        packageManager: TEST_PKG_MANAGER
      })
  })

  /**
   * Mock implementation - customizable for specific tests
   */
  static readonly Mock = (mockContext: Partial<WorkspaceContext>) =>
    Layer.succeed(this, {
      detect: (root: string) =>
        Effect.succeed({
          root,
          scope: mockContext.scope ?? "@mock",
          type: mockContext.type ?? "nx",
          packageManager: mockContext.packageManager ?? "pnpm"
        })
    })
}
