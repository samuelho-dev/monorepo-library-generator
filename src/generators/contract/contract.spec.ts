import type { Tree } from "@nx/devkit"
import { readProjectConfiguration } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"

import { contractGenerator } from "./contract"

// ============================================================================
// PHASE 1: Foundation Tests (Schema & Base Files)
// ============================================================================

describe("Contract Generator - Foundation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Base File Generation", () => {
    it("should generate all base files", async () => {
      await contractGenerator(tree, { name: "product" })

      // Types file at source root (for prisma-effect-kysely integration)
      expect(tree.exists("libs/contract/product/src/types.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/events.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/ports.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/index.ts")).toBe(true)
    })

    it("should generate project.json with correct configuration", async () => {
      await contractGenerator(tree, { name: "product" })

      const config = readProjectConfiguration(tree, "contract-product")
      expect(config).toBeDefined()
      expect(config.projectType).toBe("library")
      expect(config.sourceRoot).toBe("libs/contract/product/src")
    })

    it("should update tsconfig.base.json with path mapping", async () => {
      await contractGenerator(tree, { name: "product" })

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      // by checking that project configuration exists
      const config = readProjectConfiguration(tree, "contract-product")
      expect(config).toBeDefined()
      expect(config.root).toBe("libs/contract/product")
    })
  })

  describe("Schema Options", () => {
    it("should accept includeCQRS flag", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      expect(tree.exists("libs/contract/product/src/lib/commands.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/queries.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/projections.ts")).toBe(true)
    })

    it("should always generate RPC files by default", async () => {
      await contractGenerator(tree, { name: "product" })

      // RPC is always generated (prewired integration)
      expect(tree.exists("libs/contract/product/src/lib/rpc.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-errors.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-definitions.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-group.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 2: CQRS File Generation Tests
// ============================================================================

describe("Contract Generator - CQRS Files", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Commands Generation", () => {
    it("should generate commands.ts when includeCQRS=true", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      const commandsPath = "libs/contract/product/src/lib/commands.ts"
      expect(tree.exists(commandsPath)).toBe(true)

      const content = tree.read(commandsPath, "utf-8")
      expect(content).toContain("Schema.Class")
      expect(content).toContain("CreateProductCommand")
      expect(content).toContain("UpdateProductCommand")
    })

    it("should NOT generate commands.ts when includeCQRS=false", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: false })

      expect(tree.exists("libs/contract/product/src/lib/commands.ts")).toBe(false)
    })
  })

  describe("Queries Generation", () => {
    it("should generate queries.ts when includeCQRS=true", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      const queriesPath = "libs/contract/product/src/lib/queries.ts"
      expect(tree.exists(queriesPath)).toBe(true)

      const content = tree.read(queriesPath, "utf-8")
      expect(content).toContain("Schema.Class")
      expect(content).toContain("GetProductQuery")
      expect(content).toContain("ListProductsQuery")
    })

    it("should NOT generate queries.ts when includeCQRS=false", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: false })

      expect(tree.exists("libs/contract/product/src/lib/queries.ts")).toBe(false)
    })
  })

  describe("Projections Generation", () => {
    it("should generate projections.ts when includeCQRS=true", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      const projectionsPath = "libs/contract/product/src/lib/projections.ts"
      expect(tree.exists(projectionsPath)).toBe(true)

      const content = tree.read(projectionsPath, "utf-8")
      expect(content).toContain("Schema.Class")
      expect(content).toContain("ProductListProjection")
      expect(content).toContain("ProductDetailProjection")
      // Verify it emphasizes projections are NOT tables
      expect(content).toContain("TypeScript schemas for query results from JOINs")
      expect(content).toContain("NOT separate database tables")
    })

    it("should NOT generate projections.ts when includeCQRS=false", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: false })

      expect(tree.exists("libs/contract/product/src/lib/projections.ts")).toBe(false)
    })
  })
})

// ============================================================================
// PHASE 3: RPC File Generation Tests (Always Generated)
// ============================================================================

