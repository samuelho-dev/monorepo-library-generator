/**
 * Feature Template Definition Tests
 *
 * Tests for the declarative feature template definitions.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { TemplateCompiler } from "../core/compiler"
import type { TemplateContext, TemplateDefinition } from "../core/types"
import {
  featureLayersTemplate,
  featureServiceTemplate
} from "../definitions"

/**
 * Compile a template using the Effect service pattern
 */
const compile = (template: TemplateDefinition, ctx: TemplateContext) =>
  Effect.gen(function* () {
    const compiler = yield* TemplateCompiler
    return yield* compiler.compile(template, ctx)
  }).pipe(Effect.provide(TemplateCompiler.Test))

describe("Feature Template Definitions", () => {
  const context: TemplateContext = {
    className: "User",
    fileName: "user",
    propertyName: "user",
    constantName: "USER",
    scope: "@myorg",
    packageName: "@myorg/feature-user",
    projectName: "feature-user",
    libraryType: "feature"
  }

  describe("featureServiceTemplate", () => {
    it("should have correct metadata", () => {
      expect(featureServiceTemplate.id).toBe("feature/service")
      expect(featureServiceTemplate.meta.title).toBe("{className} Service Interface")
    })

    it("should compile with service implementation", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("createServiceImpl")
      expect(result).toContain("get:")
      expect(result).toContain("findByCriteria:")
      expect(result).toContain("count:")
      expect(result).toContain("create:")
      expect(result).toContain("update:")
      expect(result).toContain("delete:")
      expect(result).toContain("exists:")
    })

    it("should compile with Context.Tag", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("class UserService extends Context.Tag")
      expect(result).toContain('Context.Tag("UserService")')
    })

    it("should compile with static layers", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("static readonly Live")
      expect(result).toContain("static readonly Test")
      expect(result).toContain("static readonly Dev")
      expect(result).toContain("static readonly Auto")
      expect(result).toContain("static readonly Layer")
      expect(result).toContain("static readonly TestLayer")
    })

    it("should compile with event schema", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("UserEventSchema")
      expect(result).toContain("UserCreated")
      expect(result).toContain("UserUpdated")
      expect(result).toContain("UserDeleted")
      expect(result).toContain("type UserEvent")
    })

    it("should compile with service interface type", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("type UserServiceInterface = ReturnType<typeof createServiceImpl>")
    })

    it("should include Effect imports", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain('import { Effect, Layer, Context, Option, Schema } from "effect"')
    })

    it("should include infrastructure imports", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("LoggingService")
      expect(result).toContain("MetricsService")
      expect(result).toContain("PubsubService")
      expect(result).toContain("DatabaseService")
    })

    it("should include repository import", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain('import { UserRepository } from "@myorg/data-access-user"')
    })

    it("should include CurrentUser for authentication", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("CurrentUser")
      expect(result).toContain("currentUser")
    })

    it("should include observability (logging, metrics, tracing)", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("logger.debug")
      expect(result).toContain("logger.info")
      expect(result).toContain("metrics.histogram")
      expect(result).toContain("metrics.counter")
      expect(result).toContain("Effect.withSpan")
    })

    it("should export type aliases", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("export type { User, UserCreateInput, UserUpdateInput, UserFilter }")
    })
  })

  describe("featureLayersTemplate", () => {
    it("should have correct metadata", () => {
      expect(featureLayersTemplate.id).toBe("feature/layers")
      expect(featureLayersTemplate.meta.title).toBe("{className} Layers")
    })

    it("should compile with infrastructure layers", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain("InfrastructureLive")
      expect(result).toContain("InfrastructureDev")
      expect(result).toContain("InfrastructureTest")
    })

    it("should compile with feature layers", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain("UserFeatureLive")
      expect(result).toContain("UserFeatureDev")
      expect(result).toContain("UserFeatureTest")
    })

    it("should compile with auto layer", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain("UserFeatureAuto")
      expect(result).toContain("Layer.suspend")
      expect(result).toContain("env.NODE_ENV")
    })

    it("should include Layer import", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain('import { Layer } from "effect"')
    })

    it("should include all infrastructure service imports", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain("DatabaseService")
      expect(result).toContain("LoggingService")
      expect(result).toContain("MetricsService")
      expect(result).toContain("CacheService")
      expect(result).toContain("PubsubService")
    })

    it("should include service import", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain('import { UserService } from "./service"')
    })

    it("should include repository import", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain('import { UserRepository } from "@myorg/data-access-user"')
    })

    it("should use Layer.mergeAll pattern", async () => {
      const result = await Effect.runPromise(
        compile(featureLayersTemplate, context)
      )

      expect(result).toContain("Layer.mergeAll")
      expect(result).toContain("Layer.provide")
    })
  })

  describe("Variable interpolation", () => {
    it("should interpolate className in service template", async () => {
      const orderContext: TemplateContext = {
        ...context,
        className: "Order",
        fileName: "order",
        propertyName: "order"
      }

      const result = await Effect.runPromise(
        compile(featureServiceTemplate, orderContext)
      )

      expect(result).toContain("OrderService")
      expect(result).toContain("OrderRepository")
      expect(result).toContain("OrderEventSchema")
      expect(result).toContain("OrderCreated")
      expect(result).toContain("OrderNotFoundError")
    })

    it("should interpolate className in layers template", async () => {
      const orderContext: TemplateContext = {
        ...context,
        className: "Order",
        fileName: "order",
        propertyName: "order"
      }

      const result = await Effect.runPromise(
        compile(featureLayersTemplate, orderContext)
      )

      expect(result).toContain("OrderFeatureLive")
      expect(result).toContain("OrderFeatureDev")
      expect(result).toContain("OrderFeatureTest")
      expect(result).toContain("OrderFeatureAuto")
    })

    it("should interpolate scope in imports", async () => {
      const customScopeContext: TemplateContext = {
        ...context,
        scope: "@acme"
      }

      const result = await Effect.runPromise(
        compile(featureServiceTemplate, customScopeContext)
      )

      expect(result).toContain("@acme/contract-user")
      expect(result).toContain("@acme/data-access-user")
      expect(result).toContain("@acme/infra-database")
    })

    it("should interpolate propertyName in metrics", async () => {
      const result = await Effect.runPromise(
        compile(featureServiceTemplate, context)
      )

      expect(result).toContain("user_get_duration_seconds")
      expect(result).toContain("user_created_total")
      expect(result).toContain("user_updated_total")
      expect(result).toContain("user_deleted_total")
    })
  })
})
