/**
 * Data Access Template Definition Tests
 *
 * Tests for the declarative data-access template definitions.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { createCompiler } from "../core/compiler"
import type { TemplateContext } from "../core/types"
import {
  dataAccessErrorsTemplate,
  dataAccessLayersTemplate
} from "../definitions"

describe("Data Access Template Definitions", () => {
  const context: TemplateContext = {
    className: "User",
    fileName: "user",
    propertyName: "user",
    constantName: "USER",
    scope: "@myorg",
    packageName: "@myorg/data-access-user",
    projectName: "data-access-user",
    libraryType: "data-access"
  }

  describe("dataAccessErrorsTemplate", () => {
    it("should have correct metadata", () => {
      expect(dataAccessErrorsTemplate.id).toBe("data-access/errors")
      expect(dataAccessErrorsTemplate.meta.title).toBe("{className} Data Access Infrastructure Errors")
    })

    it("should compile with infrastructure errors", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      // Check infrastructure errors
      expect(result).toContain("class UserConnectionError")
      expect(result).toContain("class UserTimeoutError")
      expect(result).toContain("class UserTransactionError")
    })

    it("should compile with infrastructure error union", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain("type UserInfrastructureError")
      expect(result).toContain("UserConnectionError")
      expect(result).toContain("UserTimeoutError")
      expect(result).toContain("UserTransactionError")
    })

    it("should compile with combined data access error type", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain("type UserDataAccessError = UserRepositoryError | UserInfrastructureError")
    })

    it("should include Data import", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain('import { Data } from "effect"')
    })

    it("should include contract repository error import", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain('import type { UserRepositoryError } from "@myorg/contract-user"')
    })

    it("should contain static create methods", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain("static create(")
    })

    it("should contain contract-first documentation", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, context)
      )

      expect(result).toContain("CONTRACT-FIRST ARCHITECTURE")
      expect(result).toContain("import directly from there")
    })
  })

  describe("dataAccessLayersTemplate", () => {
    it("should have correct metadata", () => {
      expect(dataAccessLayersTemplate.id).toBe("data-access/layers")
      expect(dataAccessLayersTemplate.meta.title).toBe("{className} Data Access Layers")
    })

    it("should compile with infrastructure layers", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain("InfrastructureLive")
      expect(result).toContain("InfrastructureDev")
      expect(result).toContain("InfrastructureTest")
    })

    it("should compile with domain layers", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain("UserDataAccessLive")
      expect(result).toContain("UserDataAccessDev")
      expect(result).toContain("UserDataAccessTest")
    })

    it("should compile with auto layer", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain("UserDataAccessAuto")
      expect(result).toContain("Layer.suspend")
      expect(result).toContain("env.NODE_ENV")
    })

    it("should include Layer import", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain('import { Layer } from "effect"')
    })

    it("should include infrastructure service imports", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain("DatabaseService")
      expect(result).toContain("LoggingService")
      expect(result).toContain("MetricsService")
      expect(result).toContain("CacheService")
    })

    it("should include repository import", async () => {
      const compiler = createCompiler()
      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, context)
      )

      expect(result).toContain("UserRepository")
    })
  })

  describe("Variable interpolation", () => {
    it("should interpolate className in errors template", async () => {
      const compiler = createCompiler()
      const orderContext: TemplateContext = {
        ...context,
        className: "Order",
        fileName: "order",
        propertyName: "order"
      }

      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, orderContext)
      )

      expect(result).toContain("OrderConnectionError")
      expect(result).toContain("OrderTimeoutError")
      expect(result).toContain("OrderTransactionError")
      expect(result).toContain("OrderInfrastructureError")
      expect(result).toContain("OrderDataAccessError")
    })

    it("should interpolate className in layers template", async () => {
      const compiler = createCompiler()
      const orderContext: TemplateContext = {
        ...context,
        className: "Order",
        fileName: "order",
        propertyName: "order"
      }

      const result = await Effect.runPromise(
        compiler.compile(dataAccessLayersTemplate, orderContext)
      )

      expect(result).toContain("OrderDataAccessLive")
      expect(result).toContain("OrderDataAccessDev")
      expect(result).toContain("OrderDataAccessTest")
      expect(result).toContain("OrderDataAccessAuto")
    })

    it("should interpolate scope in imports", async () => {
      const compiler = createCompiler()
      const customScopeContext: TemplateContext = {
        ...context,
        scope: "@acme"
      }

      const result = await Effect.runPromise(
        compiler.compile(dataAccessErrorsTemplate, customScopeContext)
      )

      expect(result).toContain("@acme/contract-user")
    })
  })
})
