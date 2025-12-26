/**
 * Effect AST Builders Tests
 *
 * Tests for ts-morph based Effect pattern builders.
 */

import { Project } from "ts-morph"
import { describe, expect, it } from "vitest"
import {
  addConstExport,
  addContextTagClass,
  addEffectImports,
  addImport,
  addSchemaDefinition,
  addSectionComment,
  addTaggedErrorClass,
  addTypeAlias,
  addTypeImport
} from "../ast/effect-builders"

describe("Effect AST Builders", () => {
  function createSourceFile() {
    const project = new Project({ useInMemoryFileSystem: true })
    return project.createSourceFile("test.ts", "")
  }

  describe("addContextTagClass", () => {
    it("should create a Context.Tag class", () => {
      const sourceFile = createSourceFile()

      addContextTagClass(sourceFile, {
        serviceName: "UserRepository",
        tagIdentifier: "UserRepository",
        methods: [
          {
            name: "findById",
            params: [{ name: "id", type: "string" }],
            returnType: "Effect.Effect<User, UserNotFoundError>"
          },
          {
            name: "create",
            params: [{ name: "data", type: "CreateUserInput" }],
            returnType: "Effect.Effect<User, ValidationError>"
          }
        ],
        staticLayers: [
          { name: "Live", implementation: "Layer.succeed(UserRepository, liveImpl)" },
          { name: "Test", implementation: "Layer.succeed(UserRepository, testImpl)" }
        ]
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserRepository")
      expect(text).toContain("Context.Tag(\"UserRepository\")")
      expect(text).toContain("readonly findById: (id: string)")
      expect(text).toContain("readonly create: (data: CreateUserInput)")
      expect(text).toContain("static Live")
      expect(text).toContain("static Test")
    })

    it("should add JSDoc if provided", () => {
      const sourceFile = createSourceFile()

      addContextTagClass(sourceFile, {
        serviceName: "MyService",
        tagIdentifier: "MyService",
        methods: [],
        jsdoc: "This is a service for doing things"
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("This is a service for doing things")
    })
  })

  describe("addTaggedErrorClass", () => {
    it("should create a Data.TaggedError class", () => {
      const sourceFile = createSourceFile()

      addTaggedErrorClass(sourceFile, {
        className: "UserNotFoundError",
        tagName: "UserNotFoundError",
        fields: [
          { name: "id", type: "string" },
          { name: "message", type: "string" }
        ]
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("class UserNotFoundError")
      expect(text).toContain("Data.TaggedError(\"UserNotFoundError\")")
      expect(text).toContain("readonly id: string")
      expect(text).toContain("readonly message: string")
    })

    it("should handle optional fields", () => {
      const sourceFile = createSourceFile()

      addTaggedErrorClass(sourceFile, {
        className: "TestError",
        tagName: "TestError",
        fields: [
          { name: "required", type: "string" },
          { name: "optional", type: "number", optional: true }
        ]
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("readonly required: string")
      expect(text).toContain("readonly optional?: number")
    })
  })

  describe("addSchemaDefinition", () => {
    it("should create a Struct schema", () => {
      const sourceFile = createSourceFile()

      addSchemaDefinition(sourceFile, {
        name: "UserSchema",
        schemaType: "Struct",
        fields: [
          { name: "id", schema: "Schema.String" },
          { name: "name", schema: "Schema.String" },
          { name: "age", schema: "Schema.Number", optional: true }
        ]
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("const UserSchema")
      expect(text).toContain("Schema.Struct")
      expect(text).toContain("id: Schema.String")
      expect(text).toContain("name: Schema.String")
      expect(text).toContain("age: Schema.optional(Schema.Number)")
    })

    it("should create a branded String schema", () => {
      const sourceFile = createSourceFile()

      addSchemaDefinition(sourceFile, {
        name: "UserId",
        schemaType: "String",
        brand: "UserId",
        annotations: {
          identifier: "UserId",
          title: "User ID"
        }
      })

      const text = sourceFile.getFullText()
      expect(text).toContain("const UserId")
      expect(text).toContain("Schema.String")
      expect(text).toContain("Schema.brand(\"UserId\")")
      expect(text).toContain("Schema.annotations")
    })
  })

  describe("addEffectImports", () => {
    it("should add Effect imports to empty file", () => {
      const sourceFile = createSourceFile()

      addEffectImports(sourceFile, ["Effect", "Context", "Layer"])

      const text = sourceFile.getFullText()
      expect(text).toContain("import { Effect, Context, Layer } from \"effect\"")
    })

    it("should merge with existing Effect import", () => {
      const sourceFile = createSourceFile()
      sourceFile.addImportDeclaration({
        moduleSpecifier: "effect",
        namedImports: ["Effect"]
      })

      addEffectImports(sourceFile, ["Context", "Layer"])

      const imports = sourceFile.getImportDeclarations()
      expect(imports.length).toBe(1)

      const text = sourceFile.getFullText()
      expect(text).toContain("Effect")
      expect(text).toContain("Context")
      expect(text).toContain("Layer")
    })
  })

  describe("addTypeImport", () => {
    it("should add type-only import", () => {
      const sourceFile = createSourceFile()

      addTypeImport(sourceFile, "./types", ["User", "UserRole"])

      const text = sourceFile.getFullText()
      expect(text).toContain("import type { User, UserRole } from \"./types\"")
    })
  })

  describe("addImport", () => {
    it("should add regular import", () => {
      const sourceFile = createSourceFile()

      addImport(sourceFile, "@effect/rpc", ["Rpc", "RpcGroup"])

      const text = sourceFile.getFullText()
      expect(text).toContain("import { Rpc, RpcGroup } from \"@effect/rpc\"")
    })
  })

  describe("addSectionComment", () => {
    it("should add section divider comment", () => {
      const sourceFile = createSourceFile()

      addSectionComment(sourceFile, "Error Types")

      const text = sourceFile.getFullText()
      expect(text).toContain("// ===")
      expect(text).toContain("Error Types")
    })
  })

  describe("addConstExport", () => {
    it("should add const export with type", () => {
      const sourceFile = createSourceFile()

      addConstExport(
        sourceFile,
        "defaultConfig",
        "Config",
        "{ timeout: 5000 }",
        "Default configuration"
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("export const defaultConfig: Config")
      expect(text).toContain("{ timeout: 5000 }")
      expect(text).toContain("Default configuration")
    })
  })

  describe("addTypeAlias", () => {
    it("should add type alias export", () => {
      const sourceFile = createSourceFile()

      addTypeAlias(
        sourceFile,
        "UserId",
        "string & { readonly _brand: \"UserId\" }",
        "Branded User ID type"
      )

      const text = sourceFile.getFullText()
      expect(text).toContain("export type UserId")
      expect(text).toContain("_brand")
      expect(text).toContain("Branded User ID type")
    })
  })
})
