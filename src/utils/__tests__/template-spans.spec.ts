/**
 * Template Spans Tests
 *
 * Tests for template generation observability utilities
 */

import { Effect } from "effect"
import { describe, expect, it, vi } from "vitest"
import type { FileSystemAdapter } from "../filesystem"
import {
  generateTemplateWithSpan,
  generateTemplatesWithSpan,
  writeContentWithSpan
} from "../template-spans"

// Mock FileSystemAdapter
function createMockAdapter(files: Map<string, string> = new Map()): FileSystemAdapter {
  return {
    writeFile: (path: string, content: string) =>
      Effect.sync(() => {
        files.set(path, content)
      }),
    readFile: (path: string) =>
      Effect.sync(() => files.get(path) ?? ""),
    exists: (path: string) =>
      Effect.sync(() => files.has(path)),
    makeDirectory: (_path: string) =>
      Effect.sync(() => {}),
    getWorkspaceRoot: () => "/test/workspace"
  }
}

describe("Template Spans", () => {
  describe("generateTemplateWithSpan", () => {
    it("should generate template and write file", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const generator = (opts: { name: string }) => `// Generated for ${opts.name}`

      const effect = generateTemplateWithSpan(
        adapter,
        "test/template",
        "/test/workspace/src/output.ts",
        generator,
        { name: "TestEntity" }
      )

      const result = await Effect.runPromise(effect)

      expect(result).toBe("/test/workspace/src/output.ts")
      expect(files.get("/test/workspace/src/output.ts")).toBe("// Generated for TestEntity")
    })

    it("should return the file path on success", async () => {
      const adapter = createMockAdapter()
      const generator = () => "content"

      const effect = generateTemplateWithSpan(
        adapter,
        "test/simple",
        "/path/to/file.ts",
        generator,
        {}
      )

      const result = await Effect.runPromise(effect)
      expect(result).toBe("/path/to/file.ts")
    })

    it("should pass options to generator function", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)
      const generatorSpy = vi.fn((opts: { className: string; includeTests: boolean }) =>
        `class ${opts.className} { tests: ${opts.includeTests} }`
      )

      const effect = generateTemplateWithSpan(
        adapter,
        "test/class",
        "/output.ts",
        generatorSpy,
        { className: "MyService", includeTests: true }
      )

      await Effect.runPromise(effect)

      expect(generatorSpy).toHaveBeenCalledWith({ className: "MyService", includeTests: true })
      expect(files.get("/output.ts")).toBe("class MyService { tests: true }")
    })
  })

  describe("generateTemplatesWithSpan", () => {
    it("should generate multiple templates", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const templates = [
        { id: "test/errors", path: "errors.ts", generator: (opts: { name: string }) => `// ${opts.name} errors` },
        { id: "test/types", path: "types.ts", generator: (opts: { name: string }) => `// ${opts.name} types` },
        { id: "test/index", path: "index.ts", generator: (opts: { name: string }) => `// ${opts.name} barrel` }
      ]

      const effect = generateTemplatesWithSpan(
        adapter,
        templates,
        "/test/workspace/src/lib",
        { name: "User" }
      )

      const result = await Effect.runPromise(effect)

      expect(result).toHaveLength(3)
      expect(result).toContain("/test/workspace/src/lib/errors.ts")
      expect(result).toContain("/test/workspace/src/lib/types.ts")
      expect(result).toContain("/test/workspace/src/lib/index.ts")

      expect(files.get("/test/workspace/src/lib/errors.ts")).toBe("// User errors")
      expect(files.get("/test/workspace/src/lib/types.ts")).toBe("// User types")
      expect(files.get("/test/workspace/src/lib/index.ts")).toBe("// User barrel")
    })

    it("should return empty array for empty template list", async () => {
      const adapter = createMockAdapter()

      const effect = generateTemplatesWithSpan(adapter, [], "/base", {})

      const result = await Effect.runPromise(effect)
      expect(result).toEqual([])
    })

    it("should combine base path with template paths", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const templates = [
        { id: "a", path: "nested/deep/file.ts", generator: () => "content" }
      ]

      const effect = generateTemplatesWithSpan(
        adapter,
        templates,
        "/workspace/libs/my-lib/src",
        {}
      )

      const result = await Effect.runPromise(effect)

      expect(result[0]).toBe("/workspace/libs/my-lib/src/nested/deep/file.ts")
    })
  })

  describe("writeContentWithSpan", () => {
    it("should write raw content to file", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const content = "# README\n\nThis is documentation."

      const effect = writeContentWithSpan(
        adapter,
        "docs/readme",
        "/test/README.md",
        content
      )

      const result = await Effect.runPromise(effect)

      expect(result).toBe("/test/README.md")
      expect(files.get("/test/README.md")).toBe(content)
    })

    it("should handle empty content", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const effect = writeContentWithSpan(
        adapter,
        "empty/file",
        "/empty.ts",
        ""
      )

      const result = await Effect.runPromise(effect)

      expect(result).toBe("/empty.ts")
      expect(files.get("/empty.ts")).toBe("")
    })

    it("should handle multiline content", async () => {
      const files = new Map<string, string>()
      const adapter = createMockAdapter(files)

      const content = `import { Effect } from "effect"

export class MyService {
  doSomething() {
    return Effect.succeed("done")
  }
}`

      const effect = writeContentWithSpan(
        adapter,
        "test/service",
        "/service.ts",
        content
      )

      await Effect.runPromise(effect)

      expect(files.get("/service.ts")).toBe(content)
    })
  })

  describe("Error Handling", () => {
    it("should propagate write errors", async () => {
      const adapter: FileSystemAdapter = {
        writeFile: () =>
          Effect.fail({
            _tag: "FileWriteError" as const,
            path: "/fail.ts",
            cause: new Error("Disk full")
          }),
        readFile: () => Effect.succeed(""),
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.succeed(undefined),
        getWorkspaceRoot: () => "/test"
      }

      const effect = writeContentWithSpan(
        adapter,
        "test/fail",
        "/fail.ts",
        "content"
      )

      const result = await Effect.runPromiseExit(effect)

      expect(result._tag).toBe("Failure")
    })
  })
})
