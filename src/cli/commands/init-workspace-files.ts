/**
 * Workspace File Generation
 *
 * Generates workspace configuration files for monorepo setup:
 * - package.json with workspaces and scripts
 * - pnpm-workspace.yaml
 * - .npmrc
 *
 * This enables users to install dependencies and build all libraries.
 *
 * @module cli/commands/init-workspace-files
 */

import { Console, Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { WORKSPACE_CONFIG } from "../../utils/workspace-config"

/**
 * Workspace setup options
 */
export interface WorkspaceOptions {
  /**
   * Workspace name (defaults to directory name)
   */
  readonly name?: string | undefined

  /**
   * Include Nx configuration
   * @default true
   */
  readonly includeNx?: boolean | undefined

  /**
   * Package manager (pnpm, npm, yarn)
   * @default "pnpm"
   */
  readonly packageManager?: "pnpm" | "npm" | "yarn" | undefined
}

/**
 * Generate workspace configuration files
 *
 * Creates:
 * - package.json - Root package with workspaces, scripts, and dependencies
 * - pnpm-workspace.yaml - Workspace package patterns
 * - .npmrc - Package manager configuration
 *
 * These files enable:
 * - Dependency installation across all libraries
 * - Monorepo build and test scripts
 * - Consistent package manager behavior
 */
export function generateWorkspaceFiles(options: WorkspaceOptions = {}) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const name = options.name ?? "my-effect-monorepo"
    const includeNx = options.includeNx ?? true
    const packageManager = options.packageManager ?? "pnpm"

    yield* Console.log("📦 Setting up workspace configuration...")

    // 1. Generate package.json
    const packageJson = {
      name,
      version: "0.0.1",
      private: true,
      type: "module",
      workspaces: packageManager === "pnpm" ? undefined : ["libs/**"],
      engines: {
        node: ">=20.0.0",
        pnpm: ">=9.0.0"
      },
      scripts: {
        // Build scripts
        build: includeNx
          ? "nx run-many --target=build --all"
          : "pnpm -r --workspace-concurrency=10 run build",
        "build:affected": includeNx
          ? "nx affected --target=build"
          : "pnpm -r --filter='...[HEAD^]' run build",

        // Test scripts
        test: includeNx
          ? "nx run-many --target=test --all"
          : "pnpm -r run test",
        "test:affected": includeNx
          ? "nx affected --target=test"
          : "pnpm -r --filter='...[HEAD^]' run test",
        "test:watch": "vitest --watch",

        // Lint scripts
        lint: includeNx
          ? "nx run-many --target=lint --all"
          : "pnpm -r run lint",
        "lint:fix": includeNx
          ? "nx run-many --target=lint --all --fix"
          : "pnpm -r run lint --fix",

        // Type checking
        typecheck: includeNx
          ? "nx run-many --target=typecheck --all"
          : "pnpm -r run typecheck",

        // Prisma scripts
        "prisma:generate": "prisma generate",
        "prisma:migrate": "prisma migrate dev",
        "prisma:studio": "prisma studio",
        "prisma:reset": "prisma migrate reset",

        // Utility scripts
        clean: includeNx
          ? "nx reset && rm -rf node_modules dist .nx"
          : "rm -rf node_modules dist libs/**/node_modules libs/**/dist",
        format: "prettier --write .",
        "format:check": "prettier --check ."
      },
      devDependencies: {
        // Nx (if included)
        ...(includeNx && {
          "@nx/js": "^20.2.2",
          "@nx/vite": "^20.2.2",
          nx: "^20.2.2"
        }),

        // TypeScript
        "@types/node": "^22.10.2",
        typescript: "^5.7.2",

        // Testing
        vitest: "^4.0.15",
        "@vitest/ui": "^4.0.15",

        // Linting & Formatting
        "@typescript-eslint/eslint-plugin": "^8.18.2",
        "@typescript-eslint/parser": "^8.18.2",
        eslint: "^9.17.0",
        prettier: "^3.4.2",

        // Prisma
        prisma: "^6.2.1",
        "prisma-effect-kysely": "latest"
      },
      dependencies: {
        // Effect runtime
        effect: "^3.19.9",
        "@effect/platform": "^0.93.6",
        "@effect/platform-node": "^0.100.0",
        "@effect/schema": "^0.75.5",

        // Prisma client
        "@prisma/client": "^6.2.1"
      },
      packageManager: packageManager === "pnpm" ? "pnpm@9.15.0" : undefined
    }

    yield* fs.writeFileString(
      "package.json",
      JSON.stringify(packageJson, null, 2) + "\n"
    )

    yield* Console.log("  ✓ Created package.json")

    // 2. Generate pnpm-workspace.yaml (if using pnpm)
    if (packageManager === "pnpm") {
      const workspaceYaml = `# pnpm workspace configuration
# See: https://pnpm.io/workspaces

packages:
  # All libraries
  - 'libs/**'

  # Example apps (if you create any)
  - 'apps/**'
`

      yield* fs.writeFileString("pnpm-workspace.yaml", workspaceYaml)
      yield* Console.log("  ✓ Created pnpm-workspace.yaml")
    }

    // 3. Generate .npmrc
    const npmrcContent =
      packageManager === "pnpm"
        ? `# pnpm configuration
# See: https://pnpm.io/npmrc

# Workspace settings
auto-install-peers=true
strict-peer-dependencies=false

# Hoist dependencies to root node_modules
# This allows Effect runtime to be shared across all libraries
shamefully-hoist=true

# Use workspace protocol for internal dependencies
link-workspace-packages=true

# Parallel execution
workspace-concurrency=10
`
        : `# npm/yarn configuration

# Use workspace protocol for internal dependencies
link-workspace-packages=true
`

    yield* fs.writeFileString(".npmrc", npmrcContent)
    yield* Console.log("  ✓ Created .npmrc")

    // 4. Generate tsconfig.base.json
    const scope = WORKSPACE_CONFIG.getScope()
    const tsconfigBase = {
      compilerOptions: {
        // Module system
        module: "ESNext",
        moduleResolution: "bundler",
        target: "ES2022",

        // Type checking
        strict: true,
        exactOptionalPropertyTypes: true,
        noFallthroughCasesInSwitch: true,
        noImplicitOverride: true,
        noImplicitReturns: true,
        noPropertyAccessFromIndexSignature: true,
        noUncheckedIndexedAccess: true,
        noUnusedLocals: true,
        noUnusedParameters: true,

        // JavaScript support
        allowJs: false,
        checkJs: false,

        // Module detection
        moduleDetection: "force",

        // Output
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        importHelpers: false,

        // Interop
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        verbatimModuleSyntax: true,

        // Advanced
        skipLibCheck: true,
        resolveJsonModule: true,
        isolatedModules: true,

        // Library
        lib: ["ES2022"],

        // TypeScript path mappings for monorepo
        // Enables imports like: import { User } from '@custom-repo/contract-user'
        paths: {
          [`${scope}/contract-*`]: ["libs/contract/*/src/index.ts"],
          [`${scope}/data-access-*`]: ["libs/data-access/*/src/index.ts"],
          [`${scope}/feature-*`]: ["libs/feature/*/src/index.ts"],
          [`${scope}/infra-*`]: ["libs/infra/*/src/index.ts"],
          [`${scope}/provider-*`]: ["libs/provider/*/src/index.ts"],
          [`${scope}/env`]: ["libs/env/src/index.ts"]
        }
      },
      exclude: ["node_modules", "dist", "build", ".nx"]
    }

    yield* fs.writeFileString(
      "tsconfig.base.json",
      JSON.stringify(tsconfigBase, null, 2) + "\n"
    )
    yield* Console.log("  ✓ Created tsconfig.base.json")

    // 5. Generate nx.json (if includeNx is true)
    if (includeNx) {
      const nxJson = {
        "$schema": "./node_modules/nx/schemas/nx-schema.json",
        targetDefaults: {
          build: {
            cache: true,
            dependsOn: ["^build"],
            inputs: ["production", "^production"]
          },
          test: {
            cache: true,
            inputs: ["default", "^production", "{workspaceRoot}/vitest.config.ts"]
          },
          lint: {
            cache: true,
            inputs: ["default", "{workspaceRoot}/eslint.config.mjs"]
          },
          typecheck: {
            cache: true,
            inputs: ["default", "^production"]
          }
        },
        namedInputs: {
          default: ["{projectRoot}/**/*", "sharedGlobals"],
          production: [
            "default",
            "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
            "!{projectRoot}/tsconfig.spec.json"
          ],
          sharedGlobals: []
        },
        plugins: [
          {
            plugin: "@nx/vite/plugin",
            options: {
              buildTargetName: "build",
              testTargetName: "test"
            }
          }
        ]
      }

      yield* fs.writeFileString(
        "nx.json",
        JSON.stringify(nxJson, null, 2) + "\n"
      )
      yield* Console.log("  ✓ Created nx.json")
    }

    // 6. Generate .gitignore if it doesn't exist
    const gitignoreExists = yield* fs.exists(".gitignore")
    if (!gitignoreExists) {
      const gitignore = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
out/
.next/
.turbo/

# Nx
.nx/

# Test coverage
coverage/
.nyc_output/

# Environment variables
.env
.env.local
.env.*.local

# Editor directories
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Temporary files
*.tmp
.cache/

# Prisma
prisma/dev.db
prisma/dev.db-journal
`

      yield* fs.writeFileString(".gitignore", gitignore)
      yield* Console.log("  ✓ Created .gitignore")
    }

    yield* Console.log("")
  })
}
