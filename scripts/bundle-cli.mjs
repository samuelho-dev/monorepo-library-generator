#!/usr/bin/env node
/**
 * Bundle CLI into a single executable file
 *
 * Uses esbuild to bundle all CLI code and dependencies into dist/bin/cli.mjs
 */

import * as esbuild from "esbuild"
import console from "node:console"
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const distDir = join(process.cwd(), "dist")
const buildDir = join(process.cwd(), "build", "esm")
const srcDir = join(process.cwd(), "src")

console.log("📦 Bundling CLI with esbuild...\n")

try {
  await esbuild.build({
    entryPoints: [join(buildDir, "cli", "index.js")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: join(distDir, "bin", "cli.mjs"),
    banner: {
      js: "#!/usr/bin/env node"
    },
    // Keep external: packages with native bindings or need to be installed
    minify: true,
    sourcemap: true,
    logLevel: "info",
    external: [
      // Node.js built-ins
      "node:*",
      // Effect packages
      "effect",
      "@effect/*",
      // Nx has native bindings
      "@nx/*",
      "nx"
    ]
  })

  // Make executable
  chmodSync(join(distDir, "bin", "cli.mjs"), 0o755)

  // Copy dotfiles templates to dist
  const dotfilesSrc = join(srcDir, "dotfiles")
  const dotfilesDist = join(distDir, "src", "dotfiles")

  if (existsSync(dotfilesSrc)) {
    console.log("\n📄 Copying dotfile templates...")
    mkdirSync(dotfilesDist, { recursive: true })
    cpSync(dotfilesSrc, dotfilesDist, { recursive: true })
    console.log("✓ Dotfiles copied to dist/src/dotfiles")
  }

  // Generate package.json for npm publishing
  console.log("\n📦 Generating dist/package.json...")

  // Read version from src/version.ts
  const versionContent = readFileSync(join(srcDir, "version.ts"), "utf-8")
  const versionMatch = versionContent.match(/VERSION\s*=\s*"([^"]+)"/)
  const version = versionMatch ? versionMatch[1] : "0.0.0"

  const packageJson = {
    name: "@samuelho-dev/monorepo-library-generator",
    version,
    description: "Effect-based CLI for generating libraries in Effect-native monorepos",
    type: "module",
    bin: {
      mlg: "./bin/cli.mjs"
    },
    files: ["bin/", "src/"],
    engines: {
      node: ">=20.0.0"
    },
    repository: {
      type: "git",
      url: "https://github.com/samuelho-dev/monorepo-library-generator"
    },
    keywords: ["effect", "monorepo", "generator", "cli", "typescript"],
    author: "Samuel Ho",
    license: "MIT",
    dependencies: {
      // Effect packages (can't be bundled due to ESM/CJS issues)
      "effect": "^3.19.9",
      "@effect/cli": "^0.72.1",
      "@effect/platform": "^0.93.6",
      "@effect/platform-node": "^0.100.0",
      // Nx required for workspace operations (has native bindings)
      "@nx/devkit": "^22.3.1",
      "nx": "^22.3.1"
    }
  }

  writeFileSync(join(distDir, "package.json"), JSON.stringify(packageJson, null, 2))
  console.log(`✓ Generated dist/package.json (v${version})`)

  console.log("\n✓ CLI bundled successfully to dist/bin/cli.mjs")
} catch (error) {
  console.error("❌ CLI bundling failed:", error)
  process.exit(1)
}
