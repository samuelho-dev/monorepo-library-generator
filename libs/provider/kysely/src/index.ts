/**
 * Kysely Provider Library
 *
 * Kysely database query builder provider with Effect integration.

Generic over DB type - specify your database schema when creating the service.

Usage:
  import type { DB } from "@samuelho-dev/types-database"  const kysely = yield* makeKyselyService<DB>({ connectionString: "..." })
  const users = yield* kysely.query((db) => db.selectFrom("users").selectAll().execute())
 *
 */

// ============================================================================
// Error Types
// ============================================================================

export { DatabaseConnectionError, type DatabaseError, DatabaseQueryError, DatabaseTransactionError } from "./lib/errors"

// ============================================================================
// Interface
// ============================================================================

export type { KyselyServiceInterface } from "./lib/interface"

// ============================================================================
// Service
// ============================================================================

export {
  type KyselyConfig,
  KyselyService,
  makeKyselyService,
  makeTestKyselyService,
  type MockServiceOptions
} from "./lib/service"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Example
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// import type { DB } from "@samuelho-dev/types-database";
// import { makeKyselyService, KyselyService } from "@samuelho-dev/provider-kysely";
//
// const program = Effect.gen(function*() {
//   const kysely = yield* makeKyselyService<DB>({
//     connectionString: process.env.DATABASE_URL,
//   })
//
//   const users = yield* kysely.query((db) =>
//     db.selectFrom('users').selectAll().execute()
//   )
//   return users;
// })
//
// // For testing:
// const mockService = makeTestKyselyService<DB>({
//   mockTables: ['users', 'posts']
// })
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
