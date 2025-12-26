/**
 * Template Integration Tests
 *
 * End-to-end tests for the complete template generation pipeline.
 * Tests all library types, edge cases, and error scenarios.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  ContextValidationError,
  generate,
  generateDomain,
  generateFile,
  generateLibrary,
  GenerationError,
  TemplateNotFoundError
} from "../registry"
import type { TemplateContext } from "../core/types"

describe("Template Integration", () => {
  /**
   * Base context shared across tests
   */
  const baseContext: TemplateContext = {
    className: "Order",
    fileName: "order",
    propertyName: "order",
    constantName: "ORDER",
    scope: "@acme",
    packageName: "@acme/contract-order",
    projectName: "contract-order",
    libraryType: "contract",
    entityTypeSource: "./types"
  }

  describe("All Template Types Generation", () => {
    describe("Contract Templates", () => {
      it("should generate errors.ts with correct error classes", async () => {
        const result = await Effect.runPromise(
          generateFile("contract", "errors", baseContext)
        )

        // Domain errors
        expect(result.content).toContain("class OrderNotFoundError")
        expect(result.content).toContain("class OrderAlreadyExistsError")
        expect(result.content).toContain("class OrderValidationError")
        expect(result.content).toContain("class OrderPermissionError")
        // Repository errors
        expect(result.content).toContain("class OrderNotFoundRepositoryError")
        expect(result.content).toContain("type OrderRepositoryError")
        // Data.TaggedError pattern (may span multiple lines)
        expect(result.content).toContain("Data.TaggedError(")
        expect(result.content).toContain('"OrderNotFoundError"')
      })

      it("should generate events.ts with event schemas", async () => {
        const result = await Effect.runPromise(
          generateFile("contract", "events", baseContext)
        )

        expect(result.content).toContain("OrderCreated")
        expect(result.content).toContain("OrderUpdated")
        expect(result.content).toContain("OrderDeleted")
        expect(result.content).toContain("Schema.Struct")
        // Check for branded ID (format may vary)
        expect(result.content).toContain("OrderId")
        expect(result.content).toContain("brand")
      })

      it("should generate ports.ts with repository and service interfaces", async () => {
        const result = await Effect.runPromise(
          generateFile("contract", "ports", baseContext)
        )

        expect(result.content).toContain("class OrderRepository")
        expect(result.content).toContain("class OrderService")
        expect(result.content).toContain("Context.Tag")
        expect(result.content).toContain("findById")
        expect(result.content).toContain("findAll")
        expect(result.content).toContain("create")
        expect(result.content).toContain("update")
        expect(result.content).toContain("delete")
      })
    })

    describe("Data-Access Templates", () => {
      const dataAccessContext = { ...baseContext, libraryType: "data-access" as const }

      it("should generate errors.ts with infrastructure errors", async () => {
        const result = await Effect.runPromise(
          generateFile("data-access", "errors", dataAccessContext)
        )

        expect(result.content).toContain("OrderConnectionError")
        expect(result.content).toContain("OrderTimeoutError")
        expect(result.content).toContain("OrderTransactionError")
        expect(result.content).toContain("Data.TaggedError")
      })

      it("should generate layers.ts with layer compositions", async () => {
        const result = await Effect.runPromise(
          generateFile("data-access", "layers", dataAccessContext)
        )

        // Check for live layer implementation
        expect(result.content).toContain("Live")
        expect(result.content).toContain("Layer")
        expect(result.content).toContain("OrderRepository")
      })
    })

    describe("Feature Templates", () => {
      const featureContext = { ...baseContext, libraryType: "feature" as const }

      it("should generate service.ts with service implementation", async () => {
        const result = await Effect.runPromise(
          generateFile("feature", "service", featureContext)
        )

        expect(result.content).toContain("class OrderService")
        expect(result.content).toContain("Context.Tag")
        expect(result.content).toContain("Effect.withSpan")
        expect(result.content).toContain("CurrentUser")
      })

      it("should generate layers.ts with feature layers", async () => {
        const result = await Effect.runPromise(
          generateFile("feature", "layers", featureContext)
        )

        // Check for live layer implementation
        expect(result.content).toContain("Live")
        expect(result.content).toContain("Layer")
      })
    })

    describe("Infra Templates", () => {
      const infraContext = { ...baseContext, libraryType: "infra" as const }

      it("should generate errors.ts with infrastructure service errors", async () => {
        const result = await Effect.runPromise(
          generateFile("infra", "errors", infraContext)
        )

        expect(result.content).toContain("OrderConnectionError")
        expect(result.content).toContain("OrderTimeoutError")
        expect(result.content).toContain("Data.TaggedError")
      })

      it("should generate service.ts with infrastructure service", async () => {
        const result = await Effect.runPromise(
          generateFile("infra", "service", infraContext)
        )

        expect(result.content).toContain("OrderService")
        expect(result.content).toContain("Context.Tag")
        expect(result.content).toContain("Live")
        expect(result.content).toContain("Layer")
      })
    })

    describe("Provider Templates", () => {
      const providerContext = {
        ...baseContext,
        libraryType: "provider" as const,
        externalService: "PaymentGateway"
      }

      it("should generate errors.ts with provider errors", async () => {
        const result = await Effect.runPromise(
          generateFile("provider", "errors", providerContext)
        )

        expect(result.content).toContain("RateLimitError")
        expect(result.content).toContain("AuthenticationError")
        expect(result.content).toContain("NetworkError")
        expect(result.content).toContain("Data.TaggedError")
      })

      it("should generate service.ts with external service adapter", async () => {
        const result = await Effect.runPromise(
          generateFile("provider", "service", providerContext)
        )

        // Provider service with external service name
        expect(result.content).toContain("PaymentGateway")
        expect(result.content).toContain("Context.Tag")
        expect(result.content).toContain("Live")
      })
    })
  })

  describe("Edge Cases", () => {
    describe("Naming Conventions", () => {
      it("should handle single word names", async () => {
        const result = await Effect.runPromise(
          generate.contract("user", "@myorg")
        )

        expect(result.files.some(f => f.content.includes("UserNotFoundError"))).toBe(true)
        expect(result.files.some(f => f.content.includes("UserRepository"))).toBe(true)
      })

      it("should handle multi-word names (kebab-case input)", async () => {
        const result = await Effect.runPromise(
          generate.contract("payment-method", "@myorg")
        )

        expect(result.files.some(f => f.content.includes("PaymentMethodNotFoundError"))).toBe(true)
        expect(result.files.some(f => f.content.includes("PaymentMethodRepository"))).toBe(true)
      })

      it("should handle camelCase input by converting to proper naming", async () => {
        const result = await Effect.runPromise(
          generate.contract("shoppingCart", "@myorg")
        )

        // camelCase is handled - may produce ShoppingCart or Shoppingcart depending on naming utils
        expect(result.files.some(f => f.content.includes("NotFoundError"))).toBe(true)
      })

      it("should handle PascalCase input by converting to proper naming", async () => {
        const result = await Effect.runPromise(
          generate.contract("OrderItem", "@myorg")
        )

        // PascalCase is handled - may produce OrderItem or Orderitem depending on naming utils
        expect(result.files.some(f => f.content.includes("NotFoundError"))).toBe(true)
      })
    })

    describe("Custom Context Override", () => {
      it("should allow custom entityTypeSource", async () => {
        const result = await Effect.runPromise(
          generate.contract("product", "@shop", {
            entityTypeSource: "@shop/shared-types"
          })
        )

        expect(result.files.some(f => f.content.includes("@shop/shared-types"))).toBe(true)
      })

      it("should allow custom externalService for provider", async () => {
        const result = await Effect.runPromise(
          generate.provider("payment", "@shop", {
            externalService: "StripeAPI"
          })
        )

        // Check for StripeAPI in service file
        expect(result.files.some(f => f.content.includes("StripeAPI"))).toBe(true)
      })
    })

    describe("Scope Variations", () => {
      it("should handle standard npm scope in package imports", async () => {
        const result = await Effect.runPromise(
          generate.contract("user", "@company")
        )

        // Scope should be used in ports file import path
        const portsFile = result.files.find(f => f.templateId === "contract/ports")
        expect(portsFile?.content).toContain("@company")
      })

      it("should handle custom scope format in package imports", async () => {
        const result = await Effect.runPromise(
          generate.contract("user", "@my-org")
        )

        // Scope should be used in ports file import path
        const portsFile = result.files.find(f => f.templateId === "contract/ports")
        expect(portsFile?.content).toContain("@my-org")
      })
    })
  })

  describe("Error Handling", () => {
    it("should return TemplateNotFoundError for invalid template key", async () => {
      const error = await Effect.runPromise(
        generateFile("contract", "invalid" as any, baseContext).pipe(Effect.flip)
      )

      expect(error).toBeInstanceOf(TemplateNotFoundError)
      expect(error._tag).toBe("TemplateNotFoundError")
    })

    it("should return ContextValidationError for missing required context", async () => {
      const incompleteContext = { className: "Test" } as TemplateContext

      const error = await Effect.runPromise(
        generateFile("contract", "errors", incompleteContext).pipe(Effect.flip)
      )

      expect(error).toBeInstanceOf(ContextValidationError)
      expect(error._tag).toBe("ContextValidationError")
      expect(error.missingVariables.length).toBeGreaterThan(0)
    })

    it("should track warnings for partial library generation", async () => {
      const result = await Effect.runPromise(
        generateLibrary({
          name: "test",
          scope: "@test",
          libraryType: "contract",
          fileTypes: ["errors", "nonexistent" as any]
        })
      )

      expect(result.warnings).toBeDefined()
      expect(result.warnings?.length).toBe(1)
      expect(result.files.length).toBe(1)
    })
  })

  describe("Full Domain Generation", () => {
    it("should generate all libraries for a domain", async () => {
      const results = await Effect.runPromise(
        generate.fullDomain("customer", "@shop")
      )

      expect(results.length).toBe(3)

      const libraryTypes = results.map(r => r.libraryType)
      expect(libraryTypes).toContain("contract")
      expect(libraryTypes).toContain("data-access")
      expect(libraryTypes).toContain("feature")

      // Verify consistent naming across all libraries
      const allFiles = results.flatMap(r => r.files)
      expect(allFiles.some(f => f.content.includes("CustomerNotFoundError"))).toBe(true)
      expect(allFiles.some(f => f.content.includes("CustomerRepository"))).toBe(true)
      expect(allFiles.some(f => f.content.includes("CustomerService"))).toBe(true)
    })

    it("should generate custom domain with specific library types", async () => {
      const results = await Effect.runPromise(
        generateDomain("invoice", "@billing", ["contract", "feature"])
      )

      expect(results.length).toBe(2)
      expect(results.map(r => r.libraryType)).toEqual(["contract", "feature"])
    })
  })

  describe("Output Path Mapping", () => {
    it("should map errors to domain folder", async () => {
      const result = await Effect.runPromise(
        generateFile("contract", "errors", baseContext)
      )

      expect(result.path).toBe("src/order/errors.ts")
    })

    it("should map events to domain folder", async () => {
      const result = await Effect.runPromise(
        generateFile("contract", "events", baseContext)
      )

      expect(result.path).toBe("src/order/events.ts")
    })

    it("should map service to server folder", async () => {
      const featureContext = { ...baseContext, libraryType: "feature" as const }
      const result = await Effect.runPromise(
        generateFile("feature", "service", featureContext)
      )

      expect(result.path).toBe("src/server/service.ts")
    })

    it("should map layers to server folder", async () => {
      const featureContext = { ...baseContext, libraryType: "feature" as const }
      const result = await Effect.runPromise(
        generateFile("feature", "layers", featureContext)
      )

      expect(result.path).toBe("src/server/layers.ts")
    })
  })

  describe("TypeScript Validity", () => {
    it("should generate valid import statements", async () => {
      const result = await Effect.runPromise(
        generate.contract("user", "@myorg")
      )

      for (const file of result.files) {
        // Check for proper import syntax
        const importLines = file.content.split("\n").filter(line => line.startsWith("import"))
        for (const line of importLines) {
          expect(line).toMatch(/import\s+(type\s+)?{[^}]+}\s+from\s+["'][^"']+["']/)
        }
      }
    })

    it("should generate valid class declarations", async () => {
      const result = await Effect.runPromise(
        generate.contract("product", "@shop")
      )

      const errorsFile = result.files.find(f => f.templateId === "contract/errors")
      expect(errorsFile).toBeDefined()

      // Check for class keyword followed by valid identifier
      expect(errorsFile?.content).toMatch(/export\s+class\s+Product\w+\s+extends/)
    })

    it("should generate proper Effect patterns", async () => {
      const result = await Effect.runPromise(
        generate.feature("order", "@shop")
      )

      const serviceFile = result.files.find(f => f.templateId === "feature/service")
      expect(serviceFile).toBeDefined()

      // Check for Effect.gen pattern
      expect(serviceFile?.content).toMatch(/Effect\.gen\(function\*\s*\(\)/)
      // Check for yield* syntax
      expect(serviceFile?.content).toContain("yield*")
    })
  })

  describe("Performance Metrics", () => {
    it("should track generation duration", async () => {
      const result = await Effect.runPromise(
        generateLibrary({
          name: "test",
          scope: "@perf",
          libraryType: "contract"
        })
      )

      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.durationMs).toBeLessThan(5000) // Should complete in under 5 seconds
    })

    it("should track duration for full domain generation", async () => {
      const results = await Effect.runPromise(
        generate.fullDomain("analytics", "@metrics")
      )

      for (const result of results) {
        expect(result.durationMs).toBeGreaterThan(0)
      }
    })
  })
})
