/**
 * Kysely Provider Index Template
 *
 * Specialized index.ts template for the Kysely database query builder provider.
 *
 * @module monorepo-library-generator/provider/templates/kysely/kysely-index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate Kysely provider index.ts file
 */
export function generateKyselyIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Provider Library`,
    description: `Kysely database query builder provider with Effect integration.

Generic over DB type - specify your database schema when creating the service.

Usage:
  import type { DB } from "${scope}/types-database"  const kysely = yield* make${className}Service<DB>({ connectionString: "..." })
  const users = yield* kysely.query((db) => db.selectFrom("users").selectAll().execute())`
  })

  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Error Types")
  builder.addBlankLine()

  builder.addRaw(`export {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseTransactionError,
  type DatabaseError,
} from "./lib/errors"
`)

  builder.addBlankLine()

  // Interface export
  builder.addSectionComment("Interface")
  builder.addBlankLine()

  builder.addRaw(`export type { ${className}ServiceInterface } from "./lib/interface"
`)

  builder.addBlankLine()

  // Service exports
  builder.addSectionComment("Service")
  builder.addBlankLine()

  builder.addRaw(`export {
  ${className}Service,
  make${className}Service,
  makeTest${className}Service,
  type ${className}Config,
  type MockServiceOptions,
} from "./lib/service"
`)

  builder.addBlankLine()

  // Usage example
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Usage Example")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment(`import type { DB } from "${scope}/types-database";`)
  builder.addComment(
    `import { make${className}Service, ${className}Service } from "${packageName}";`
  )
  builder.addComment("")
  builder.addComment("const program = Effect.gen(function*() {")
  builder.addComment(`  const kysely = yield* make${className}Service<DB>({`)
  builder.addComment("    connectionString: process.env.DATABASE_URL,")
  builder.addComment("  })")
  builder.addComment("")
  builder.addComment("  const users = yield* kysely.query((db) =>")
  builder.addComment("    db.selectFrom('users').selectAll().execute()")
  builder.addComment("  )")
  builder.addComment("  return users;")
  builder.addComment("})")
  builder.addComment("")
  builder.addComment("// For testing:")
  builder.addComment(`const mockService = makeTest${className}Service<DB>({`)
  builder.addComment("  mockTables: ['users', 'posts']")
  builder.addComment("})")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
