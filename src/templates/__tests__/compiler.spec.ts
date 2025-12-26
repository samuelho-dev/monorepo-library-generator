/**
 * Template Compiler Tests
 *
 * Tests for template compilation using ts-morph.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { createCompiler, TemplateCompiler } from "../core/compiler"
import type { TemplateContext, TemplateDefinition } from "../core/types"

describe("Template Compiler", () => {
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

  describe("TemplateCompiler", () => {
    it("should create a new compiler instance", () => {
      const compiler = new TemplateCompiler()
      expect(compiler).toBeInstanceOf(TemplateCompiler)
    })

    it("should compile a simple template", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/simple",
        meta: {
          title: "{className} Types",
          description: "Types for {className}"
        },
        imports: [
          { from: "effect", items: ["Effect", "Context"] }
        ],
        sections: [
          {
            title: "Types",
            content: {
              type: "raw",
              value: "export type {className}Id = string"
            }
          }
        ]
      }

      const effect = compiler.compile(template, context)
      const result = await Effect.runPromise(effect)

      expect(result).toContain("User Types")
      expect(result).toContain("import { Effect, Context } from \"effect\"")
      expect(result).toContain("export type UserId = string")
    })

    it("should compile template with Context.Tag", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/context-tag",
        meta: {
          title: "{className} Repository",
          description: "Repository for {className}"
        },
        imports: [
          { from: "effect", items: ["Context", "Effect", "Layer"] }
        ],
        sections: [
          {
            content: {
              type: "contextTag",
              config: {
                serviceName: "{className}Repository",
                tagIdentifier: "{className}Repository",
                methods: [
                  {
                    name: "findById",
                    params: [{ name: "id", type: "string" }],
                    returnType: "Effect.Effect<{className}, {className}NotFoundError>"
                  }
                ],
                staticLayers: [
                  {
                    name: "Live",
                    implementation: "Layer.succeed({className}Repository, { findById: () => Effect.succeed({} as {className}) })"
                  }
                ]
              }
            }
          }
        ]
      }

      const effect = compiler.compile(template, context)
      const result = await Effect.runPromise(effect)

      expect(result).toContain("class UserRepository")
      expect(result).toContain("Context.Tag(\"UserRepository\")")
      expect(result).toContain("findById")
      expect(result).toContain("static Live")
    })

    it("should compile template with TaggedError", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/tagged-error",
        meta: {
          title: "{className} Errors",
          description: "Errors for {className}"
        },
        imports: [
          { from: "effect", items: ["Data"] }
        ],
        sections: [
          {
            content: {
              type: "taggedError",
              config: {
                className: "{className}NotFoundError",
                tagName: "{className}NotFoundError",
                fields: [
                  { name: "id", type: "string" },
                  { name: "message", type: "string", optional: true }
                ],
                jsdoc: "Error when {className} is not found"
              }
            }
          }
        ]
      }

      const effect = compiler.compile(template, context)
      const result = await Effect.runPromise(effect)

      expect(result).toContain("class UserNotFoundError")
      expect(result).toContain("Data.TaggedError(\"UserNotFoundError\")")
      expect(result).toContain("readonly id: string")
      expect(result).toContain("readonly message?: string")
    })

    it("should compile template with Schema", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/schema",
        meta: {
          title: "{className} Schema",
          description: "Schema for {className}"
        },
        imports: [
          { from: "effect", items: ["Schema"] }
        ],
        sections: [
          {
            content: {
              type: "schema",
              config: {
                name: "{className}Schema",
                schemaType: "Struct",
                fields: [
                  { name: "id", schema: "Schema.String" },
                  { name: "name", schema: "Schema.String" },
                  { name: "email", schema: "Schema.String", optional: true }
                ]
              }
            }
          }
        ]
      }

      const effect = compiler.compile(template, context)
      const result = await Effect.runPromise(effect)

      expect(result).toContain("UserSchema")
      expect(result).toContain("Schema.Struct")
      expect(result).toContain("id: Schema.String")
      expect(result).toContain("name: Schema.String")
      expect(result).toContain("email: Schema.optional(Schema.String)")
    })

    it("should handle conditional imports", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/conditional-imports",
        meta: {
          title: "Test",
          description: "Test"
        },
        imports: [
          { from: "effect", items: ["Effect"] },
          { from: "@effect/rpc", items: ["Rpc"], condition: "includeRpc" }
        ],
        sections: []
      }

      // Without condition
      const withoutRpc = await Effect.runPromise(
        compiler.compile(template, { ...context, includeRpc: false })
      )
      expect(withoutRpc).not.toContain("Rpc")

      // With condition
      const withRpc = await Effect.runPromise(
        compiler.compile(template, { ...context, includeRpc: true })
      )
      expect(withRpc).toContain("Rpc")
    })

    it("should handle conditional sections", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/conditional-sections",
        meta: {
          title: "Test",
          description: "Test"
        },
        imports: [],
        sections: [
          {
            title: "Always",
            content: { type: "raw", value: "// Always included" }
          },
          {
            title: "CQRS",
            condition: "includeCQRS",
            content: { type: "raw", value: "// CQRS section" }
          }
        ]
      }

      // Without condition
      const withoutCQRS = await Effect.runPromise(
        compiler.compile(template, { ...context, includeCQRS: false })
      )
      expect(withoutCQRS).toContain("Always included")
      expect(withoutCQRS).not.toContain("CQRS section")

      // With condition
      const withCQRS = await Effect.runPromise(
        compiler.compile(template, { ...context, includeCQRS: true })
      )
      expect(withCQRS).toContain("Always included")
      expect(withCQRS).toContain("CQRS section")
    })

    it("should handle conditionals block", async () => {
      const compiler = createCompiler()

      const template: TemplateDefinition = {
        id: "test/conditionals-block",
        meta: {
          title: "Test",
          description: "Test"
        },
        imports: [],
        sections: [],
        conditionals: {
          includeEvents: {
            imports: [
              { from: "./events", items: ["{className}Event"] }
            ],
            sections: [
              {
                content: { type: "raw", value: "// Events section" }
              }
            ]
          }
        }
      }

      // Without condition
      const without = await Effect.runPromise(
        compiler.compile(template, { ...context, includeEvents: false })
      )
      expect(without).not.toContain("Events section")

      // With condition
      const with_ = await Effect.runPromise(
        compiler.compile(template, { ...context, includeEvents: true })
      )
      expect(with_).toContain("Events section")
      expect(with_).toContain("UserEvent")
    })
  })

  describe("createCompiler", () => {
    it("should create a fresh compiler instance", () => {
      const c1 = createCompiler()
      const c2 = createCompiler()
      expect(c1).not.toBe(c2)
    })
  })
})
