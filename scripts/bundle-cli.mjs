#!/usr/bin/env node
/**
 * Bundle CLI into a single executable file
 *
 * Uses esbuild to bundle all CLI code and dependencies into dist/bin/cli.mjs
 */

import * as esbuild from "esbuild"
import console from "node:console"
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const distDir = join(process.cwd(), "dist")
const buildDir = join(process.cwd(), "build", "esm")
const srcDir = join(process.cwd(), "src")

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"))
const version = packageJson.version

console.log(`📦 Bundling CLI v${version} with esbuild...\n`)

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
    minify: true,
    sourcemap: true,
    logLevel: "info",
    // Inject version at build time
    define: {
      __VERSION__: JSON.stringify(version)
    },
    // Externalize ALL npm packages - they install via npm at runtime
    // This avoids bundling optional deps like @effect/cluster
    packages: "external"
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

  console.log("\n✓ CLI bundled successfully to dist/bin/cli.mjs")
} catch (error) {
  console.error("❌ CLI bundling failed:", error)
  process.exit(1)
}
