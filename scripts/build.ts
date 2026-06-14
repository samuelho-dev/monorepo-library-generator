import { chmodSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname } from "node:path"
import pkg from "../package.json"

const external = [
  "@effect/cli",
  "@effect/platform",
  "@effect/platform-node",
  "@modelcontextprotocol/sdk",
  "@nx/devkit",
  "effect",
  "ink",
  "ink-select-input",
  "ink-spinner",
  "ink-text-input",
  "react",
  "react/jsx-runtime",
  "ts-morph"
]

async function bundle(options: {
  entrypoint: string
  outfile: string
  format: "esm" | "cjs"
  executable?: boolean
}) {
  mkdirSync(dirname(options.outfile), { recursive: true })
  // Biome does not infer Bun's runtime global from this Node-targeted build script.
  // biome-ignore lint/correctness/noUndeclaredVariables: Bun is the build runtime.
  const result = await Bun.build({
    entrypoints: [options.entrypoint],
    outdir: dirname(options.outfile),
    naming: basename(options.outfile),
    target: "node",
    format: options.format,
    minify: true,
    sourcemap: "external",
    packages: "external",
    external,
    define: { __VERSION__: JSON.stringify(pkg.version) },
    ...(options.executable && { banner: "#!/usr/bin/env node" })
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log)
    throw new Error(`Failed to bundle ${options.entrypoint}`)
  }
  if (options.executable) chmodSync(options.outfile, 0o755)
}

rmSync("dist", { force: true, recursive: true })

await Promise.all([
  bundle({
    entrypoint: "src/cli/index.ts",
    outfile: "dist/bin/cli.mjs",
    format: "esm",
    executable: true
  }),
  bundle({
    entrypoint: "src/mcp/server.ts",
    outfile: "dist/bin/mcp-server.mjs",
    format: "esm",
    executable: true
  })
])

const generators = ["contract", "data-access", "feature", "provider", "infra"] as const
await Promise.all(
  generators.map(async (name) => {
    await bundle({
      entrypoint: `src/generators/${name}/${name}.ts`,
      outfile: `dist/generators/${name}/generator.cjs`,
      format: "cjs"
    })
    cpSync(`src/generators/${name}/schema.json`, `dist/generators/${name}/schema.json`)
  })
)

const collection = {
  generators: Object.fromEntries(
    generators.map((name) => [
      name,
      {
        factory: `./generators/${name}/generator.cjs#${name === "data-access" ? "dataAccess" : name}Generator`,
        schema: `./generators/${name}/schema.json`,
        description: `Generate a standardized ${name} library from a versioned blueprint`
      }
    ])
  )
}
writeFileSync("dist/generators.json", `${JSON.stringify(collection, null, 2)}\n`)

console.log("Built CLI, MCP server, and Nx generators in dist/")
