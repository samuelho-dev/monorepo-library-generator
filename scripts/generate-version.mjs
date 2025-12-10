#!/usr/bin/env node
/**
 * Generate version.ts from package.json
 *
 * Runs before TypeScript compilation to create a version module
 * that can be imported by both CLI and MCP server.
 */

import console from "node:console"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const packageJsonPath = join(process.cwd(), "package.json")
const versionFilePath = join(process.cwd(), "src", "version.ts")

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))

const versionContent = `/**
 * Version information
 *
 * Auto-generated from package.json by scripts/generate-version.mjs
 * DO NOT EDIT MANUALLY - This file is regenerated on every build
 */

export const VERSION = "${packageJson.version}"
`

writeFileSync(versionFilePath, versionContent)
console.log(`✓ Generated src/version.ts with version ${packageJson.version}`)
