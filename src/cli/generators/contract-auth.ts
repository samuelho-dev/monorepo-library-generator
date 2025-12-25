/**
 * Contract Auth Generator for CLI
 *
 * Generates the contract-auth library which is the single source of truth
 * for auth types across the monorepo.
 *
 * This is a specialized generator that produces a different structure
 * than regular contract libraries (no entities, just schemas/ports/middleware).
 *
 * @module cli/generators/contract-auth
 */

import { Console, Effect } from "effect"
import { execSync } from "node:child_process"
import {
  generateAuthErrorsFile,
  generateAuthIndexFile,
  generateAuthMiddlewareFile,
  generateAuthPortsFile,
  generateAuthSchemasFile,
  generateAuthTypesFile
} from "../../generators/contract/templates/auth"
import { createEffectFsAdapter } from "../../utils/filesystem"
import { WORKSPACE_CONFIG } from "../../utils/workspace-config"

/**
 * Contract Auth Generator Options
 */
export interface ContractAuthOptions {
  readonly description?: string
}

/**
 * Generate Contract Auth Library
 *
 * Creates the contract-auth library with:
 * - schemas.ts (CurrentUserData, AuthMethod, etc.)
 * - errors.ts (AuthError, ServiceAuthError)
 * - ports.ts (AuthVerifier, AuthProvider, ServiceAuthVerifier)
 * - middleware.ts (RouteTag, CurrentUser, ServiceContext)
 * - index.ts (barrel exports)
 * - types.ts (type-only exports)
 */
export function generateContractAuth(options: ContractAuthOptions = {}) {
  return Effect.gen(function*() {
    const scope = WORKSPACE_CONFIG.getScope()
    const packageName = `${scope}/contract-auth`
    const projectRoot = "libs/contract/auth"
    const sourceRoot = `${projectRoot}/src`

    yield* Console.log(`Creating contract-auth library...`)

    // Create file system adapter with current working directory as workspace root
    const workspaceRoot = process.cwd()
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Create directory structure
    yield* adapter.makeDirectory(`${workspaceRoot}/${sourceRoot}/lib`)

    // Generate all auth contract files
    const templateOptions = { packageName }

    // 1. Generate lib/schemas.ts
    const schemasContent = generateAuthSchemasFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/schemas.ts`, schemasContent)

    // 2. Generate lib/errors.ts
    const errorsContent = generateAuthErrorsFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/errors.ts`, errorsContent)

    // 3. Generate lib/ports.ts
    const portsContent = generateAuthPortsFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/ports.ts`, portsContent)

    // 4. Generate lib/middleware.ts
    const middlewareContent = generateAuthMiddlewareFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/middleware.ts`, middlewareContent)

    // 5. Generate index.ts (barrel)
    const indexContent = generateAuthIndexFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/index.ts`, indexContent)

    // 6. Generate types.ts (type-only exports)
    const typesContent = generateAuthTypesFile(templateOptions)
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/types.ts`, typesContent)

    // 7. Generate package.json
    const packageJson = {
      name: packageName,
      version: "0.0.1",
      type: "module",
      main: "./src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": {
          import: "./src/index.ts",
          types: "./src/index.ts"
        },
        "./types": {
          import: "./src/types.ts",
          types: "./src/types.ts"
        }
      },
      dependencies: {
        effect: "catalog:"
      },
      peerDependencies: {
        effect: "^3.0.0"
      }
    }
    yield* adapter.writeFile(
      `${workspaceRoot}/${projectRoot}/package.json`,
      JSON.stringify(packageJson, null, 2)
    )

    // 8. Generate tsconfig.json
    const tsconfig = {
      extends: "../../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
        declaration: true,
        declarationMap: true,
        composite: true
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist"]
    }
    yield* adapter.writeFile(
      `${workspaceRoot}/${projectRoot}/tsconfig.json`,
      JSON.stringify(tsconfig, null, 2)
    )

    // 9. Generate CLAUDE.md
    const claudeDoc = `# ${packageName}

${options.description ?? "Auth contract - single source of truth for auth types"}

## AI Agent Reference

This is a **contract library** defining auth types that are shared across the entire monorepo.

### CRITICAL: Single Source of Truth

This library defines the canonical auth types. Other libraries MUST import from here:

- **infra-rpc**: Imports \`CurrentUserData\`, \`CurrentUser\`, \`AuthError\`, \`RouteTag\`
- **infra-auth**: Imports \`AuthVerifier\` port and implements it
- **provider-supabase**: Maps to \`CurrentUserData\` at boundaries

### Structure

- **lib/schemas.ts**: \`CurrentUserData\`, \`AuthMethod\`, \`AuthSession\`, \`ServiceIdentity\`
- **lib/errors.ts**: \`AuthError\`, \`ServiceAuthError\` (Schema.TaggedError)
- **lib/ports.ts**: \`AuthVerifier\`, \`AuthProvider\`, \`ServiceAuthVerifier\`
- **lib/middleware.ts**: \`RouteTag\`, \`RouteType\`, \`CurrentUser\`, \`ServiceContext\`

### Usage

\`\`\`typescript
// In RPC handlers (protected routes):
import { CurrentUser } from "${packageName}"

const handler = Effect.gen(function*() {
  const user = yield* CurrentUser
  // user.id, user.email, user.roles available
})

// In contract RPC definitions:
import { RouteTag, RouteType } from "${packageName}"

export class GetCurrentUser extends Rpc.make("GetCurrentUser", { ... }) {
  static readonly [RouteTag]: RouteType = "protected"
}

// In infra-auth:
import { AuthVerifier, CurrentUserDataSchema } from "${packageName}"

export const AuthVerifierLive = Layer.effect(AuthVerifier, Effect.gen(function*() {
  // Implement verification...
}))
\`\`\`
`
    yield* adapter.writeFile(`${workspaceRoot}/${projectRoot}/CLAUDE.md`, claudeDoc)

    // Format generated code
    yield* Effect.try(() => {
      execSync(`pnpm exec eslint ${projectRoot}/src --ext .ts --fix`, {
        stdio: "ignore",
        cwd: process.cwd()
      })
    }).pipe(
      Effect.catchAll((error) =>
        Effect.logWarning(`Formatting skipped: ${error instanceof Error ? error.message : String(error)}`)
      )
    )

    return {
      projectName: "contract-auth",
      projectRoot,
      packageName,
      sourceRoot,
      filesGenerated: [
        `${sourceRoot}/lib/schemas.ts`,
        `${sourceRoot}/lib/errors.ts`,
        `${sourceRoot}/lib/ports.ts`,
        `${sourceRoot}/lib/middleware.ts`,
        `${sourceRoot}/index.ts`,
        `${sourceRoot}/types.ts`,
        `${projectRoot}/package.json`,
        `${projectRoot}/tsconfig.json`,
        `${projectRoot}/CLAUDE.md`
      ]
    }
  })
}
