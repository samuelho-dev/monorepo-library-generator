#!/usr/bin/env tsx
/**
 * Generator Validation Script
 *
 * Validates that all generator templates compile correctly by:
 * 1. Generating test libraries for each generator
 * 2. Building each generated library
 * 3. Reporting any compilation errors
 *
 * Usage:
 *   pnpm exec tsx tools/workspace-plugin/scripts/validate-generators.ts
 *   NODE_OPTIONS="--experimental-vm-modules" pnpm exec tsx tools/workspace-plugin/scripts/validate-generators.ts
 */

import { execSync } from "child_process"
import { existsSync, rmSync } from "fs"
import { join } from "path"

interface GeneratorTest {
  name: string
  generator: string
  libraryName: string
  libraryPath: string
  buildCommand: string
  options?: Record<string, string>
}

const WORKSPACE_ROOT = join(process.cwd())

const generators: Array<GeneratorTest> = [
  {
    name: "Contract Generator",
    generator: "@workspace:contract",
    libraryName: "test-contract",
    libraryPath: "libs/contract/test-contract",
    buildCommand: "pnpm exec nx build contract-test-contract",
    options: {
      domain: "test"
    }
  },
  {
    name: "Data Access Generator",
    generator: "@workspace:data-access",
    libraryName: "test-data-access",
    libraryPath: "libs/data-access/test-data-access",
    buildCommand: "pnpm exec nx build data-access-test-data-access"
  },
  {
    name: "Infrastructure Generator",
    generator: "@workspace:infra",
    libraryName: "test-infra",
    libraryPath: "libs/infra/test-infra",
    buildCommand: "pnpm exec nx build infra-test-infra",
    options: {
      domain: "test"
    }
  },
  {
    name: "Provider Generator",
    generator: "@workspace:provider",
    libraryName: "test-provider",
    libraryPath: "libs/provider/test-provider",
    buildCommand: "pnpm exec nx build provider-test-provider",
    options: {
      externalService: "TestService"
    }
  }
]

interface ValidationResult {
  name: string
  success: boolean
  stage: "cleanup" | "generate" | "build"
  error?: string
}

function exec(command: string, cwd = WORKSPACE_ROOT) {
  console.log(`  $ ${command}`)
  try {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: "pipe"
    })
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      const execError = error as unknown as {
        stdout: string
        stderr: string
        message: string
      }
      throw new Error(
        `Command failed: ${command}\n${execError.stdout}\n${execError.stderr}`
      )
    }
    throw error
  }
}

function cleanup(libraryPath: string) {
  const fullPath = join(WORKSPACE_ROOT, libraryPath)
  if (existsSync(fullPath)) {
    console.log(`  Removing existing library at ${libraryPath}...`)
    rmSync(fullPath, { recursive: true, force: true })
  }
}

function validateGenerator(test: GeneratorTest) {
  console.log(`\n${"=".repeat(80)}`)
  console.log(`Validating: ${test.name}`)
  console.log(`${"=".repeat(80)}\n`)

  try {
    // Stage 1: Cleanup
    console.log("Stage 1: Cleanup")
    cleanup(test.libraryPath)

    // Stage 2: Generate
    console.log("\nStage 2: Generate Library")
    const optionsArgs = Object.entries(test.options || {})
      .map(([key, value]) => `--${key}=${value}`)
      .join(" ")

    const generateCommand = `pnpm exec nx g ${test.generator} ${test.libraryName} ${optionsArgs}`
    exec(generateCommand)

    // Verify library was created
    if (!existsSync(join(WORKSPACE_ROOT, test.libraryPath))) {
      throw new Error(`Library not created at ${test.libraryPath}`)
    }

    // Stage 3: Build
    console.log("\nStage 3: Build Library")
    exec(test.buildCommand)

    console.log(`\n✅ ${test.name} validation PASSED\n`)
    return { name: test.name, success: true, stage: "build" as const }
  } catch (error) {
    const stage: "cleanup" | "generate" | "build" = error instanceof Error && error.message.includes("Build")
      ? "build"
      : error instanceof Error && error.message.includes("Generate")
      ? "generate"
      : "cleanup"

    console.error(`\n❌ ${test.name} validation FAILED at ${stage} stage`)
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`
    )

    return {
      name: test.name,
      success: false,
      stage,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function printSummary(results: Array<ValidationResult>) {
  console.log(`\n${"=".repeat(80)}`)
  console.log("VALIDATION SUMMARY")
  console.log(`${"=".repeat(80)}\n`)

  const passed = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`Total: ${results.length}`)
  console.log(`Passed: ${passed.length}`)
  console.log(`Failed: ${failed.length}\n`)

  if (failed.length > 0) {
    console.log("Failed Generators:")
    failed.forEach((result) => {
      console.log(`  ❌ ${result.name} (failed at ${result.stage} stage)`)
    })
    console.log("")
  }

  if (passed.length > 0) {
    console.log("Passed Generators:")
    passed.forEach((result) => {
      console.log(`  ✅ ${result.name}`)
    })
    console.log("")
  }
}

async function main() {
  console.log("Generator Validation Starting...\n")

  const results: Array<ValidationResult> = []

  for (const test of generators) {
    const result = validateGenerator(test)
    results.push(result)

    // Cleanup after validation
    if (result.success) {
      console.log(`Cleaning up ${test.libraryPath}...`)
      cleanup(test.libraryPath)
    }
  }

  printSummary(results)

  // Exit with error code if any validation failed
  if (results.some((r) => !r.success)) {
    console.error("\n⚠️  Some generators failed validation")
    process.exit(1)
  }

  console.log("\n✅ All generators validated successfully!")
  process.exit(0)
}

// Run validation
main().catch((error) => {
  console.error("Validation script failed:", error)
  process.exit(1)
})
