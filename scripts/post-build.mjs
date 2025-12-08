#!/usr/bin/env node
import console from "node:console"
import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const distDir = join(process.cwd(), "dist")

console.log("📦 Post-build: Preparing Nx generator structure...\n")

// 1. Flatten the nested dist/dist/ structure created by pack-v3
// NOTE: pack-v3 still creates this nested structure, same as pack-v2
const nestedDistDir = join(distDir, "dist")
if (statSync(nestedDistDir, { throwIfNoEntry: false })?.isDirectory()) {
  const esmNested = join(nestedDistDir, "esm")
  const cjsNested = join(nestedDistDir, "cjs")
  const dtsNested = join(nestedDistDir, "dts")

  if (statSync(esmNested, { throwIfNoEntry: false })?.isDirectory()) {
    renameSync(esmNested, join(distDir, "esm"))
  }
  if (statSync(cjsNested, { throwIfNoEntry: false })?.isDirectory()) {
    renameSync(cjsNested, join(distDir, "cjs"))
  }
  if (statSync(dtsNested, { throwIfNoEntry: false })?.isDirectory()) {
    renameSync(dtsNested, join(distDir, "dts"))
  }

  rmSync(nestedDistDir, { recursive: true, force: true })
  console.log("✓ Flattened nested dist/dist/ structure")
}

// 2. Add package.json to cjs directory to explicitly mark it as CommonJS
// This prevents any CommonJS/ESM module resolution ambiguity
const cjsPackageJsonPath = join(distDir, "cjs", "package.json")
writeFileSync(cjsPackageJsonPath, JSON.stringify({ type: "commonjs" }, null, 2) + "\n")
console.log("✓ Created dist/cjs/package.json with \"type\": \"commonjs\"")

// 2. Update dist/package.json to include "generators" field and update bin
const distPackageJsonPath = join(distDir, "package.json")
const packageJson = JSON.parse(readFileSync(distPackageJsonPath, "utf-8"))

// Add generators field and update bin to use .mjs extension
// pack-v3 already handles exports correctly, we just need to add Nx-specific fields
const { name, version, ...rest } = packageJson
delete rest.bin
const updatedPackageJson = {
  name,
  version,
  generators: "./src/generators.json",
  bin: {
    mlg: "./bin/cli.mjs",
    "mlg-mcp": "./bin/mcp-server.mjs"
  },
  ...rest
}

writeFileSync(distPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + "\n")

// Verify generators field was added
const verifyPackageJson = JSON.parse(readFileSync(distPackageJsonPath, "utf-8"))
if (verifyPackageJson.generators !== "./src/generators.json") {
  console.error("❌ Failed to add generators field to package.json")
  console.error(`   Expected: "./src/generators.json", Got: ${verifyPackageJson.generators}`)
  process.exit(1)
}

console.log("✓ Added \"generators\" field and updated bin to dist/package.json")

// 3. Copy compiled CJS generators to dist/src/generators/ for Nx
// Nx generators REQUIRE CommonJS (they use require(), not import)
// This is an Nx requirement, not a workaround
const sourceGeneratorsDir = join(distDir, "cjs", "generators")
const targetGeneratorsDir = join(distDir, "src", "generators")

// Helper function to recursively copy .js and .json files
function copyJsFiles(src, dest) {
  mkdirSync(dest, { recursive: true })

  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyJsFiles(srcPath, destPath)
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".json")) {
      cpSync(srcPath, destPath)
    }
  }
}

copyJsFiles(sourceGeneratorsDir, targetGeneratorsDir)
console.log("✓ Copied CJS generators from dist/cjs/generators/ to dist/src/generators/")

// Copy schema.json files from src/generators to dist/src/generators
const srcGeneratorsDir = join(process.cwd(), "src", "generators")
function copySchemaFiles(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copySchemaFiles(srcPath, destPath)
    } else if (entry.name === "schema.json") {
      cpSync(srcPath, destPath)
    }
  }
}

copySchemaFiles(srcGeneratorsDir, targetGeneratorsDir)
console.log("✓ Copied schema.json files from src/generators/ to dist/src/generators/")

// 4. Copy compiled CJS utils to dist/src/utils/ for Nx
// Generators import from these utils at runtime
const sourceUtilsDir = join(distDir, "cjs", "utils")
const targetUtilsDir = join(distDir, "src", "utils")

copyJsFiles(sourceUtilsDir, targetUtilsDir)
console.log("✓ Copied CJS utils from dist/cjs/utils/ to dist/src/utils/")

// 5. Copy generators.json to dist/src/
const generatorsJsonSource = join(process.cwd(), "src", "generators.json")
const generatorsJsonDest = join(distDir, "src", "generators.json")

// Ensure dist/src exists
const distSrcDir = join(distDir, "src")
if (!statSync(distSrcDir, { throwIfNoEntry: false })?.isDirectory()) {
  mkdirSync(distSrcDir, { recursive: true })
}

cpSync(generatorsJsonSource, generatorsJsonDest)

// Verify the copy succeeded
if (!statSync(generatorsJsonDest, { throwIfNoEntry: false })?.isFile()) {
  console.error("❌ Failed to copy generators.json")
  process.exit(1)
}

console.log("✓ Copied generators.json to dist/src/")

// 5.5. Copy dotfile templates to dist/src/dotfiles/
const dotfilesSource = join(process.cwd(), "src", "dotfiles")
const dotfilesDest = join(distDir, "src", "dotfiles")

if (statSync(dotfilesSource, { throwIfNoEntry: false })?.isDirectory()) {
  cpSync(dotfilesSource, dotfilesDest, { recursive: true })
  console.log("✓ Copied dotfile templates to dist/src/dotfiles/")
}

// 6. Ensure bin directory exists for bundled executables
const binDir = join(distDir, "bin")
mkdirSync(binDir, { recursive: true })

// 7. Bundle CLI into single file with esbuild
console.log("\n📦 Bundling CLI...")
const { execSync } = await import("child_process")
try {
  execSync("node scripts/bundle-cli.mjs", { stdio: "inherit" })
} catch {
  console.error("❌ CLI bundling failed")
  process.exit(1)
}

console.log("\n✅ Post-build complete!")
