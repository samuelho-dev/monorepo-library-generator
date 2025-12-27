#!/usr/bin/env bun
/**
 * Publish script that checks if version already exists on npm
 *
 * Prevents "cannot publish over previously published versions" errors
 * when the changesets action tries to publish an already-published version.
 */

import { execSync } from "node:child_process"
import packageJson from "../package.json"

const packageName = packageJson.name
const localVersion = packageJson.version

console.log(`Checking if ${packageName}@${localVersion} already exists on npm...`)

try {
  // Get the published version from npm (returns error if not published)
  const publishedVersion = execSync(`npm view ${packageName} version 2>/dev/null`, {
    encoding: "utf-8"
  }).trim()

  if (publishedVersion === localVersion) {
    console.log(`Version ${localVersion} already published. Skipping publish.`)
    process.exit(0)
  }

  console.log(`Published version: ${publishedVersion}, Local version: ${localVersion}`)
  console.log("Publishing new version...")
} catch {
  // Package doesn't exist on npm yet, or npm view failed
  console.log("Package not found on npm or first publish. Proceeding...")
}

// Run npm publish with provenance
try {
  execSync("npm publish --access public --provenance", {
    stdio: "inherit",
    env: process.env
  })
  console.log("Published successfully!")
} catch (error) {
  console.error("Publish failed:", error)
  process.exit(1)
}
