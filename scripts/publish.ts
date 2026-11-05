#!/usr/bin/env bun
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import packageJson from "../package.json"

const dryRun = process.argv.slice(2).length === 1 && process.argv[2] === "--dry-run"
if (process.argv.length > 2 && !dryRun) throw new Error("Usage: bun scripts/publish.ts [--dry-run]")

if (!dryRun && (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.GITHUB_REPOSITORY !== "samuelho-dev/monorepo-library-generator" ||
  process.env.GITHUB_REF !== "refs/heads/main" ||
  !process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ||
  process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN ||
  process.env.GITHUB_EVENT_NAME !== "push" ||
  process.env.GITHUB_WORKFLOW_REF !== "samuelho-dev/monorepo-library-generator/.github/workflows/release.yml@refs/heads/main" ||
  Object.keys(process.env).some((key) => /^npm_config_.*(auth|token|password)/i.test(key))
)) throw new Error("Publishing requires the main GitHub Actions OIDC workflow without npm credentials")

const directory = mkdtempSync(join(tmpdir(), "mlg-publish-"))
try {
  const userConfig = join(directory, "user.npmrc")
  const globalConfig = join(directory, "global.npmrc")
  writeFileSync(userConfig, "")
  writeFileSync(globalConfig, "")
  const env = {
    ...process.env,
    NPM_CONFIG_USERCONFIG: userConfig,
    NPM_CONFIG_GLOBALCONFIG: globalConfig,
    NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/"
  }
  const run = (command: string, args: string[]) => execFileSync(command, args, { encoding: "utf8", env }).trim()
  if (!dryRun && (run("git", ["rev-parse", "HEAD"]) !== process.env.GITHUB_SHA || run("git", ["status", "--porcelain", "--untracked-files=no"]))) {
    throw new Error("Publishing requires the unchanged triggering commit")
  }

  const { name, version } = packageJson
  if (!dryRun) {
    const versions = JSON.parse(run("npm", ["view", name, "versions", "--json"])) as string[] | string
    if ((Array.isArray(versions) ? versions : [versions]).includes(version)) {
      console.log(`${name}@${version} is already published; skipping`)
      rmSync(directory, { recursive: true, force: true })
      process.exit(0)
    }
  }

  const [packed] = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", directory])) as Array<{
    name: string
    version: string
    filename: string
    integrity: string
    files: Array<{ path: string }>
  }>
  const requiredFiles = [
    "dist/bin/cli.mjs", "dist/bin/mcp-server.mjs", "dist/generators.json",
    ...["contract", "data-access", "feature", "provider", "infra"].flatMap((generator) => [
      `dist/generators/${generator}/generator.cjs`, `dist/generators/${generator}/schema.json`
    ])
  ]
  if (packed.name !== name || packed.version !== version ||
    !requiredFiles.every((path) => packed.files.some((file) => file.path === path))) {
    throw new Error("Packed artifact has unexpected identity or missing build outputs")
  }
  const tarball = join(directory, packed.filename)
  const integrity = `sha512-${createHash("sha512").update(readFileSync(tarball)).digest("base64")}`
  if (integrity !== packed.integrity) throw new Error("Packed artifact integrity mismatch")
  const installDir = join(directory, "install")
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", installDir, tarball], { stdio: "inherit", env })
  execFileSync("node", [join(installDir, "node_modules", name, "dist/bin/cli.mjs"), "--help"], { stdio: "inherit", env })
  if (dryRun) {
    console.log(`Validated ${name}@${version}: ${integrity}`)
  } else {
    execFileSync("npm", ["publish", tarball, "--ignore-scripts", "--access", "public", "--provenance"], { stdio: "inherit", env })
    const published = JSON.parse(run("npm", ["view", `${name}@${version}`, "--json"])) as { name: string; version: string; dist: { integrity: string } }
    if (published.name !== name || published.version !== version || published.dist.integrity !== integrity) {
      throw new Error("Registry identity or integrity does not match the published artifact")
    }
    console.log(`New tag: ${name}@${version}`)
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
