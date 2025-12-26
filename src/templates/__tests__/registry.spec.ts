/**
 * Template Registry Tests
 *
 * Tests for the template registry and generator.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { TemplateCompiler } from "../core/compiler"
import {
  createTemplateRegistry,
  generate,
  generateFile,
  generateLibrary,
  getAvailableFileTypes,
  getRegisteredLibraryTypes,
  getTemplate,
  getTemplateRegistry,
  hasTemplate,
  validateContext
} from "../registry"
import type { LibraryType, TemplateContext } from "../registry"

/**
 * Run an effect with TemplateCompiler.Test layer
 */
const runWithCompiler = <A, E>(effect: Effect.Effect<A, E, TemplateCompiler>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TemplateCompiler.Test)))

describe("Template Registry", () => {
  describe("createTemplateRegistry", () => {
    it("should create a new registry instance", () => {
      const registry = createTemplateRegistry()
      expect(registry).toBeDefined()
      expect(registry.size()).toBeGreaterThan(0)
    })

    it("should return same instance from getTemplateRegistry", () => {
      const registry1 = getTemplateRegistry()
      const registry2 = getTemplateRegistry()
      expect(registry1).toBe(registry2)
    })
  })

  describe("registry.get", () => {
    it("should get contract/errors template", () => {
      const registry = getTemplateRegistry()
      const entry = registry.get("contract/errors")

      expect(entry).toBeDefined()
      expect(entry?.template.id).toBe("contract/errors")
      expect(entry?.metadata.libraryType).toBe("contract")
      expect(entry?.metadata.fileType).toBe("errors")
    })

    it("should get feature/service template", () => {
      const registry = getTemplateRegistry()
      const entry = registry.get("feature/service")

      expect(entry).toBeDefined()
      expect(entry?.template.id).toBe("feature/service")
      expect(entry?.metadata.libraryType).toBe("feature")
    })

    it("should return undefined for unknown template", () => {
      const registry = getTemplateRegistry()
      const entry = registry.get("unknown/template" as any)

      expect(entry).toBeUndefined()
    })
  })

  describe("registry.getByLibraryType", () => {
    it("should get all contract templates", () => {
      const registry = getTemplateRegistry()
      const entries = registry.getByLibraryType("contract")

      expect(entries.length).toBe(3)
      expect(entries.map(e => e.metadata.fileType)).toContain("errors")
      expect(entries.map(e => e.metadata.fileType)).toContain("events")
      expect(entries.map(e => e.metadata.fileType)).toContain("ports")
    })

    it("should get all feature templates", () => {
      const registry = getTemplateRegistry()
      const entries = registry.getByLibraryType("feature")

      expect(entries.length).toBe(2)
      expect(entries.map(e => e.metadata.fileType)).toContain("service")
      expect(entries.map(e => e.metadata.fileType)).toContain("layers")
    })

    it("should return empty array for unknown library type", () => {
      const registry = getTemplateRegistry()
      const entries = registry.getByLibraryType("unknown" as LibraryType)

      expect(entries).toEqual([])
    })
  })

  describe("registry.keys", () => {
    it("should return all template keys", () => {
      const registry = getTemplateRegistry()
      const keys = registry.keys()

      expect(keys.length).toBe(11)
      expect(keys).toContain("contract/errors")
      expect(keys).toContain("feature/service")
      expect(keys).toContain("provider/errors")
    })
  })

  describe("registry.has", () => {
    it("should return true for existing template", () => {
      const registry = getTemplateRegistry()

      expect(registry.has("contract/errors")).toBe(true)
      expect(registry.has("feature/layers")).toBe(true)
    })

    it("should return false for non-existing template", () => {
      const registry = getTemplateRegistry()

      expect(registry.has("unknown/template" as any)).toBe(false)
    })
  })

  describe("getAvailableFileTypes", () => {
    it("should return file types for contract", () => {
      const fileTypes = getAvailableFileTypes("contract")

      expect(fileTypes).toContain("errors")
      expect(fileTypes).toContain("events")
      expect(fileTypes).toContain("ports")
    })

    it("should return file types for data-access", () => {
      const fileTypes = getAvailableFileTypes("data-access")

      expect(fileTypes).toContain("errors")
      expect(fileTypes).toContain("layers")
    })
  })

  describe("getTemplate", () => {
    it("should get template by library and file type", () => {
      const entry = getTemplate("infra", "service")

      expect(entry).toBeDefined()
      expect(entry?.template.id).toBe("infra/service")
    })
  })

  describe("hasTemplate", () => {
    it("should check if template exists", () => {
      expect(hasTemplate("provider", "errors")).toBe(true)
      expect(hasTemplate("provider", "index" as any)).toBe(false)
    })
  })

  describe("getRegisteredLibraryTypes", () => {
    it("should return all library types", () => {
      const types = getRegisteredLibraryTypes()

      expect(types).toContain("contract")
      expect(types).toContain("data-access")
      expect(types).toContain("feature")
      expect(types).toContain("infra")
      expect(types).toContain("provider")
    })
  })

  describe("validateContext", () => {
    it("should validate complete context", () => {
      const context = {
        className: "User",
        fileName: "user",
        propertyName: "user",
        constantName: "USER",
        scope: "@myorg",
        packageName: "@myorg/contract-user",
        projectName: "contract-user",
        libraryType: "contract"
      }

      const result = validateContext("contract/errors", context)

      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
    })

    it("should detect missing context variables", () => {
      const context = {
        className: "User",
        fileName: "user"
      }

      const result = validateContext("contract/errors", context)

      expect(result.valid).toBe(false)
      expect(result.missing).toContain("propertyName")
      expect(result.missing).toContain("scope")
    })

    it("should return invalid for unknown template", () => {
      const result = validateContext("unknown/template" as any, {})

      expect(result.valid).toBe(false)
      expect(result.missing).toContain("Template not found")
    })
  })
})

