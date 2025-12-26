/**
 * Fragment Tests
 *
 * Tests for the fragment system and individual fragment renderers.
 */

import { Effect } from "effect"
import { Project } from "ts-morph"
import { describe, expect, it } from "vitest"
import type { TemplateContext } from "../core/types"
import {
  alreadyExistsErrorFragment,
  brandedIdFragment,
  commonSchemaFields,
  composedLayerFragment,
  createFragmentRegistry,
  domainErrorFragments,
  entitySchemaFragment,
  getFragmentRegistry,
  liveRepositoryLayerFragment,
  notFoundErrorFragment,
  permissionErrorFragment,
  renderContextTagFragment,
  renderLayerFragment,
  renderSchemaFragment,
  renderTaggedErrorFragment,
  repositoryFragment,
  serviceFragment,
  validationErrorFragment
} from "../fragments"

describe("Fragment System", () => {
  function createSourceFile() {
    const project = new Project({ useInMemoryFileSystem: true })
    return project.createSourceFile("test.ts", "")
  }

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

  describe("FragmentRegistry", () => {
    it("should create a fresh registry", () => {
      const registry = createFragmentRegistry()
      expect(registry).toBeDefined()
    })

    it("should return default registry", () => {
      const registry = getFragmentRegistry()
      expect(registry.has("taggedError")).toBe(true)
      expect(registry.has("contextTag")).toBe(true)
      expect(registry.has("schema")).toBe(true)
      expect(registry.has("layer")).toBe(true)
    })

    it("should list registered fragment types", () => {
      const registry = getFragmentRegistry()
      const types = registry.getTypes()
      expect(types).toContain("taggedError")
      expect(types).toContain("contextTag")
      expect(types).toContain("schema")
      expect(types).toContain("layer")
    })
  })

  describe("Error Fragments", () => {
    it("should render a simple tagged error", async () => {
      const sourceFile = createSourceFile()
      const config = notFoundErrorFragment("User", "userId")

      await Effect.runPromise(
        renderTaggedErrorFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserNotFoundError")
      expect(text).toContain("Data.TaggedError")
      expect(text).toContain("readonly message: string")
      expect(text).toContain("readonly userId: string")
      expect(text).toContain("static create")
    })

    it("should render validation error with multiple static methods", async () => {
      const sourceFile = createSourceFile()
      const config = validationErrorFragment("User")

      await Effect.runPromise(
        renderTaggedErrorFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserValidationError")
      expect(text).toContain("static create")
      expect(text).toContain("static fieldRequired")
      expect(text).toContain("static fieldInvalid")
    })

    it("should render already exists error", async () => {
      const sourceFile = createSourceFile()
      const config = alreadyExistsErrorFragment("User")

      await Effect.runPromise(
        renderTaggedErrorFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserAlreadyExistsError")
      expect(text).toContain("readonly identifier?: string")
    })

    it("should render permission error", async () => {
      const sourceFile = createSourceFile()
      const config = permissionErrorFragment("User", "userId")

      await Effect.runPromise(
        renderTaggedErrorFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserPermissionError")
      expect(text).toContain("readonly operation: string")
      expect(text).toContain("readonly userId: string")
    })

    it("should provide all domain error fragments", () => {
      const fragments = domainErrorFragments("User", "userId")
      expect(fragments).toHaveLength(4)
      expect(fragments.map((f) => f.className)).toEqual([
        "UserNotFoundError",
        "UserValidationError",
        "UserAlreadyExistsError",
        "UserPermissionError"
      ])
    })

    it("should interpolate variables in error config", async () => {
      const sourceFile = createSourceFile()
      const config = {
        className: "{className}NotFoundError",
        fields: [
          { name: "message", type: "string" },
          { name: "{propertyName}Id", type: "string" }
        ],
        jsdoc: "{className} not found error"
      }

      await Effect.runPromise(
        renderTaggedErrorFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserNotFoundError")
      expect(text).toContain("readonly userId: string")
      expect(text).toContain("User not found error")
    })
  })

  describe("Service Fragments", () => {
    it("should render a repository Context.Tag", async () => {
      const sourceFile = createSourceFile()
      const config = repositoryFragment("User", {
        scope: "@myorg",
        fileName: "user"
      })

      await Effect.runPromise(
        renderContextTagFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserRepository")
      expect(text).toContain("Context.Tag")
      expect(text).toContain("@myorg/contract-user/UserRepository")
      expect(text).toContain("readonly findById")
      expect(text).toContain("readonly findAll")
      expect(text).toContain("readonly create")
      expect(text).toContain("readonly update")
      expect(text).toContain("readonly delete")
      expect(text).toContain("readonly exists")
    })

    it("should render a service Context.Tag", async () => {
      const sourceFile = createSourceFile()
      const config = serviceFragment("User")

      await Effect.runPromise(
        renderContextTagFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserService")
      expect(text).toContain("readonly get")
      expect(text).toContain("readonly list")
    })

    it("should render Context.Tag with static layers", async () => {
      const sourceFile = createSourceFile()
      const config = {
        serviceName: "UserRepository",
        tagIdentifier: "@myorg/UserRepository",
        methods: [],
        staticLayers: [
          { name: "Live", implementation: "Layer.succeed(UserRepository, liveImpl)" },
          { name: "Test", implementation: "Layer.succeed(UserRepository, testImpl)" }
        ]
      }

      await Effect.runPromise(
        renderContextTagFragment(sourceFile, config, context)
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("static Live")
      expect(text).toContain("static Test")
      expect(text).toContain("Layer.succeed")
    })
  })

  describe("Schema Fragments", () => {
    it("should render a branded ID schema", async () => {
      const sourceFile = createSourceFile()
      const config = brandedIdFragment("User")

      await Effect.runPromise(renderSchemaFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("const UserId")
      expect(text).toContain("Schema.String")
      expect(text).toContain('Schema.brand("UserId")')
      expect(text).toContain("type UserId = Schema.Schema.Type")
    })

    it("should render an entity schema", async () => {
      const sourceFile = createSourceFile()
      const config = entitySchemaFragment("User", [
        commonSchemaFields.id(),
        commonSchemaFields.name(),
        commonSchemaFields.email(),
        commonSchemaFields.optional(commonSchemaFields.createdAt())
      ])

      await Effect.runPromise(renderSchemaFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("const UserSchema")
      expect(text).toContain("Schema.Struct")
      expect(text).toContain("id: Schema.String")
      expect(text).toContain("name: Schema.String")
      expect(text).toContain("email: Schema.String")
      expect(text).toContain("createdAt: Schema.optional(Schema.Date)")
    })

    it("should render schema with annotations", async () => {
      const sourceFile = createSourceFile()
      const config = {
        name: "UserId",
        schemaType: "String" as const,
        annotations: {
          identifier: "UserId",
          title: "User ID",
          description: "Unique user identifier"
        }
      }

      await Effect.runPromise(renderSchemaFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("Schema.annotations")
      expect(text).toContain('identifier: "UserId"')
      expect(text).toContain('title: "User ID"')
    })

    it("should provide common schema fields", () => {
      expect(commonSchemaFields.id().name).toBe("id")
      expect(commonSchemaFields.name().name).toBe("name")
      expect(commonSchemaFields.email().name).toBe("email")
      expect(commonSchemaFields.createdAt().name).toBe("createdAt")
      expect(commonSchemaFields.updatedAt().name).toBe("updatedAt")

      const statusField = commonSchemaFields.status(["active", "inactive"])
      expect(statusField.schema).toContain("Schema.Literal")
    })
  })

  describe("Layer Fragments", () => {
    it("should render a live repository layer", async () => {
      const sourceFile = createSourceFile()
      const config = liveRepositoryLayerFragment("User")

      await Effect.runPromise(renderLayerFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("const UserRepositoryLive")
      expect(text).toContain("Layer.succeed")
      expect(text).toContain("UserRepository")
    })

    it("should render a composed layer", async () => {
      const sourceFile = createSourceFile()
      const config = composedLayerFragment("AppLive", {
        serviceLayers: ["UserServiceLive", "OrderServiceLive"],
        infrastructureLayer: "InfraLive"
      })

      await Effect.runPromise(renderLayerFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("const AppLive")
      expect(text).toContain("Layer.mergeAll")
      expect(text).toContain("Layer.provide")
    })

    it("should render layer with effect type", async () => {
      const sourceFile = createSourceFile()
      const config = {
        name: "UserServiceLive",
        layerType: "effect" as const,
        serviceTag: "UserService",
        implementation: "Effect.gen(function*() { return { get: () => Effect.succeed({}) } })"
      }

      await Effect.runPromise(renderLayerFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("Layer.effect(UserService")
    })

    it("should render layer with sync type", async () => {
      const sourceFile = createSourceFile()
      const config = {
        name: "ConfigLive",
        layerType: "sync" as const,
        serviceTag: "Config",
        implementation: "{ apiUrl: 'http://localhost' }"
      }

      await Effect.runPromise(renderLayerFragment(sourceFile, config, context))

      const text = sourceFile.getFullText()
      expect(text).toContain("Layer.sync(Config")
    })
  })
})
