/**
 * Code Validation Tests
 *
 * Tests for the pattern-based code validation system.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  aggregateResults,
  classNamingRule,
  contextImportRule,
  createCodeRule,
  dataImportRule,
  defaultCodeRules,
  effectImportRule,
  layerOrderRule,
  schemaImportRule,
  taggedErrorReadonlyRule,
  validateGeneratedCode,
  validateGeneratedFiles,
  yieldStarRequiredRule
} from "../code-validation"

describe("Code Validation", () => {
  describe("yieldStarRequiredRule", () => {
    it("should pass for correct yield* usage", async () => {
      const code = `
        Effect.gen(function*() {
          const user = yield* UserRepository.findById(id)
          return user
        })
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [yieldStarRequiredRule])
      )

      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it("should fail for yield without star", async () => {
      const code = `
        Effect.gen(function*() {
          const user = yield UserRepository.findById(id)
          return user
        })
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [yieldStarRequiredRule])
      )

      expect(result.valid).toBe(false)
      expect(result.errorCount).toBe(1)
      expect(result.violations[0].rule).toBe("effect/yield-star-required")
    })
  })

  describe("taggedErrorReadonlyRule", () => {
    it("should pass for readonly fields", async () => {
      const code = `
        class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
          readonly id: string
          readonly message: string
        }> {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [taggedErrorReadonlyRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should warn for non-readonly fields", async () => {
      const code = `
        class UserError extends Data.TaggedError("UserError")<{
          id: string
          message: string
        }> {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [taggedErrorReadonlyRule])
      )

      expect(result.valid).toBe(true) // warnings don't fail
      expect(result.warningCount).toBe(2)
      expect(result.violations[0].rule).toBe("effect/tagged-error-readonly")
    })
  })

  describe("layerOrderRule", () => {
    it("should pass for correct layer order", async () => {
      const code = `
        class UserService extends Context.Tag("UserService")<UserService, UserServiceInterface>() {
          static Live = Layer.succeed(this, liveImpl)
          static Test = Layer.succeed(this, testImpl)
          static Dev = Layer.succeed(this, devImpl)
        }
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [layerOrderRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should info for incorrect layer order", async () => {
      const code = `
        class UserService extends Context.Tag("UserService")<UserService, UserServiceInterface>() {
          static Test = Layer.succeed(this, testImpl)
          static Live = Layer.succeed(this, liveImpl)
        }
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [layerOrderRule])
      )

      expect(result.valid).toBe(true) // info doesn't fail
      expect(result.infoCount).toBe(1)
      expect(result.violations[0].rule).toBe("effect/layer-order")
    })
  })

  describe("effectImportRule", () => {
    it("should pass when Effect is imported", async () => {
      const code = `
        import { Effect } from "effect"

        const result = Effect.succeed("hello")
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [effectImportRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should fail when Effect is used but not imported", async () => {
      const code = `
        const result = Effect.succeed("hello")
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [effectImportRule])
      )

      expect(result.valid).toBe(false)
      expect(result.errorCount).toBe(1)
      expect(result.violations[0].rule).toBe("effect/import-required")
    })
  })

  describe("dataImportRule", () => {
    it("should pass when Data is imported", async () => {
      const code = `
        import { Data } from "effect"

        class MyError extends Data.TaggedError("MyError")<{}> {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [dataImportRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should fail when Data.TaggedError is used but Data not imported", async () => {
      const code = `
        class MyError extends Data.TaggedError("MyError")<{}> {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [dataImportRule])
      )

      expect(result.valid).toBe(false)
      expect(result.errorCount).toBe(1)
    })
  })

  describe("contextImportRule", () => {
    it("should pass when Context is imported", async () => {
      const code = `
        import { Context } from "effect"

        class MyService extends Context.Tag("MyService")<MyService, {}>() {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [contextImportRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should fail when Context.Tag is used but Context not imported", async () => {
      const code = `
        class MyService extends Context.Tag("MyService")<MyService, {}>() {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [contextImportRule])
      )

      expect(result.valid).toBe(false)
    })
  })

  describe("schemaImportRule", () => {
    it("should pass when Schema is imported", async () => {
      const code = `
        import { Schema } from "effect"

        const MySchema = Schema.Struct({ name: Schema.String })
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [schemaImportRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should fail when Schema is used but not imported", async () => {
      const code = `
        const MySchema = Schema.Struct({ name: Schema.String })
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [schemaImportRule])
      )

      expect(result.valid).toBe(false)
    })
  })

  describe("classNamingRule", () => {
    it("should pass for PascalCase class names", async () => {
      const code = `
        class UserService {}
        class ProductRepository {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [classNamingRule])
      )

      expect(result.valid).toBe(true)
    })

    it("should warn for lowercase class names", async () => {
      const code = `
        class userService {}
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [classNamingRule])
      )

      expect(result.valid).toBe(true) // warnings don't fail
      expect(result.warningCount).toBe(1)
    })
  })

  describe("validateGeneratedCode", () => {
    it("should apply all default rules", async () => {
      const validCode = `
        import { Context, Data, Effect } from "effect"

        class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
          readonly id: string
        }> {}

        class UserService extends Context.Tag("UserService")<UserService, {}>() {
          static Live = Layer.succeed(this, {})
        }

        const program = Effect.gen(function*() {
          const result = yield* Effect.succeed("hello")
          return result
        })
      `

      const result = await Effect.runPromise(
        validateGeneratedCode(validCode, defaultCodeRules)
      )

      expect(result.valid).toBe(true)
      expect(result.errorCount).toBe(0)
    })
  })

  describe("validateGeneratedFiles", () => {
    it("should validate multiple files", async () => {
      const files = [
        {
          path: "errors.ts",
          content: `
            import { Data } from "effect"
            class MyError extends Data.TaggedError("MyError")<{ readonly id: string }> {}
          `
        },
        {
          path: "service.ts",
          content: `
            import { Context, Effect } from "effect"
            class MyService extends Context.Tag("MyService")<MyService, {}>() {}
          `
        }
      ]

      const results = await Effect.runPromise(
        validateGeneratedFiles(files, defaultCodeRules)
      )

      expect(results.size).toBe(2)
      expect(results.get("errors.ts")?.valid).toBe(true)
      expect(results.get("service.ts")?.valid).toBe(true)
    })
  })

  describe("createCodeRule", () => {
    it("should create a custom rule", async () => {
      const noConsoleRule = createCodeRule({
        id: "no-console",
        description: "Disallow console.log statements",
        severity: "warning",
        pattern: /console\.log\(/g,
        validate: (content, matches) =>
          matches.map(() => ({
            rule: "no-console",
            severity: "warning" as const,
            message: "Avoid console.log in production code"
          }))
      })

      const code = `console.log("debug")`

      const result = await Effect.runPromise(
        validateGeneratedCode(code, [noConsoleRule])
      )

      expect(result.valid).toBe(true) // warning only
      expect(result.warningCount).toBe(1)
    })
  })

  describe("aggregateResults", () => {
    it("should combine results from multiple files", async () => {
      const files = [
        { path: "a.ts", content: "const x = Effect.succeed(1)" },
        { path: "b.ts", content: "const y = Effect.fail('error')" }
      ]

      const results = await Effect.runPromise(
        validateGeneratedFiles(files, [effectImportRule])
      )

      const aggregated = aggregateResults(results)

      expect(aggregated.valid).toBe(false)
      expect(aggregated.errorCount).toBe(2)
      expect(aggregated.violations.every(v => v.location?.file)).toBe(true)
    })
  })
})
