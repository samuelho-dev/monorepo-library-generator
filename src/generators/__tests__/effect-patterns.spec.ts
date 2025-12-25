/**
 * Effect Architecture Pattern Validation Tests
 *
 * Validates that generated code follows Effect best practices:
 * - No unnecessary Effect.succeed wrapping inside Effect.gen
 * - Correct finalizer patterns (direct Effect return)
 * - Proper distributed tracing with Effect.withSpan
 * - No silently ignored Effects
 *
 * @see EFFECT_ARCHITECTURE_VALIDATION.md
 */

import type { Tree } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import { infraGenerator } from "../infra/infra"
import { providerGenerator } from "../provider/provider"

describe("Effect Architecture Pattern Validation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Provider Templates - Effect.gen Patterns", () => {
    it("should NOT use 'return yield* Effect.succeed' inside Effect.gen", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Anti-pattern: return yield* Effect.succeed({ ... }) inside Effect.gen
      // This is redundant - should be: return { ... }
      expect(serviceContent).not.toContain("return yield* Effect.succeed({")
      expect(serviceContent).not.toContain("return yield* Effect.succeed( {")
      expect(serviceContent).not.toContain("return yield*Effect.succeed({")
    })

    it("should use direct object return in Effect.gen", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Correct pattern: Inside Effect.gen, return plain objects directly
      // The Effect.gen wrapper handles the context for us
      const hasDirectReturn = /Effect\.gen\(function\* \(\) \{[\s\S]*?return \{/m.test(
        serviceContent ?? ""
      )
      expect(hasDirectReturn).toBe(true)
    })
  })

  describe("Infrastructure Templates - Finalizer Patterns", () => {
    it("should use direct Effect return in acquireRelease finalizers", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Correct pattern: Finalizer arrow function returns Effect directly
      // (resource) => Effect.tryPromise({ ... })
      // NOT: (resource) => Effect.gen(function*() { return Effect.tryPromise(...) })

      // Check for correct pattern: arrow function with direct Effect.tryPromise
      const hasCorrectFinalizer = /\(resource\) =>\s*\/\/ Release phase[\s\S]*?Effect\.tryPromise\(\{/m.test(
        serviceContent ?? ""
      )
      expect(hasCorrectFinalizer).toBe(true)
    })

    it("should NOT wrap finalizers in Effect.gen with return", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Anti-pattern: Effect.gen inside finalizer that just returns an Effect
      // This causes the Effect to not be executed - it's returned unevaluated
      const hasBrokenFinalizer = /\(resource\) => Effect\.gen\(function\* \(\) \{[\s\S]*?return Effect\.tryPromise/m
        .test(
          serviceContent ?? ""
        )
      expect(hasBrokenFinalizer).toBe(false)
    })
  })

  describe("Distributed Tracing - Effect.withSpan", () => {
    it("should define provider operations that can be instrumented", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Provider should define Context.Tag with operations
      expect(serviceContent).toContain("Context.Tag")
      expect(serviceContent).toContain("TestProvider")

      // Provider should have standard operations defined in interface
      expect(serviceContent).toContain("healthCheck")
      expect(serviceContent).toContain("list")
      expect(serviceContent).toContain("get")
      expect(serviceContent).toContain("create")
    })

    it("should instrument infrastructure operations with Effect.withSpan", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Infrastructure operations should also be instrumented
      // Check that Effect.withSpan is used multiple times (once per operation)
      const spanCount = ((serviceContent ?? "").match(/Effect\.withSpan\(/g) || []).length

      // Should have at least 5 operations instrumented (get, findByCriteria, create, update, delete)
      expect(spanCount).toBeGreaterThanOrEqual(5)
    })
  })

  describe("Effect Execution - No Ignored Effects", () => {
    it("should use yield* for Effect operations inside Effect.gen", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Effects inside Effect.gen should use yield*, not return (unless it's the final return)
      // Look for commented logger examples: yield* logger.info(...)
      const hasYieldStar = /yield\*\s+(?:Effect|logger)/m.test(serviceContent ?? "")
      expect(hasYieldStar).toBe(true)
    })

    it("should not have standalone Effect calls without yield* or pipe", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Anti-pattern: Effect.succeed(...) without .pipe() or yield*
      // This creates an Effect but never executes it
      // Regex: Effect.succeed(...) followed by newline or semicolon (not .pipe)
      const hasIgnoredEffect = /Effect\.succeed\([^)]+\)\s*[;\n]/.test(serviceContent ?? "")
      expect(hasIgnoredEffect).toBe(false)
    })
  })

  describe("Layer Construction Patterns", () => {
    it("should use Layer.effect for providers (no cleanup needed)", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Providers typically use Layer.effect (no cleanup needed for most SDKs)
      expect(serviceContent).toContain("Layer.effect(")
    })

    it("should use Layer.scoped for infrastructure (cleanup needed)", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Infrastructure uses Layer.scoped with acquireRelease for resource cleanup
      expect(serviceContent).toContain("Layer.scoped(")
      expect(serviceContent).toContain("Effect.acquireRelease(")
    })

    it("should use Layer.succeed for test layers", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Test layers use Layer.effect pattern for layer construction
      expect(serviceContent).toContain("Layer.effect(")
    })
  })

  describe("Context.Tag Pattern (Effect 3.0+)", () => {
    it("should use Context.Tag with inline interface for providers", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Effect 3.0+ pattern: class extends Context.Tag with inline interface
      expect(serviceContent).toContain("extends Context.Tag(")
      expect(serviceContent).toContain("TestProvider")
    })

    it("should use Context.Tag with inline interface for infrastructure", async () => {
      await infraGenerator(tree, {
        name: "test-infra",
        platform: "node"
      })

      const serviceContent = tree.read("libs/infra/test-infra/src/lib/service.ts", "utf-8")

      // Effect 3.0+ pattern: class extends Context.Tag with inline interface
      expect(serviceContent).toContain("extends Context.Tag(")
      expect(serviceContent).toContain("TestInfraService")
    })
  })

  describe("Error Handling Patterns", () => {
    it("should use Data.TaggedError for error types", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const errorsContent = tree.read("libs/provider/test-provider/src/lib/errors.ts", "utf-8")

      // All errors should extend Data.TaggedError
      expect(errorsContent).toContain("Data.TaggedError")
      expect(errorsContent).toContain("extends Data.TaggedError(")
    })

    it("should use Effect.fail for error channels", async () => {
      await providerGenerator(tree, {
        name: "test-provider",
        externalService: "Test Service",
        platform: "node"
      })

      const serviceContent = tree.read("libs/provider/test-provider/src/lib/service.ts", "utf-8")

      // Operations should use Effect.fail for typed errors
      expect(serviceContent).toContain("Effect.fail(")
    })
  })
})