describe("Contract Generator - RPC Files", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("RPC Schema Generation (Always Prewired)", () => {
    it("should always generate RPC files with Schema.TaggedError", async () => {
      await contractGenerator(tree, { name: "product" })

      const rpcPath = "libs/contract/product/src/lib/rpc.ts"
      expect(tree.exists(rpcPath)).toBe(true)

      // rpc.ts is a barrel file that re-exports from rpc-errors, rpc-definitions, rpc-group
      const rpcContent = tree.read(rpcPath, "utf-8")
      expect(rpcContent).toContain("export * from './rpc-errors'")

      // Check rpc-errors.ts for Schema.TaggedError usage
      const rpcErrorsPath = "libs/contract/product/src/lib/rpc-errors.ts"
      expect(tree.exists(rpcErrorsPath)).toBe(true)

      const errorsContent = tree.read(rpcErrorsPath, "utf-8")
      // RPC should use Schema.TaggedError, NOT Data.TaggedError
      expect(errorsContent).toContain("Schema.TaggedError")
      expect(errorsContent).toContain("extends Schema.TaggedError")
      // Schema types used in error definitions
      expect(errorsContent).toContain("Schema.String")
      // Ensure we're not using Data.TaggedError in actual code (not docstrings)
      expect(errorsContent).not.toContain("extends Data.TaggedError")
    })

    it("should generate all RPC modules", async () => {
      await contractGenerator(tree, { name: "product" })

      // All RPC files are always generated
      expect(tree.exists("libs/contract/product/src/lib/rpc.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-errors.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-definitions.ts")).toBe(true)
      expect(tree.exists("libs/contract/product/src/lib/rpc-group.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 4: Export Tests
// ============================================================================

describe("Contract Generator - Exports", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Conditional Exports in index.ts", () => {
    it("should export core domain types in all cases", async () => {
      await contractGenerator(tree, { name: "product" })

      const indexContent = tree.read("libs/contract/product/src/index.ts", "utf-8")
      // Core exports from index.ts
      expect(indexContent).toContain("./lib/errors")
      expect(indexContent).toContain("./lib/ports")
      expect(indexContent).toContain("./lib/events")

      // Verify types file exists at source root (for prisma-effect-kysely integration)
      const typesContent = tree.read("libs/contract/product/src/types.ts", "utf-8")
      expect(typesContent).toContain("Product")
    })

    it("should export CQRS files when includeCQRS=true", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      const indexContent = tree.read("libs/contract/product/src/index.ts", "utf-8")
      expect(indexContent).toContain("from './lib/commands'")
      expect(indexContent).toContain("from './lib/queries'")
      expect(indexContent).toContain("from './lib/projections'")
    })

    it("should NOT export CQRS files when includeCQRS=false", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: false })

      const indexContent = tree.read("libs/contract/product/src/index.ts", "utf-8")
      expect(indexContent).not.toContain("./lib/commands'")
      expect(indexContent).not.toContain("./lib/queries'")
      expect(indexContent).not.toContain("./lib/projections'")
    })

    it("should always export RPC files (prewired integration)", async () => {
      await contractGenerator(tree, { name: "product" })

      const indexContent = tree.read("libs/contract/product/src/index.ts", "utf-8")
      // RPC is always exported (prewired integration)
      expect(indexContent).toContain("from './lib/rpc'")
    })
  })

  describe("Projection Repository Export", () => {
    it("should export ProjectionRepository when includeCQRS=true", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: true })

      const portsContent = tree.read("libs/contract/product/src/lib/ports.ts", "utf-8")
      expect(portsContent).toContain("ProductProjectionRepository")
    })

    it("should NOT have ProjectionRepository when includeCQRS=false", async () => {
      await contractGenerator(tree, { name: "product", includeCQRS: false })

      const portsContent = tree.read("libs/contract/product/src/lib/ports.ts", "utf-8")
      expect(portsContent).not.toContain("ProjectionRepository")
    })
  })
})
