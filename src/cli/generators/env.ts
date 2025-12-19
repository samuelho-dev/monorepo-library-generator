/**
 * Environment Generator for CLI (Effect Wrapper)
 *
 * Wrapper that updates the environment library with type-safe
 * environment variable handling using Effect Config and ManagedRuntime.
 *
 * Generation Process:
 * 1. Parse existing .env file from workspace root (or use defaults)
 * 2. Generate types.ts (type definitions)
 * 3. Generate config.ts (Effect Config loaders)
 * 4. Generate env.ts (ManagedRuntime with static exports)
 * 5. Generate entry points (client.ts, server.ts, index.ts)
 *
 * The generator ensures:
 * - Type-safe environment variable access
 * - Eager loading on module initialization (fail fast)
 * - Runtime filtering for server/client separation
 * - Tree-shakeable entry points for optimal bundling
 * - Simple API: import { env } from '@workspace/env' → env.API_KEY
 *
 * @module monorepo-library-generator/cli/generators/env
 */

import { Console, Effect } from "effect"
import * as path from "node:path"
import { generateConfigFile } from "../../generators/env/templates/config.template"
import {
  generateClientEntryPoint,
  generateIndexEntryPoint,
  generateServerEntryPoint
} from "../../generators/env/templates/entry-points.template"
import { generateEnvFile } from "../../generators/env/templates/env.template"
import { generateTypesFile } from "../../generators/env/templates/types.template"
import { findDotEnvFile, parseDotEnvFile } from "../../generators/env/utils/parse-dotenv"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
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
 * Parses existing .env file and generates type-safe Effect Schema validation.
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
    const vars = yield* Effect.sync(() =>
      dotEnvPath
        ? parseDotEnvFile(dotEnvPath)
        : parseDotEnvFile("") // Will use defaults
    )

    yield* Console.log(`📋 Parsed ${vars.length} environment variables`)
    yield* Console.log(`   - Shared: ${vars.filter((v) => v.context === "shared").length}`)
    yield* Console.log(`   - Client: ${vars.filter((v) => v.context === "client").length}`)
    yield* Console.log(`   - Server: ${vars.filter((v) => v.context === "server").length}`)

    // Phase 2: Generate source files using templates
    yield* Console.log(`📝 Generating type-safe environment files...`)

    // Generate types.ts
    const typesContent = yield* Effect.sync(() => generateTypesFile(vars))
    yield* adapter.writeFile(path.join(sourceRoot, "types.ts"), typesContent)
    yield* Console.log(`   ✓ ${sourceRoot}/types.ts`)

    // Generate config.ts
    const configContent = yield* Effect.sync(() => generateConfigFile(vars))
    yield* adapter.writeFile(path.join(sourceRoot, "config.ts"), configContent)
    yield* Console.log(`   ✓ ${sourceRoot}/config.ts`)

    // Generate env.ts
    const envContent = yield* Effect.sync(() => generateEnvFile(vars))
    yield* adapter.writeFile(path.join(sourceRoot, "env.ts"), envContent)
    yield* Console.log(`   ✓ ${sourceRoot}/env.ts`)

    // Generate entry points
    const clientContent = yield* Effect.sync(() => generateClientEntryPoint())
    yield* adapter.writeFile(path.join(sourceRoot, "client.ts"), clientContent)
    yield* Console.log(`   ✓ ${sourceRoot}/client.ts`)

    const serverContent = yield* Effect.sync(() => generateServerEntryPoint())
    yield* adapter.writeFile(path.join(sourceRoot, "server.ts"), serverContent)
    yield* Console.log(`   ✓ ${sourceRoot}/server.ts`)

    const indexContent = yield* Effect.sync(() => generateIndexEntryPoint())
    yield* adapter.writeFile(path.join(sourceRoot, "index.ts"), indexContent)
    yield* Console.log(`   ✓ ${sourceRoot}/index.ts`)

    // Phase 3: Generate configuration files
    yield* Console.log(`⚙️  Generating configuration files...`)

    const packageName = getPackageName("env")

    // Generate package.json
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
        },
        "./client": {
          import: "./src/client.ts",
          types: "./src/client.ts"
        },
        "./server": {
          import: "./src/server.ts",
          types: "./src/server.ts"
        },
        "./types": {
          import: "./src/types.ts",
          types: "./src/types.ts"
        },
        "./config": {
          import: "./src/config.ts",
          types: "./src/config.ts"
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
    const tsconfig = {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
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

- 🔒 **Type-safe**: Full TypeScript type inference
- 🔐 **Secure**: Secrets protected with \`Redacted<string>\`
- 🚀 **Fail-fast**: Eager loading on module initialization
- 📦 **Tree-shakeable**: Separate entry points for client/server
- ⚡ **Zero-overhead**: Direct object access after initialization

## Usage

### Server-side (all variables)

\`\`\`typescript
import { env } from '${packageName}';

// Access all variables
console.log(env.DATABASE_URL);
\`\`\`

### Client-side (only PUBLIC_ vars)

\`\`\`typescript
import { env } from '${packageName}/client';

// Only client-safe variables available
console.log(env.PUBLIC_API_URL);
\`\`\`

### Explicit server import

\`\`\`typescript
import { env } from '${packageName}/server';

// All variables explicitly from server entry point
\`\`\`

## Architecture

- **Eager loading**: Variables loaded once on module initialization
- **Runtime filtering**: Server/client detection ensures proper variable access
- **Effect Config**: Type-safe validation with \`Config.all()\`
- **ManagedRuntime**: Resource lifecycle management

## Generated Files

This library is auto-generated from your .env file. To regenerate:

\`\`\`bash
pnpm nx run ${packageName}:generate
# or
node dist/bin/cli.mjs init
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
    yield* Console.log(`🔒 Security:`)
    yield* Console.log(`   - ✅ Eager loading on import (fail fast)`)
    yield* Console.log(`   - ✅ Runtime context detection (server vs client)`)
    yield* Console.log(`   - ✅ Type-safe access with Effect Config`)
    yield* Console.log(`   - ✅ Secrets protected with Config.redacted()`)
    yield* Console.log(`   - ✅ Tree-shakeable entry points`)
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
        "types.ts",
        "config.ts",
        "env.ts",
        "client.ts",
        "server.ts",
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
