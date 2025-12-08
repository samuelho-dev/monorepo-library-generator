#!/usr/bin/env node
/**
 * Bundle MCP Server into a single executable file
 *
 * Uses esbuild to bundle the MCP server with .ts imports.
 * This allows the MCP server to work with allowImportingTsExtensions.
 */

import * as esbuild from "esbuild"
import console from "node:console"
import { chmodSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const distDir = join(process.cwd(), "dist")
const srcDir = join(process.cwd(), "src")

console.log("📦 Bundling MCP Server with esbuild...\n")

// Ensure dist/bin exists
mkdirSync(join(distDir, "bin"), { recursive: true })

try {
  await esbuild.build({
    entryPoints: [join(srcDir, "mcp", "server.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outfile: join(distDir, "bin", "mcp-server.mjs"),
    banner: {
      js: "#!/usr/bin/env node"
    },
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
      "@effect/ai",
      // MCP SDK
      "@modelcontextprotocol/sdk",
      // Nx (for generator execution)
      "@nx/devkit"
    ]
  })

  // Make executable
  chmodSync(join(distDir, "bin", "mcp-server.mjs"), 0o755)

  console.log("\n✓ MCP Server bundled successfully to dist/bin/mcp-server.mjs")
} catch (error) {
  console.error("❌ MCP Server bundling failed:", error)
  process.exit(1)
}
