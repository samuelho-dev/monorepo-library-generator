/**
 * Infrastructure Template Definition Tests
 *
 * Tests for the declarative infrastructure template definitions.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { TemplateCompiler } from "../core/compiler"
import type { TemplateContext, TemplateDefinition } from "../core/types"
import {
  infraErrorsTemplate,
  infraServiceTemplate
} from "../definitions"

/**
 * Compile a template using the Effect service pattern
 */
const compile = (template: TemplateDefinition, ctx: TemplateContext) =>
  Effect.gen(function* () {
    const compiler = yield* TemplateCompiler
    return yield* compiler.compile(template, ctx)
  }).pipe(Effect.provide(TemplateCompiler.Test))

describe("Infrastructure Template Definitions", () => {
  const context: TemplateContext = {
    className: "Cache",
    fileName: "cache",
    propertyName: "cache",
    constantName: "CACHE",
    scope: "@myorg",
    packageName: "@myorg/infra-cache",
    projectName: "infra-cache",
    libraryType: "infra"
  }

  describe("infraErrorsTemplate", () => {
    it("should have correct metadata", () => {
      expect(infraErrorsTemplate.id).toBe("infra/errors")
      expect(infraErrorsTemplate.meta.title).toBe("{className} Service Errors")
    })

    it("should compile with all error types", async () => {
      const result = await Effect.runPromise(
        compile(infraErrorsTemplate, context)
      )

      // Check all error types
      expect(result).toContain("class CacheBaseError")
      expect(result).toContain("class CacheNotFoundError")
      expect(result).toContain("class CacheValidationError")
      expect(result).toContain("class CacheConflictError")
      expect(result).toContain("class CacheConfigError")
      expect(result).toContain("class CacheConnectionError")
      expect(result).toContain("class CacheTimeoutError")
      expect(result).toContain("class CacheInternalError")
    })

    it("should compile with error union type", async () => {
      const result = await Effect.runPromise(
        compile(infraErrorsTemplate, context)
      )

      expect(result).toContain("type CacheServiceError")
      expect(result).toContain("CacheBaseError")
      expect(result).toContain("CacheNotFoundError")
      expect(result).toContain("CacheInternalError")
    })

    it("should include Data import", async () => {
      const result = await Effect.runPromise(
        compile(infraErrorsTemplate, context)
      )

      expect(result).toContain('import { Data } from "effect"')
    })

    it("should include static create methods", async () => {
      const result = await Effect.runPromise(
        compile(infraErrorsTemplate, context)
      )

      expect(result).toContain("static create(")
    })
  })

  describe("infraServiceTemplate", () => {
    it("should have correct metadata", () => {
      expect(infraServiceTemplate.id).toBe("infra/service")
      expect(infraServiceTemplate.meta.title).toBe("{className} Service")
    })

    it("should compile with Context.Tag", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("class CacheService extends Context.Tag")
      expect(result).toContain("@myorg/infra-cache/CacheService")
    })

    it("should compile with service interface", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("readonly get:")
      expect(result).toContain("readonly findByCriteria:")
      expect(result).toContain("readonly create:")
      expect(result).toContain("readonly update:")
      expect(result).toContain("readonly delete:")
      expect(result).toContain("readonly healthCheck:")
    })

    it("should compile with static layers", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("static readonly Live")
      expect(result).toContain("static readonly Test")
      expect(result).toContain("static readonly Dev")
      expect(result).toContain("static readonly Auto")
    })

    it("should include Effect imports", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain('import { Effect, Layer, Option, Context } from "effect"')
    })

    it("should include error imports", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("CacheInternalError")
      expect(result).toContain("CacheNotFoundError")
      expect(result).toContain("CacheServiceError")
    })

    it("should include dev layer with logging", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("Effect.logDebug")
      expect(result).toContain("[Cache] [DEV]")
    })

    it("should include auto layer with environment detection", async () => {
      const result = await Effect.runPromise(
        compile(infraServiceTemplate, context)
      )

      expect(result).toContain("Layer.suspend")
      expect(result).toContain("env.NODE_ENV")
      expect(result).toContain("CacheService.Test")
      expect(result).toContain("CacheService.Dev")
      expect(result).toContain("CacheService.Live")
    })
  })

  describe("Variable interpolation", () => {
    it("should interpolate className in errors template", async () => {
      const dbContext: TemplateContext = {
        ...context,
        className: "Database",
        fileName: "database",
        propertyName: "database"
      }

      const result = await Effect.runPromise(
        compile(infraErrorsTemplate, dbContext)
      )

      expect(result).toContain("DatabaseBaseError")
      expect(result).toContain("DatabaseNotFoundError")
      expect(result).toContain("DatabaseServiceError")
    })

    it("should interpolate className in service template", async () => {
      const dbContext: TemplateContext = {
        ...context,
        className: "Database",
        fileName: "database",
        propertyName: "database"
      }

      const result = await Effect.runPromise(
        compile(infraServiceTemplate, dbContext)
      )

      expect(result).toContain("DatabaseService")
      expect(result).toContain("@myorg/infra-database/DatabaseService")
    })

    it("should interpolate scope in imports", async () => {
      const customScopeContext: TemplateContext = {
        ...context,
        scope: "@acme"
      }

      const result = await Effect.runPromise(
        compile(infraServiceTemplate, customScopeContext)
      )

      expect(result).toContain("@acme/env")
      expect(result).toContain("@acme/infra-cache")
    })
  })
})