describe("Template Generator", () => {
  const context: TemplateContext = {
    className: "User",
    fileName: "user",
    propertyName: "user",
    constantName: "USER",
    scope: "@myorg",
    packageName: "@myorg/contract-user",
    projectName: "contract-user",
    libraryType: "contract"
  }

  describe("generateFile", () => {
    it("should generate contract/errors file", async () => {
      const result = await runWithCompiler(
        generateFile("contract", "errors", context)
      )

      expect(result.path).toBe("src/user/errors.ts")
      expect(result.templateId).toBe("contract/errors")
      expect(result.content).toContain("UserNotFoundError")
      expect(result.content).toContain("UserValidationError")
    })

    it("should generate feature/service file", async () => {
      const featureContext = { ...context, libraryType: "feature" as const }
      const result = await runWithCompiler(
        generateFile("feature", "service", featureContext)
      )

      expect(result.path).toBe("src/server/service.ts")
      expect(result.templateId).toBe("feature/service")
      expect(result.content).toContain("UserService")
      expect(result.content).toContain("Context.Tag")
    })

    it("should fail for unknown template", async () => {
      const result = await runWithCompiler(
        generateFile("contract", "unknown" as any, context).pipe(
          Effect.flip
        )
      )

      expect(result._tag).toBe("TemplateNotFoundError")
    })

    it("should fail for missing context", async () => {
      const incompleteContext = { className: "User" } as any
      const result = await runWithCompiler(
        generateFile("contract", "errors", incompleteContext).pipe(
          Effect.flip
        )
      )

      expect(result._tag).toBe("ContextValidationError")
    })
  })

  describe("generateLibrary", () => {
    it("should generate all contract files", async () => {
      const result = await runWithCompiler(
        generateLibrary({
          name: "user",
          scope: "@myorg",
          libraryType: "contract"
        })
      )

      expect(result.libraryType).toBe("contract")
      expect(result.files.length).toBe(3)
      expect(result.files.map(f => f.templateId)).toContain("contract/errors")
      expect(result.files.map(f => f.templateId)).toContain("contract/events")
      expect(result.files.map(f => f.templateId)).toContain("contract/ports")
      expect(result.durationMs).toBeGreaterThan(0)
    })

    it("should generate specific file types only", async () => {
      const result = await runWithCompiler(
        generateLibrary({
          name: "user",
          scope: "@myorg",
          libraryType: "contract",
          fileTypes: ["errors"]
        })
      )

      expect(result.files.length).toBe(1)
      expect(result.files[0].templateId).toBe("contract/errors")
    })

    it("should add warnings for missing templates", async () => {
      const result = await runWithCompiler(
        generateLibrary({
          name: "user",
          scope: "@myorg",
          libraryType: "contract",
          fileTypes: ["errors", "unknown" as any]
        })
      )

      expect(result.files.length).toBe(1)
      expect(result.warnings).toBeDefined()
      expect(result.warnings).toContain("Template not found: contract/unknown")
    })
  })

  describe("generate helpers", () => {
    it("should generate contract library", async () => {
      const result = await runWithCompiler(
        generate.contract("order", "@acme")
      )

      expect(result.libraryType).toBe("contract")
      expect(result.files.some(f => f.content.includes("OrderNotFoundError"))).toBe(true)
    })

    it("should generate data-access library", async () => {
      const result = await runWithCompiler(
        generate.dataAccess("order", "@acme")
      )

      expect(result.libraryType).toBe("data-access")
      expect(result.files.some(f => f.content.includes("OrderConnectionError"))).toBe(true)
    })

    it("should generate feature library", async () => {
      const result = await runWithCompiler(
        generate.feature("order", "@acme")
      )

      expect(result.libraryType).toBe("feature")
      expect(result.files.some(f => f.content.includes("OrderService"))).toBe(true)
    })

    it("should generate infra library", async () => {
      const result = await runWithCompiler(
        generate.infra("cache", "@acme")
      )

      expect(result.libraryType).toBe("infra")
      expect(result.files.some(f => f.content.includes("CacheService"))).toBe(true)
    })

    it("should generate provider library", async () => {
      const result = await runWithCompiler(
        generate.provider("stripe", "@acme", { externalService: "Stripe" })
      )

      expect(result.libraryType).toBe("provider")
      expect(result.files.some(f => f.content.includes("class Stripe"))).toBe(true)
    })

    it("should generate full domain", async () => {
      const results = await runWithCompiler(
        generate.fullDomain("product", "@acme")
      )

      expect(results.length).toBe(3)
      expect(results.map(r => r.libraryType)).toContain("contract")
      expect(results.map(r => r.libraryType)).toContain("data-access")
      expect(results.map(r => r.libraryType)).toContain("feature")
    })
  })
})
