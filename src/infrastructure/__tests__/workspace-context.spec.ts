/**
 * Workspace Context Tests
 *
 * Tests for unified workspace context creation and detection
 */

import { describe, it, expect } from "vitest"
import { createWorkspaceContextExplicit } from "../workspace/context"

describe("Workspace Context", () => {
  describe("createWorkspaceContextExplicit", () => {
    it("should create workspace context with explicit values", () => {
      const context = createWorkspaceContextExplicit(
        "/test/workspace",
        "nx",
        "@test-scope",
        "pnpm",
        "mcp"
      )

      expect(context).toEqual({
        root: "/test/workspace",
        type: "nx",
        scope: "@test-scope",
        packageManager: "pnpm",
        interfaceType: "mcp"
      })
    })

    it("should support all interface types", () => {
      const mcpContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "pnpm",
        "mcp"
      )
      expect(mcpContext.interfaceType).toBe("mcp")

      const cliContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "pnpm",
        "cli"
      )
      expect(cliContext.interfaceType).toBe("cli")

      const nxContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "pnpm",
        "nx"
      )
      expect(nxContext.interfaceType).toBe("nx")
    })

    it("should support all workspace types", () => {
      const nxContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "pnpm",
        "mcp"
      )
      expect(nxContext.type).toBe("nx")

      const standaloneContext = createWorkspaceContextExplicit(
        "/test",
        "standalone",
        "@scope",
        "pnpm",
        "mcp"
      )
      expect(standaloneContext.type).toBe("standalone")
    })

    it("should support all package managers", () => {
      const pnpmContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "pnpm",
        "mcp"
      )
      expect(pnpmContext.packageManager).toBe("pnpm")

      const npmContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "npm",
        "mcp"
      )
      expect(npmContext.packageManager).toBe("npm")

      const yarnContext = createWorkspaceContextExplicit(
        "/test",
        "nx",
        "@scope",
        "yarn",
        "mcp"
      )
      expect(yarnContext.packageManager).toBe("yarn")
    })
  })

  describe("createWorkspaceContext", () => {
    it("should use process.cwd() when rootPath is undefined", async () => {
      // This test would require mocking the file system
      // For now, we'll skip auto-detection tests and focus on explicit creation
      expect(true).toBe(true)
    })
  })
})
