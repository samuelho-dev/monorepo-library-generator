/**
 * Compilation Integration Tests
 *
 * Validates that all generators produce TypeScript code that compiles without errors.
 * Uses TypeScript compiler API to validate generated code in virtual workspace.
 *
 * @module monorepo-library-generator/integration-tests
 */
import type { Tree } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"

import { contractGenerator } from "../contract/contract"
import { dataAccessGenerator } from "../data-access/data-access"
import { featureGenerator } from "../feature/feature"
import { infraGenerator } from "../infra/infra"
import { providerGenerator } from "../provider/provider"
import { compileTreeFiles } from "./utils/compiler"

// ============================================================================
// Contract Generator Compilation Tests
// ============================================================================

describe("Contract Generator - Compilation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it("should generate compilable code with default options", async () => {
    await contractGenerator(tree, { name: "product" })

    const result = compileTreeFiles(tree, "libs/contract/product/src")
    expect(result.success).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
  })

  it("should generate compilable code with CQRS option", async () => {
    await contractGenerator(tree, { name: "order", includeCQRS: true })

    const result = compileTreeFiles(tree, "libs/contract/order/src")
    expect(result.success).toBe(true)
  })

  it("should generate compilable code (RPC always prewired)", async () => {
    await contractGenerator(tree, { name: "user" })

    const result = compileTreeFiles(tree, "libs/contract/user/src")
    expect(result.success).toBe(true)
  })

  it("should generate compilable code with CQRS option", async () => {
    await contractGenerator(tree, {
      name: "payment",
      includeCQRS: true
    })

    const result = compileTreeFiles(tree, "libs/contract/payment/src")
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Data Access Generator Compilation Tests
// ============================================================================

describe("Data Access Generator - Compilation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it("should generate compilable code with default options", async () => {
    await dataAccessGenerator(tree, { name: "product" })

    const result = compileTreeFiles(tree, "libs/data-access/product/src")
    expect(result.success).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
  })

  it("should generate compilable code with CQRS option", async () => {
    await dataAccessGenerator(tree, { name: "order", includeCQRS: true })

    const result = compileTreeFiles(tree, "libs/data-access/order/src")
    expect(result.success).toBe(true)
  })

  it("should generate compilable code with multiple operations", async () => {
    await dataAccessGenerator(tree, {
      name: "user",
      operations: ["create", "read", "update", "delete", "list", "count"]
    })

    const result = compileTreeFiles(tree, "libs/data-access/user/src")
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Feature Generator Compilation Tests
// ============================================================================

describe("Feature Generator - Compilation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it("should generate compilable code with default options", async () => {
    await featureGenerator(tree, { name: "product" })

    const result = compileTreeFiles(tree, "libs/feature/product/src")
    expect(result.success).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
  })

  it("should generate compilable code with sub-modules", async () => {
    await featureGenerator(tree, {
      name: "order",
      subModules: ["validation", "pricing", "notification"]
    })

    const result = compileTreeFiles(tree, "libs/feature/order/src")
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Infrastructure Generator Compilation Tests
// ============================================================================

describe("Infrastructure Generator - Compilation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it("should generate compilable code with default options", async () => {
    await infraGenerator(tree, { name: "cache" })

    const result = compileTreeFiles(tree, "libs/infra/cache/src")
    expect(result.success).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
  })

  it("should generate compilable code for generic infra (prewired)", async () => {
    // Client/server is always prewired for generic infra
    await infraGenerator(tree, { name: "storage" })

    const result = compileTreeFiles(tree, "libs/infra/storage/src")
    expect(result.success).toBe(true)
  })

  it("should generate compilable code for non-primitive infra", async () => {
    // Generic infra names get full prewired integration
    await infraGenerator(tree, { name: "notification" })

    const result = compileTreeFiles(tree, "libs/infra/notification/src")
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Provider Generator Compilation Tests
// ============================================================================

describe("Provider Generator - Compilation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it("should generate compilable code with default options", async () => {
    await providerGenerator(tree, { name: "stripe", externalService: "Stripe API" })

    const result = compileTreeFiles(tree, "libs/provider/stripe/src")
    expect(result.success).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
  })

  it("should generate compilable code with operations", async () => {
    await providerGenerator(tree, {
      name: "twilio",
      externalService: "Twilio API",
      operations: ["create", "read", "update", "delete", "query"]
    })

    const result = compileTreeFiles(tree, "libs/provider/twilio/src")
    expect(result.success).toBe(true)
  })
})
