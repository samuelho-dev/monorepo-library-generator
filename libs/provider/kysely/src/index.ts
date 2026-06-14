/**
 * Kysely Provider Library
 *
 * Kysely database query builder provider with Effect integration.
 *
 * **Generic-parameter exception** (CLAUDE.md § Service Naming): the tag is
 * `Context.GenericTag<KyselyServiceInterface<DB>>` returned from a factory
 * (`KyselyService<DB>()`), so each call site constructs its own tag instance.
 * Static `Live`/`Test`/`Auto` cannot live on the tag because there is no class
 * to attach them to. The Live/Test/Auto trio lives one level up in
 * `infra-database`, which wraps this tag with a concrete `DB` schema and
 * connection management — consumers depend on `infra-database`, not this lib.
 *
 * Public surface here: `makeKyselyService<DB>(opts)` for ad-hoc construction
 * and `makeTestKyselyService<DB>(opts)` for in-memory mocks.
 *
 * Usage:
 *   import type { DB } from "@samuelho-dev/infra-database"
 *   const kysely = yield* makeKyselyService<DB>({ connectionString: "..." })
 *   const users = yield* kysely.query((db) => db.selectFrom("users").selectAll().execute())
 */

// ============================================================================
// Error Types
// ============================================================================

export {
  type DatabaseError,
  DatabaseQueryError,
  DatabaseTransactionError,
  KyselyConnectionError,
  PG_UNIQUE_VIOLATION_CODE
} from './lib/errors'

// ============================================================================
// Interface
// ============================================================================

export type { KyselyServiceInterface } from './lib/interface'

// ============================================================================
// Service
// ============================================================================

export {
  type KyselyConfig,
  KyselyService,
  type MockServiceOptions,
  makeKyselyService,
  makeTestKyselyService
} from './lib/service'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Example
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// import type { DB } from "@samuelho-dev/infra-database";
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
