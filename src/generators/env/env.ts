/**
 * Environment Library Generator (Nx Wrapper)
 *
 * Updates the existing libs/env library with type-safe environment
 * variable handling using Effect Config and ManagedRuntime.
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
 */

import type { Tree } from "@nx/devkit"
import { formatFiles, logger } from "@nx/devkit"
import * as path from "node:path"
import { generateTypesFile } from "./templates/types.template"
import { generateConfigFile } from "./templates/config.template"
import { generateEnvFile } from "./templates/env.template"
import { generateClientEntryPoint, generateServerEntryPoint, generateIndexEntryPoint } from "./templates/entry-points.template"
import { findDotEnvFile, parseDotEnvFile } from "./utils/parse-dotenv"
import type { EnvGeneratorSchema } from "./schema"

/**
 * Environment Library Generator for Nx Workspaces
 *
 * Updates libs/env with generated environment variable handling.
 * Parses existing .env file and generates type-safe Effect Config loaders.
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function envGenerator(
  tree: Tree,
  schema: EnvGeneratorSchema
) {
  // Determine workspace root
  const workspaceRoot = tree.root || process.cwd()

  // Determine project root (default to libs/env)
  const projectRoot = schema.projectRoot || "libs/env"
  const sourceRoot = path.join(projectRoot, "src")

  // Validate that the project exists (should be created by init command)
  if (!tree.exists(projectRoot)) {
    throw new Error(
      `Environment library not found at ${projectRoot}. ` +
      `Run 'pnpm exec monorepo-library-generator init' first to create the workspace structure.`
    )
  }

  logger.info(`🔍 Searching for .env file in workspace root...`)

  // Phase 1: Parse .env file from workspace root
  const dotEnvPath = findDotEnvFile(workspaceRoot)
  const vars = dotEnvPath
    ? parseDotEnvFile(dotEnvPath)
    : parseDotEnvFile("") // Will use defaults

  logger.info(`📋 Parsed ${vars.length} environment variables`)
  logger.info(`   - Shared: ${vars.filter(v => v.context === "shared").length}`)
  logger.info(`   - Client: ${vars.filter(v => v.context === "client").length}`)
  logger.info(`   - Server: ${vars.filter(v => v.context === "server").length}`)

  // Phase 2: Generate source files using templates
  logger.info(`📝 Generating type-safe environment files...`)

  // Generate types.ts (branded type definitions)
  const typesContent = generateTypesFile(vars)
  tree.write(path.join(sourceRoot, "types.ts"), typesContent)
  logger.info(`   ✓ ${sourceRoot}/types.ts`)

  // Generate config.ts (Effect Config loaders)
  const configContent = generateConfigFile(vars)
  tree.write(path.join(sourceRoot, "config.ts"), configContent)
  logger.info(`   ✓ ${sourceRoot}/config.ts`)

  // Generate env.ts (ManagedRuntime with static exports)
  const envContent = generateEnvFile(vars)
  tree.write(path.join(sourceRoot, "env.ts"), envContent)
  logger.info(`   ✓ ${sourceRoot}/env.ts`)

  // Generate entry points (tree-shakeable)
  const clientContent = generateClientEntryPoint()
  tree.write(path.join(sourceRoot, "client.ts"), clientContent)
  logger.info(`   ✓ ${sourceRoot}/client.ts`)

  const serverContent = generateServerEntryPoint()
  tree.write(path.join(sourceRoot, "server.ts"), serverContent)
  logger.info(`   ✓ ${sourceRoot}/server.ts`)

  const indexContent = generateIndexEntryPoint()
  tree.write(path.join(sourceRoot, "index.ts"), indexContent)
  logger.info(`   ✓ ${sourceRoot}/index.ts`)

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    const dotEnvMessage = dotEnvPath
      ? `\n📄 Parsed from: ${dotEnvPath}`
      : "\n⚠️  No .env file found - using defaults"

    console.log(`
✅ Environment library updated: @workspace/env

📁 Location: ${projectRoot}
📦 Package: @workspace/env
📂 Files generated: 6${dotEnvMessage}

🎯 Usage:

Context-aware (default):
\`\`\`typescript
import { env } from '@workspace/env'

const dbUrl = env.DATABASE_URL  // Server: available, Client: undefined
const apiUrl = env.PUBLIC_API_URL  // Available in both contexts
\`\`\`

Client-only (minimal bundle ~1-2KB):
\`\`\`typescript
import { env } from '@workspace/env/client'

const apiUrl = env.PUBLIC_API_URL
const featureFlag = env.PUBLIC_FEATURE_FLAG
\`\`\`

Server-only (full bundle ~3-5KB):
\`\`\`typescript
import { env, clientEnv, serverEnv } from '@workspace/env/server'

const dbUrl = env.DATABASE_URL
const apiSecret = env.API_SECRET
\`\`\`

🔒 Security:
   - ✅ Eager loading on import (fail fast)
   - ✅ Runtime context detection (server vs client)
   - ✅ Type-safe access with branded types
   - ✅ Secrets protected with Config.redacted()
   - ✅ Tree-shakeable entry points

📝 Environment Variables:
${vars.map(v => `   ${v.context === 'client' ? '🌐' : v.context === 'shared' ? '🔄' : '🔒'} ${v.name}: ${v.type}${v.isSecret ? ' (secret)' : ''}`).join('\n')}

💡 Next Steps:
1. Create or update your .env file in the workspace root
2. Re-run this generator to sync with your .env changes:
   pnpm exec monorepo-library-generator env

3. Import and use in your applications:
   import { env } from '@workspace/env'

📚 Documentation:
   - See ${projectRoot}/README.md for detailed usage
   - See /libs/ARCHITECTURE.md for infrastructure patterns
    `)
  }
}
