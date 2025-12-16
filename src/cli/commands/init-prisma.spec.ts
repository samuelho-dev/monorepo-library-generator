/**
 * Prisma Scaffolding Tests
 *
 * Tests for the Prisma directory structure scaffolding functionality.
 */

import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
import { scaffoldPrismaStructure } from "./init-prisma"
import fs from "fs"
import path from "path"

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
    it("should create prisma directory structure", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      // Verify directories exist
      expect(fs.existsSync("prisma")).toBe(true)
      expect(fs.existsSync("prisma/schemas")).toBe(true)
      expect(fs.existsSync("prisma/migrations")).toBe(true)
    })

    it("should create schema.prisma with correct configuration", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

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
    })

    it("should create .gitkeep files in empty directories", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      expect(fs.existsSync("prisma/schemas/.gitkeep")).toBe(true)
      expect(fs.existsSync("prisma/migrations/.gitkeep")).toBe(true)
    })

    it("should create README.md with documentation", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
      expect(readmeContent).toBeTruthy()
      expect(readmeContent).toContain("# Prisma Schemas")
      expect(readmeContent).toContain("## Structure")
      expect(readmeContent).toContain("## Usage")
      expect(readmeContent).toContain("### 1. Define Models")
      expect(readmeContent).toContain("### 2. Generate Effect Schemas")
      expect(readmeContent).toContain("pnpm run prisma:generate")
      expect(readmeContent).toContain("Multi-Domain Organization")
    })

    it("should create .env file with DATABASE_URL template", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const envContent = fs.readFileSync(".env", "utf-8")
      expect(envContent).toBeTruthy()
      expect(envContent).toContain("DATABASE_URL=")
      expect(envContent).toContain("postgresql://")
    })

    it("should include multi-schema preview feature in schema.prisma", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf-8")
      expect(schemaContent).toContain("previewFeatures = [\"multiSchema\"]")
    })

    it("should reference monorepo-library-generator in schema.prisma", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf-8")
      expect(schemaContent).toContain("libraryGenerator = \"../node_modules/monorepo-library-generator\"")
    })

    it("should create complete file structure in one call", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

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
    })

    it("should include usage instructions in README", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
      expect(readmeContent).toContain("prisma:generate")
      expect(readmeContent).toContain("prisma:migrate")
      expect(readmeContent).toContain("prisma:studio")
      expect(readmeContent).toContain("libs/contract/{domain}/src/generated/")
    })

    it("should explain domain detection in README", async () => {
      await Effect.runPromise(
        scaffoldPrismaStructure().pipe(Effect.provide(NodeContext.layer))
      )

      const readmeContent = fs.readFileSync("prisma/README.md", "utf-8")
      expect(readmeContent).toContain("Domain Detection")
      expect(readmeContent).toContain("prisma/schemas/user.prisma")
      expect(readmeContent).toContain("domain: \"user\"")
      expect(readmeContent).toContain("Contract Library Generation")
    })
  })
})
