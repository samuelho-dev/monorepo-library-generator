/**
 * Kysely Provider Library
 *
 * Kysely database query builder provider with Effect integration.

This library wraps the Kysely query builder in Effect types for composable error handling.
Types should come from prisma-effect-kysely for type-safe database access.

Effect 3.0+ Pattern:
  - Kysely extends Context.Tag
  - Access layers via static members: Kysely.Test, Kysely.makeLive()

Usage:
  import { Kysely } from '@myorg/provider-kysely';
  const testLayer = Kysely.Test;
  const liveLayer = Kysely.makeLive(kyselyInstance);
 *
 */


// ============================================================================
// Error Types
// ============================================================================


export {
  KyselyError,
  KyselyConnectionError,
  KyselyQueryError,
  KyselyTransactionError,
  KyselyConstraintError,
} from "./lib/errors";
export type { KyselyProviderError } from "./lib/errors";


// ============================================================================
// Service
// ============================================================================


// Kysely - Query builder provider with Effect integration

// 

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - Kysely.Test     (uses Kysely DummyDriver for cold queries)

//   - Kysely.Dev      (DummyDriver with query logging)

//   - Kysely.makeLive(kyselyInstance)  (production)


export { Kysely, type Database, type KyselyServiceInterface } from "./lib/service";


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect } from 'effect';

// import { Kysely } from '@myorg/provider-kysely';

// 

// const program = Effect.gen(function* () {

//   const db = yield* Kysely;

//   const users = yield* db.query((kysely) =>

//     kysely.selectFrom('users').selectAll().execute()

//   );

//   return users;

// });

// 

// // For testing with Kysely's DummyDriver:

// const runnable = program.pipe(Effect.provide(Kysely.Test));

// 

// // For production with real database:

// // const runnable = program.pipe(Effect.provide(Kysely.makeLive(kyselyInstance)));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
