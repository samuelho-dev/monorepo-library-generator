/**
 * Types Database Generator for CLI
 *
 * Generates the types-database library which contains Prisma-generated
 * Kysely types for type-safe database access.
 *
 * This generator:
 * 1. Creates the library scaffold (package.json, tsconfig.json, src/)
 * 2. Runs prisma generate to create types from schema
 *
 * @module cli/generators/types-database
 */

import { Console, Effect } from "effect"
import { execSync } from "node:child_process"
import { createEffectFsAdapter } from "../../utils/filesystem"
import { WORKSPACE_CONFIG } from "../../utils/workspace-config"

/**
 * Types Database Generator Options
 */
export interface TypesDatabaseOptions {
  /**
   * Skip running prisma generate (just scaffold)
   * @default false
   */
  readonly skipGenerate?: boolean
}

/**
 * Generate Types Database Library
 *
 * Creates the types-database library with:
 * - package.json (scoped package)
 * - tsconfig.json (extends base)
 * - src/index.ts (barrel exports)
 * - src/lib/ (output directory for prisma-effect-kysely)
 *
 * Then runs prisma generate to populate src/lib/types.ts and src/lib/enums.ts
 */
export function generateTypesDatabase(options: TypesDatabaseOptions = {}) {
  return Effect.gen(function*() {
    const scope = WORKSPACE_CONFIG.getScope()
    const packageName = `${scope}/types-database`
    const projectRoot = "libs/types/database"
    const sourceRoot = `${projectRoot}/src`
    const skipGenerate = options.skipGenerate ?? false

    yield* Console.log(`Creating types-database library...`)

    // Create file system adapter
    const workspaceRoot = process.cwd()
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    // Create directory structure
    yield* adapter.makeDirectory(`${workspaceRoot}/${sourceRoot}/lib`)

    // 1. Generate package.json
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
        }
      },
      dependencies: {
        kysely: "catalog:"
      },
      peerDependencies: {
        kysely: "^0.27.0"
      }
    }
    yield* adapter.writeFile(
      `${workspaceRoot}/${projectRoot}/package.json`,
      JSON.stringify(packageJson, null, 2)
    )

    // 2. Generate tsconfig.json
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

    // 3. Generate src/index.ts (barrel export)
    // Use named exports to satisfy biome noReExportAll rule
    const indexContent = `/**
 * ${packageName}
 *
 * Generated Kysely types from Prisma schema.
 * This is the single source of truth for database types.
 *
 * @module ${packageName}
 */

// Re-export generated types (named exports for biome noReExportAll compliance)
export type {
  UserTable,
  User,
  UserSelect,
  UserInsert,
  UserUpdate,
  DB,
  Json
} from "./lib/types"

// Re-export enums (placeholder - add enum types here after prisma generate)
export {} from "./lib/enums"
`
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/index.ts`, indexContent)

    // 4. Generate placeholder types.ts (will be overwritten by prisma generate)
    // Include User types for downstream libraries (contract, data-access, feature)
    const placeholderTypes = `/**
 * Database Types (Placeholder)
 *
 * This file will be overwritten by prisma-effect-kysely generator.
 * Run: pnpm prisma generate
 *
 * These placeholder types allow downstream libraries to compile before
 * Prisma schema is configured. Replace with actual schema types.
 */

import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"

// ============================================================================
// Placeholder Entity Types (Replace with Prisma-generated types)
// ============================================================================

/**
 * User table interface (placeholder)
 *
 * Replace this with your actual Prisma model once schema is configured.
 */
export interface UserTable {
  id: Generated<string>
  email: string;
  name: string | null;
  createdAt: Generated<Date>
  updatedAt: Date;
}

// Kysely operation types for User
export type User = Selectable<UserTable>
export type UserSelect = User;
export type UserInsert = Insertable<UserTable>
export type UserUpdate = Updateable<UserTable>

// ============================================================================
// Database Interface
// ============================================================================

/**
 * DB interface - maps table names to table types
 *
 * prisma-effect-kysely will overwrite this with actual schema.
 */
export interface DB {
  user: UserTable;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type for JSON columns
 */
export type Json = ColumnType<unknown, string, string>
`
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/types.ts`, placeholderTypes)

    // 5. Generate placeholder enums.ts
    const placeholderEnums = `/**
 * Database Enums (Placeholder)
 *
 * This file will be overwritten by prisma-effect-kysely generator.
 * Run: pnpm prisma generate
 */

// Enums will be generated here by prisma-effect-kysely
export {};
`
    yield* adapter.writeFile(`${workspaceRoot}/${sourceRoot}/lib/enums.ts`, placeholderEnums)

    // 6. Generate CLAUDE.md
    const claudeDoc = `# ${packageName}

Generated Kysely types from Prisma schema.

## AI Agent Reference

This is a **types library** containing database schema types generated by \`prisma-effect-kysely\`.

### CRITICAL: Generated Types

These types are AUTO-GENERATED. Do not manually edit:
- \`src/lib/types.ts\` - Table interfaces and DB type
- \`src/lib/enums.ts\` - PostgreSQL enum types

To regenerate after schema changes:
\`\`\`bash
pnpm prisma generate
\`\`\`

### Usage

\`\`\`typescript
import type { DB } from "${packageName}";
import { makeKyselyService } from "${scope}/provider-kysely"// Create Kysely service with type-safe DB
const kysely = yield* makeKyselyService<DB>({
  connectionString: process.env.DATABASE_URL
})

// All queries are now type-safe
const users = yield* kysely.query((db) =>
  db.selectFrom("user").selectAll().execute()
)
\`\`\`

### Prisma Configuration

The generator is configured in \`prisma/schema.prisma\`:

\`\`\`prisma
generator prisma_effect_kysely {
  provider     = "prisma-effect-kysely"
  output       = "../../libs/types/database/src/lib"
  enumFileName = "enums.ts"
  fileName     = "types.ts"
}
\`\`\`
`
    yield* adapter.writeFile(`${workspaceRoot}/${projectRoot}/CLAUDE.md`, claudeDoc)

    // 7. Run prisma generate (unless skipped)
    if (!skipGenerate) {
      yield* Console.log(`  Running prisma generate...`)

      yield* Effect.try(() => {
        execSync(`pnpm prisma generate --schema=prisma`, {
          stdio: "inherit",
          cwd: process.cwd()
        })
      }).pipe(
        Effect.catchAll((error) => {
          return Console.log(
            `  ⚠ Prisma generate skipped: ${error instanceof Error ? error.message : String(error)}`
          )
        })
      )
    }

    // 8. Format generated code
    yield* Effect.try(() => {
      execSync(`pnpm exec eslint ${projectRoot}/src --ext .ts --fix`, {
        stdio: "ignore",
        cwd: process.cwd()
      })
    }).pipe(
      Effect.catchAll((error) =>
        Effect.logWarning(
          `Formatting skipped: ${error instanceof Error ? error.message : String(error)}`
        )
      )
    )

    return {
      projectName: "types-database",
      projectRoot,
      packageName,
      sourceRoot,
      filesGenerated: [
        `${sourceRoot}/index.ts`,
        `${sourceRoot}/lib/types.ts`,
        `${sourceRoot}/lib/enums.ts`,
        `${projectRoot}/package.json`,
        `${projectRoot}/tsconfig.json`,
        `${projectRoot}/CLAUDE.md`
      ]
    }
  })
}
