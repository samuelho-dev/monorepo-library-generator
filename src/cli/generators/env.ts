/**
 * Environment Generator for CLI (Effect Wrapper)
 *
 * Wrapper that updates the environment library with type-safe
 * environment variable handling using Effect Config and a t3-env inspired API.
 *
 * Generation Process:
 * 1. Parse existing .env file from workspace root (or use defaults)
 * 2. Generate createEnv.ts (runtime library)
 * 3. Generate env.ts (user's createEnv call scaffolded from .env)
 * 4. Generate index.ts (single entry point)
 *
 * The generator ensures:
 * - Single source of truth (one createEnv call)
 * - Type-safe environment variable access
 * - Eager loading on module initialization (fail fast)
 * - Runtime protection for server vars on client
 * - Simple API: import { env } from '@workspace/env'
 *
 * @module monorepo-library-generator/cli/generators/env
 */

import { Console, Effect } from "effect"
import * as path from "node:path"
import { generateCreateEnvFile } from "../../generators/env/templates/createEnv.template"
import { generateEnvScaffoldFile } from "../../generators/env/templates/env-scaffold.template"
import { generateIndexFile } from "../../generators/env/templates/index.template"
import { findDotEnvFile, parseDotEnvFile } from "../../generators/env/utils/parse-dotenv"
import { createEffectFsAdapter } from "../../utils/filesystem"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Environment Generator Options (CLI)
 */
export interface EnvGeneratorOptions {
  /**
   * Project root directory for the env library
   * @default "libs/env"
   */
  readonly projectRoot?: string
}

