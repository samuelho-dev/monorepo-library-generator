/**
 * Prisma Scaffolding Tests
 *
 * Tests for the Prisma directory structure scaffolding functionality.
 */

import { NodeContext } from "@effect/platform-node"
import { afterEach, beforeEach, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import fs from "fs"
import path from "path"
import { scaffoldPrismaStructure } from "./init-prisma"

describe("init-prisma", () => {
  const testDir = path.join(process.cwd(), "tmp-prisma-test")

  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
    fs.mkdirSync(testDir, { recursive: true })
    // Change to test directory
    process.chdir(testDir)
  })

  afterEach(() => {
    // Change back to original directory
    process.chdir(path.join(testDir, ".."))
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  describe("scaffoldPrismaStructure", () => {
    it.scoped("should create prisma directory structure", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        // Verify directories exist
        expect(fs.existsSync("prisma")).toBe(true)
        expect(fs.existsSync("prisma/schemas")).toBe(true)
        expect(fs.existsSync("prisma/migrations")).toBe(true)
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should create schema.prisma with correct configuration", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf-8")
        expect(schemaContent).toBeTruthy()
        expect(schemaContent).toContain("generator client")
        expect(schemaContent).toContain("generator effectSchemas")
        expect(schemaContent).toContain("provider = \"prisma-effect-kysely\"")
        expect(schemaContent).toContain("output   = \"../libs/contract\"")
        expect(schemaContent).toContain("multiFileDomains = \"true\"")
        expect(schemaContent).toContain("scaffoldLibraries = \"true\"")
        expect(schemaContent).toContain("datasource db")
        expect(schemaContent).toContain("provider = \"postgresql\"")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should create .gitkeep files in empty directories", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        expect(fs.existsSync("prisma/schemas/.gitkeep")).toBe(true)
        expect(fs.existsSync("prisma/migrations/.gitkeep")).toBe(true)
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should create README.md with documentation", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
        expect(readmeContent).toBeTruthy()
        expect(readmeContent).toContain("# Prisma Schemas")
        expect(readmeContent).toContain("## Structure")
        expect(readmeContent).toContain("## Usage")
        expect(readmeContent).toContain("### 1. Define Models")
        expect(readmeContent).toContain("### 2. Generate Effect Schemas")
        expect(readmeContent).toContain("pnpm run prisma:generate")
        expect(readmeContent).toContain("Multi-Domain Organization")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should create .env file with DATABASE_URL template", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const envContent = fs.readFileSync(".env", "utf-8")
        expect(envContent).toBeTruthy()
        expect(envContent).toContain("DATABASE_URL=")
        expect(envContent).toContain("postgresql://")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should include multi-schema preview feature in schema.prisma", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf-8")
        expect(schemaContent).toContain("previewFeatures = [\"multiSchema\"]")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should reference monorepo-library-generator in schema.prisma", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf-8")
        expect(schemaContent).toContain("libraryGenerator = \"../node_modules/monorepo-library-generator\"")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should create complete file structure in one call", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        // Verify all expected files exist
        const expectedFiles = [
          "prisma/schema.prisma",
          "prisma/schemas/.gitkeep",
          "prisma/migrations/.gitkeep",
          "prisma/README.md",
          ".env"
        ]

        expectedFiles.forEach((file) => {
          expect(fs.existsSync(file)).toBe(true)
        })
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should include usage instructions in README", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
        expect(readmeContent).toContain("prisma:generate")
        expect(readmeContent).toContain("prisma:migrate")
        expect(readmeContent).toContain("prisma:studio")
        expect(readmeContent).toContain("libs/contract/{domain}/src/generated/")
      }).pipe(Effect.provide(NodeContext.layer)))

    it.scoped("should explain domain detection in README", () =>
      Effect.gen(function*() {
        yield* scaffoldPrismaStructure()

        const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
        expect(readmeContent).toContain("Domain Detection")
        expect(readmeContent).toContain("prisma/schemas/user.prisma")
        expect(readmeContent).toContain("domain: \"user\"")
        expect(readmeContent).toContain("Contract Library Generation")
      }).pipe(Effect.provide(NodeContext.layer)))
  })
})
