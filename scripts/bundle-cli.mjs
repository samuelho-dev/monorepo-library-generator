#!/usr/bin/env node
/**
 * Bundle CLI into a single executable file
 *
 * Uses esbuild to bundle all CLI code and dependencies into dist/bin/cli.mjs
 */

import * as esbuild from "esbuild"
import console from "node:console"
import { chmodSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const distDir = join(process.cwd(), "dist")

console.log("📦 Bundling CLI with esbuild...\n")

try {
  await esbuild.build({
    entryPoints: [join(distDir, "esm", "cli", "index.js")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node16",
    outfile: join(distDir, "bin", "cli.mjs"),
    banner: {
      js: "#!/usr/bin/env node"
    },
    // Keep Effect dependencies external (standard practice)
    packages: "external",
    minify: true,
    sourcemap: true,
    logLevel: "info",
    external: [
      // Node.js built-ins
      "node:*",
      // Effect packages (installed as dependencies)
      "effect",
      "@effect/platform",
      "@effect/platform-node",
      "@effect/cli",
      "@effect/ai"
    ]
  })

  // Make executable
  chmodSync(join(distDir, "bin", "cli.mjs"), 0o755)

  console.log("\n✓ CLI bundled successfully to dist/bin/cli.mjs")
} catch (error) {
  console.error("❌ CLI bundling failed:", error)
  process.exit(1)
}