/**
 * Generate Environment Library (CLI)
 *
 * Updates libs/env with generated environment variable handling.
 * Parses existing .env file and generates type-safe Effect Config validation.
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateEnv(options: EnvGeneratorOptions = {}) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Determine project root (default to libs/env)
    const projectRoot = options.projectRoot || "libs/env"
    const sourceRoot = path.join(projectRoot, "src")

    yield* Console.log(`🔍 Searching for .env file in workspace root...`)

    // Phase 1: Parse .env file from workspace root
    const dotEnvPath = yield* Effect.sync(() => findDotEnvFile(workspaceRoot))
    const vars = yield* Effect.sync(
      () => (dotEnvPath ? parseDotEnvFile(dotEnvPath) : parseDotEnvFile("")) // Will use defaults
    )

    yield* Console.log(`📋 Parsed ${vars.length} environment variables`)
    yield* Console.log(`   - Shared: ${vars.filter((v) => v.context === "shared").length}`)
    yield* Console.log(`   - Client: ${vars.filter((v) => v.context === "client").length}`)
    yield* Console.log(`   - Server: ${vars.filter((v) => v.context === "server").length}`)

    // Phase 2: Generate source files using new templates
    yield* Console.log(`📝 Generating type-safe environment files...`)

    // Generate createEnv.ts (runtime library)
    const createEnvContent = yield* Effect.sync(() => generateCreateEnvFile())
    yield* adapter.writeFile(path.join(sourceRoot, "createEnv.ts"), createEnvContent)
    yield* Console.log(`   ✓ ${sourceRoot}/createEnv.ts (runtime library)`)

    // Generate env.ts (user's createEnv call)
    const envContent = yield* Effect.sync(() => generateEnvScaffoldFile(vars))
    yield* adapter.writeFile(path.join(sourceRoot, "env.ts"), envContent)
    yield* Console.log(`   ✓ ${sourceRoot}/env.ts (environment definition)`)

    // Generate index.ts (single entry point)
    const indexContent = yield* Effect.sync(() => generateIndexFile())
    yield* adapter.writeFile(path.join(sourceRoot, "index.ts"), indexContent)
    yield* Console.log(`   ✓ ${sourceRoot}/index.ts (entry point)`)

    // Clean up old files that are no longer needed
    const obsoleteFiles = [
      "types.ts",
      "config.ts",
      "schema.ts",
      "parse.ts",
      "client.ts",
      "server.ts"
    ]

    for (const file of obsoleteFiles) {
      const filePath = path.join(sourceRoot, file)
      const exists = yield* adapter.exists(filePath)
      if (exists) {
        yield* adapter.remove(filePath)
        yield* Console.log(`   🗑️  Removed obsolete ${sourceRoot}/${file}`)
      }
    }

    // Phase 3: Generate configuration files
    yield* Console.log(`⚙️  Generating configuration files...`)

    const packageName = getPackageName("env")

    // Generate package.json (simplified - single entry point)
    const packageJson = {
      name: packageName,
      version: "0.0.1",
      type: "module",
      sideEffects: false,
      description: "Type-safe environment variable access with Effect Config",
      exports: {
        ".": {
          import: "./src/index.ts",
          types: "./src/index.ts"
        }
      },
      peerDependencies: {
        effect: "*",
        "@effect/platform": "*",
        "@effect/platform-node": "*"
      }
    }

    yield* adapter.writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify(packageJson, null, 2)
    )
    yield* Console.log(`   ✓ ${projectRoot}/package.json`)

    // Generate tsconfig.json
    // Note: rootDir is intentionally omitted to support workspace path mappings
    const tsconfig = {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        module: "ESNext", // Required for verbatimModuleSyntax with ESM
        moduleResolution: "bundler", // Modern resolution for ESM packages
        verbatimModuleSyntax: true
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist", "**/*.spec.ts"]
    }

    yield* adapter.writeFile(
      path.join(projectRoot, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2)
    )
    yield* Console.log(`   ✓ ${projectRoot}/tsconfig.json`)

    // Generate README.md
    const readme = `# ${packageName}

Type-safe environment variable access with Effect Config.

## Features

- 🔒 **Single Source of Truth**: One \`createEnv\` call defines all variables
- 🔐 **Secure**: Secrets protected with \`Redacted<string>\`
- 🚀 **Fail-fast**: Eager loading on module initialization
- 🛡️ **Runtime Protection**: Server vars throw on client access
- ⚡ **Type Inference**: Types derived via \`Config.Config.Success<>\`

## Usage

\`\`\`typescript
import { env } from '${packageName}'// Server context: All variables accessible
env.DATABASE_URL    // Redacted<string>
env.PORT            // number
env.PUBLIC_API_URL  // string
env.NODE_ENV        // string

// Client context: Only client + shared vars
env.PUBLIC_API_URL  // string (works)
env.NODE_ENV        // string (works)
env.DATABASE_URL    // ❌ Runtime error
\`\`\`

## Customization

Edit \`src/env.ts\` to modify environment variables:

\`\`\`typescript
import { createEnv, Config } from "./createEnv"

export const env = createEnv({
  server: {
    DATABASE_URL: Config.redacted("DATABASE_URL"),
    PORT: Config.number("PORT").pipe(Config.withDefault(3000))
  },
  client: {
    PUBLIC_API_URL: Config.string("PUBLIC_API_URL")
  },
  shared: {
    NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development"))
  },
  clientPrefix: "PUBLIC_"
})
\`\`\`

## Architecture

- **Eager loading**: Variables loaded once on module initialization
- **Effect Config**: Type-safe validation with \`Config.all()\`
- **Proxy Protection**: Server vars throw on client access
- **ManagedRuntime**: Resource lifecycle management

## Generated Files

This library is auto-generated from your .env file. To regenerate:

\`\`\`bash
pnpm exec monorepo-library-generator env
\`\`\`
`

    yield* adapter.writeFile(path.join(projectRoot, "README.md"), readme)
    yield* Console.log(`   ✓ ${projectRoot}/README.md`)

    const dotEnvMessage = dotEnvPath
      ? `Parsed from: ${dotEnvPath}`
      : "No .env file found - using defaults"

    yield* Console.log("")
    yield* Console.log(`✨ Environment library updated successfully!`)
    yield* Console.log(`  Location: ${projectRoot}`)
    yield* Console.log(`  Package: ${packageName}`)
    yield* Console.log(`  ${dotEnvMessage}`)
    yield* Console.log("")
    yield* Console.log(`🎯 Usage (Single Import):`)
    yield* Console.log(``)
    yield* Console.log(`   import { env } from '${packageName}'`)
    yield* Console.log(``)
    yield* Console.log(`   // Server: All variables accessible`)
    yield* Console.log(`   // Client: Only client + shared vars (server vars throw)`)
    yield* Console.log("")
    yield* Console.log(`🔒 Security:`)
    yield* Console.log(`   - ✅ Single source of truth (one createEnv call)`)
    yield* Console.log(`   - ✅ Eager validation on import (fail fast)`)
    yield* Console.log(`   - ✅ Runtime protection for server vars on client`)
    yield* Console.log(`   - ✅ Type inference via Config.Config.Success<>`)
    yield* Console.log(`   - ✅ Secrets protected with Config.redacted()`)
    yield* Console.log("")
    yield* Console.log(`📝 Environment Variables (${vars.length}):`)
    for (const v of vars) {
      const icon = v.context === "client" ? "🌐" : v.context === "shared" ? "🔄" : "🔒"
      const secretLabel = v.isSecret ? " (secret)" : ""
      yield* Console.log(`   ${icon} ${v.name}: ${v.type}${secretLabel}`)
    }

    return {
      projectRoot,
      packageName,
      filesGenerated: [
        "createEnv.ts",
        "env.ts",
        "index.ts",
        "package.json",
        "tsconfig.json",
        "README.md"
      ],
      variablesCount: vars.length,
      dotEnvPath
    }
  })
}
