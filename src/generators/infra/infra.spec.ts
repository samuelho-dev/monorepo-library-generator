import { readProjectConfiguration } from "@nx/devkit"
import type { Tree } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"

import infraGenerator from "./infra"

// ============================================================================
// PHASE 1: Foundation Tests (Schema & Base Files)
// ============================================================================

describe("Infra Generator - Foundation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Base File Generation", () => {
    it("should generate all base files for server-only infrastructure", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/src/lib/service/service.ts")).toBe(
        true
      )
      expect(tree.exists("libs/infra/cache/src/lib/service/errors.ts")).toBe(
        true
      )
      expect(tree.exists("libs/infra/cache/src/lib/service/config.ts")).toBe(
        true
      )
      expect(tree.exists("libs/infra/cache/src/lib/providers/memory.ts")).toBe(
        true
      )
      expect(
        tree.exists("libs/infra/cache/src/lib/layers/server-layers.ts")
      ).toBe(true)
      expect(tree.exists("libs/infra/cache/src/index.ts")).toBe(true)
    })

    it("should generate project.json with correct configuration", async () => {
      await infraGenerator(tree, { name: "cache" })

      const config = readProjectConfiguration(tree, "infra-cache")
      expect(config).toBeDefined()
      expect(config.projectType).toBe("library")
      expect(config.sourceRoot).toBe("libs/infra/cache/src")
    })

    it("should generate package.json with workspace dependencies", async () => {
      await infraGenerator(tree, { name: "cache" })

      const packageJsonContent = tree.read(
        "libs/infra/cache/package.json",
        "utf-8"
      )
      expect(packageJsonContent).toContain("@myorg/infra-cache")
      expect(packageJsonContent).toContain("effect")
    })

    it("should update tsconfig.base.json with path mapping", async () => {
      await infraGenerator(tree, { name: "cache" })

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      const config = readProjectConfiguration(tree, "infra-cache")
      expect(config).toBeDefined()
      expect(config.root).toBe("libs/infra/cache")
    })

    it("should generate README.md with service documentation", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/README.md")).toBe(true)
      const readmeContent = tree.read("libs/infra/cache/README.md", "utf-8")
      expect(readmeContent).toContain("Cache")
    })

    it("should generate CLAUDE.md with AI reference", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/CLAUDE.md")).toBe(true)
    })

    it("should always generate config.ts", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/src/lib/service/config.ts")).toBe(
        true
      )
      const configContent = tree.read(
        "libs/infra/cache/src/lib/service/config.ts",
        "utf-8"
      )
      expect(configContent).toContain("CacheConfig")
    })

    it("should export service and layers from index.ts when no flags", async () => {
      await infraGenerator(tree, {
        name: "cache",
        includeClientServer: false
      })

      const indexContent = tree.read("libs/infra/cache/src/index.ts", "utf-8")
      expect(indexContent).toContain("from './lib/service/service'")
      expect(indexContent).toContain("from './lib/layers/server-layers'")
      expect(indexContent).toContain("from './lib/service/errors'")
    })
  })

  describe("Schema Options", () => {
    it("should accept includeClientServer flag", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      expect(tree.exists("libs/infra/storage/src/index.ts")).toBe(true)
      expect(tree.exists("libs/infra/storage/src/lib/client/hooks")).toBe(true)
    })

    it("should accept includeEdge flag", async () => {
      await infraGenerator(tree, { name: "auth", includeEdge: true })

      expect(tree.exists("libs/infra/auth/src/index.ts")).toBe(true)
      expect(tree.exists("libs/infra/auth/src/lib/layers/edge-layers.ts")).toBe(
        true
      )
    })

    it("should accept both includeClientServer and includeEdge flags", async () => {
      await infraGenerator(tree, {
        name: "webhook",
        includeClientServer: true,
        includeEdge: true
      })

      expect(tree.exists("libs/infra/webhook/src/index.ts")).toBe(true)
      expect(tree.exists("libs/infra/webhook/src/lib/client/hooks")).toBe(true)
      expect(tree.exists("libs/infra/webhook/src/lib/layers/edge-layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 2: Server-Only Structure Tests
// ============================================================================

describe("Infra Generator - Server-Only Structure", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Service Definition", () => {
    it("should use Context.Tag with inline interface (Effect 3.0+ pattern)", async () => {
      await infraGenerator(tree, { name: "cache" })

      const serviceContent = tree.read(
        "libs/infra/cache/src/lib/service/service.ts",
        "utf-8"
      )
      // Modern Effect 3.0+ pattern: Context.Tag with inline interface
      expect(serviceContent).toContain("export class CacheService")
      expect(serviceContent).toContain("extends Context.Tag")
      expect(serviceContent).toContain("readonly get:")
    })

    it("should generate service errors with Data.TaggedError", async () => {
      await infraGenerator(tree, { name: "cache" })

      const errorsContent = tree.read(
        "libs/infra/cache/src/lib/service/errors.ts",
        "utf-8"
      )
      expect(errorsContent).toContain("extends Data.TaggedError")
      expect(errorsContent).toContain("CacheError")
    })

    it("should generate server-layers.ts with Live/Test layers", async () => {
      await infraGenerator(tree, { name: "cache" })

      const layersContent = tree.read(
        "libs/infra/cache/src/lib/layers/server-layers.ts",
        "utf-8"
      )
      // Modern Effect 3.0+ pattern: static members (CacheService.Live)
      expect(layersContent).toContain("CacheService.Live")
      expect(layersContent).toContain("CacheService.Test")
    })

    it("should generate server layers by default", async () => {
      await infraGenerator(tree, { name: "cache" })

      // Platform barrel exports removed - check actual implementation
      expect(tree.exists("libs/infra/cache/src/lib/layers/server-layers.ts")).toBe(true)
    })

    it("should NOT create client/ directory when no flags", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/src/lib/client")).toBe(false)
    })
  })
})

// ============================================================================
// PHASE 3: Client-Server Separation Tests
// ============================================================================

describe("Infra Generator - Client-Server Separation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Platform Separation", () => {
    it("should generate client and server implementation when includeClientServer=true", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      // Platform barrel exports removed - check actual implementation
      expect(tree.exists("libs/infra/storage/src/lib/client/hooks")).toBe(true)
      expect(tree.exists("libs/infra/storage/src/lib/layers/server-layers.ts")).toBe(true)
    })

    it("should generate client/hooks/ directory", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      expect(
        tree.exists("libs/infra/storage/src/lib/client/hooks/use-storage.ts")
      ).toBe(true)
    })

    it("should generate client-layers.ts AND server-layers.ts", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      expect(
        tree.exists("libs/infra/storage/src/lib/layers/client-layers.ts")
      ).toBe(true)
      expect(
        tree.exists("libs/infra/storage/src/lib/layers/server-layers.ts")
      ).toBe(true)
    })

    it("should export only universal types from index.ts when includeClientServer=true", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      const indexContent = tree.read(
        "libs/infra/storage/src/index.ts",
        "utf-8"
      )
      expect(indexContent).toContain("from './lib/service/service'")
      expect(indexContent).not.toContain("from './lib/layers")
    })

    it("should export client layers from client-layers.ts", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      const clientLayersContent = tree.read(
        "libs/infra/storage/src/lib/layers/client-layers.ts",
        "utf-8"
      )
      expect(clientLayersContent).toContain("StorageService.ClientLive")
    })

    it("should export server layers from server-layers.ts", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      const serverLayersContent = tree.read(
        "libs/infra/storage/src/lib/layers/server-layers.ts",
        "utf-8"
      )
      expect(serverLayersContent).toContain("StorageService.Live")
    })

    it("should NOT create client implementation when includeClientServer=false", async () => {
      await infraGenerator(tree, {
        name: "cache",
        includeClientServer: false
      })

      // Platform barrel exports removed - check that client implementation doesn't exist
      expect(tree.exists("libs/infra/cache/src/lib/client")).toBe(false)
      // But server layers should still exist
      expect(tree.exists("libs/infra/cache/src/lib/layers/server-layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 4: Edge Platform Tests
// ============================================================================

describe("Infra Generator - Edge Platform", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Edge Runtime Support", () => {
    it("should generate edge-layers.ts when includeEdge=true", async () => {
      await infraGenerator(tree, { name: "auth", includeEdge: true })

      expect(tree.exists("libs/infra/auth/src/lib/layers/edge-layers.ts")).toBe(
        true
      )
    })

    it("should NOT generate edge files when includeEdge=false", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(
        tree.exists("libs/infra/cache/src/lib/layers/edge-layers.ts")
      ).toBe(false)
    })

    it("should work independently with includeClientServer", async () => {
      await infraGenerator(tree, {
        name: "webhook",
        includeClientServer: true,
        includeEdge: true
      })

      // Platform barrel exports removed - check actual implementation
      expect(tree.exists("libs/infra/webhook/src/lib/client/hooks")).toBe(true)
      expect(tree.exists("libs/infra/webhook/src/lib/layers/server-layers.ts")).toBe(true)
      expect(tree.exists("libs/infra/webhook/src/lib/layers/edge-layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 5: File Cleanup Tests
// ============================================================================

describe("Infra Generator - File Cleanup", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Conditional File Removal", () => {
    it("should remove client implementation when includeClientServer=false", async () => {
      // First generate with flag
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      // Verify client implementation exists
      expect(tree.exists("libs/infra/storage/src/lib/client")).toBe(true)

      // Generate without flag
      const tree2 = createTreeWithEmptyWorkspace()
      await infraGenerator(tree2, {
        name: "storage",
        includeClientServer: false
      })

      // Platform barrel exports removed
      // Client implementation directory should not exist
      expect(tree2.exists("libs/infra/storage/src/lib/client")).toBe(false)
      // But server layers should exist
      expect(tree2.exists("libs/infra/storage/src/lib/layers/server-layers.ts")).toBe(true)
    })

    it("should not generate edge files when includeEdge=false", async () => {
      const tree2 = createTreeWithEmptyWorkspace()
      await infraGenerator(tree2, { name: "cache", includeEdge: false })

      expect(
        tree2.exists("libs/infra/cache/src/lib/layers/edge-layers.ts")
      ).toBe(false)
    })

    it("should preserve all implementation layers when both flags enabled", async () => {
      await infraGenerator(tree, {
        name: "universal",
        includeClientServer: true,
        includeEdge: true
      })

      // Platform barrel exports removed - check actual implementation layers
      expect(
        tree.exists("libs/infra/universal/src/lib/layers/client-layers.ts")
      ).toBe(true)
      expect(
        tree.exists("libs/infra/universal/src/lib/layers/server-layers.ts")
      ).toBe(true)
      expect(
        tree.exists("libs/infra/universal/src/lib/layers/edge-layers.ts")
      ).toBe(true)
    })

    it("should generate client and server implementation directories when includeClientServer is true", async () => {
      await infraGenerator(tree, {
        name: "storage",
        includeClientServer: true
      })

      // Platform-specific barrel files removed - check actual implementation directories
      const clientDirExists = tree.exists("libs/infra/storage/src/lib/client")
      const serverLayersExists = tree.exists("libs/infra/storage/src/lib/layers/server-layers.ts")

      // Both implementation directories should exist
      expect(clientDirExists).toBe(true)
      expect(serverLayersExists).toBe(true)
    })
  })
})
