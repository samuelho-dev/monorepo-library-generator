import { Context, Effect, Layer } from "effect";
import { KyselyError } from "../errors";

/**
 * Kysely Provider Service
 *
 * Kysely query builder provider with Effect integration.

Uses types from prisma-effect-kysely for type-safe database access.
The Database type should be imported from your Prisma-generated types.

Architecture:
  prisma-effect-kysely → generates DB types
  provider-kysely → wraps Kysely SDK (this library)
  infra-database → uses this provider, exposes DatabaseService
 *
 * @module @myorg/provider-kysely/service
 * @see https://kysely.dev for Kysely documentation
 */

import {
  DummyDriver,
  Kysely as KyselyDB,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";

// ============================================================================
// Database Types
// ============================================================================

/**
 * Database schema type
 *
 * Import your actual Database type from prisma-effect-kysely generated types:
 *
 * @example
 * ```typescript
 * import type { DB } from "@myorg/prisma-types";
 * export type Database = DB;
 * ```
 *
 * For now, using a placeholder that accepts any table structure.
 */
export interface Database {
  [tableName: string]: Record<string, unknown>;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Kysely Service Interface
 *
 * Provides type-safe database query execution using Kysely.
 * Wraps Kysely operations in Effect for proper error handling.
 */
export interface KyselyServiceInterface {
  /**
   * Execute a database query
   *
   * @param fn - Function that receives Kysely instance and returns a Promise
   * @returns Effect that succeeds with query result or fails with KyselyError
   *
   * @example
   * ```typescript
   * const users = yield* kysely.query((db) =>
   *   db.selectFrom("users").selectAll().execute()
   * );
   * ```
   */
  readonly query: <A>(fn: (db: KyselyDB<Database>) => Promise<A>) => Effect.Effect<A, KyselyError>;

  /**
   * Execute queries within a transaction
   *
   * @param fn - Function that receives Kysely transaction and returns Effect
   * @returns Effect that succeeds with transaction result
   *
   * @example
   * ```typescript
   * yield* kysely.transaction((trx) =>
   *   Effect.gen(function* () {
   *     const user = yield* kysely.query((db) =>
   *       trx.insertInto("users").values({ name: "John" }).returningAll().executeTakeFirstOrThrow()
   *     );
   *     yield* kysely.query((db) =>
   *       trx.insertInto("audit").values({ userId: user.id, action: "created" }).execute()
   *     );
   *     return user;
   *   })
   * );
   * ```
   */
  readonly transaction: <A, E, R>(
    fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | KyselyError, R>;

  /**
   * Get raw Kysely instance for advanced operations
   *
   * Prefer query() and transaction() for most use cases.
   * Use this only when you need direct Kysely access.
   */
  readonly getInstance: () => Effect.Effect<KyselyDB<Database>, KyselyError>;

  /**
   * Health check - verifies database connectivity
   */
  readonly healthCheck: () => Effect.Effect<boolean, KyselyError>;
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * Create a "cold" Kysely instance using DummyDriver
 *
 * This is Kysely's built-in approach for testing - creates a real Kysely
 * instance that compiles queries but returns empty results without
 * connecting to a database.
 *
 * @see https://kysely.dev/docs/recipes/splitting-query-building-and-execution
 */
function createDummyKysely(): KyselyDB<Database> {
  return new KyselyDB<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}

/**
 * Kysely Service Tag
 *
 * Access via: yield* Kysely
 *
 * Static layers:
 * - Kysely.makeLive(kyselyInstance) - Production with real Kysely instance
 * - Kysely.Test - Test layer using Kysely's DummyDriver
 * - Kysely.Dev - Development with query logging
 */
export class Kysely extends Context.Tag("Kysely")<Kysely, KyselyServiceInterface>() {
  /**
   * Create Live layer with a Kysely instance
   *
   * @param kyselyInstance - Configured Kysely instance
   * @returns Layer providing KyselyServiceInterface
   *
   * @example
   * ```typescript
   * import { Kysely, PostgresDialect } from "kysely";
   * import { Pool } from "pg";
   * import type { DB } from "@myorg/prisma-types";
   *
   * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   * const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
   *
   * const KyselyLive = Kysely.makeLive(db);
   * ```
   */
  static makeLive(kyselyInstance: KyselyDB<Database>) {
    return Layer.succeed(Kysely, {
      query: <A>(fn: (db: KyselyDB<Database>) => Promise<A>) =>
        Effect.tryPromise({
          try: () => fn(kyselyInstance),
          catch: (error) =>
            new KyselyError({
              message: "Query execution failed",
              cause: error,
            }),
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        fn(kyselyInstance).pipe(
          Effect.mapError((error) => {
            if (error instanceof KyselyError) return error;
            return new KyselyError({
              message: "Transaction failed",
              cause: error,
            });
          }),
        ),

      getInstance: () => Effect.succeed(kyselyInstance),

      healthCheck: () =>
        Effect.tryPromise({
          try: async () => {
            await kyselyInstance.selectFrom("_prisma_migrations").selectAll().limit(1).execute();
            return true;
          },
          catch: (error) =>
            new KyselyError({
              message: "Database health check failed",
              cause: error,
            }),
        }),
    });
  }

  /**
   * Test layer using Kysely's built-in DummyDriver
   *
   * Creates a "cold" Kysely instance that compiles queries correctly
   * but returns empty results without connecting to a database.
   * This is Kysely's recommended approach for testing query building logic.
   *
   * @see https://kysely.dev/docs/recipes/splitting-query-building-and-execution
   *
   * For integration tests with data, use makeLive() with a test database
   * or an in-memory database like SQLite/pglite.
   */
  static readonly Test = Layer.sync(Kysely, () => {
    const db = createDummyKysely();

    return {
      query: <A>(fn: (kyselyDb: KyselyDB<Database>) => Promise<A>) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) =>
            new KyselyError({
              message: "Query execution failed",
              cause: error,
            }),
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        fn(db).pipe(
          Effect.mapError((error) => {
            if (error instanceof KyselyError) return error;
            return new KyselyError({
              message: "Transaction failed",
              cause: error,
            });
          }),
        ),

      getInstance: () => Effect.succeed(db),

      healthCheck: () => Effect.succeed(true),
    };
  });

  /**
   * Dev layer - Development with query logging
   *
   * Uses DummyDriver for local development without database connection.
   * Logs all query operations for debugging.
   */
  static readonly Dev = Layer.sync(Kysely, () => {
    const db = createDummyKysely();

    return {
      query: <A>(fn: (kyselyDb: KyselyDB<Database>) => Promise<A>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug("[Kysely] [DEV] Executing query");
          const result = yield* Effect.tryPromise({
            try: () => fn(db),
            catch: (error) =>
              new KyselyError({
                message: "Query execution failed",
                cause: error,
              }),
          });
          yield* Effect.logDebug("[Kysely] [DEV] Query completed");
          return result;
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug("[Kysely] [DEV] Starting transaction");
          const result = yield* fn(db).pipe(
            Effect.mapError((error) => {
              if (error instanceof KyselyError) return error;
              return new KyselyError({
                message: "Transaction failed",
                cause: error,
              });
            }),
          );
          yield* Effect.logDebug("[Kysely] [DEV] Transaction completed");
          return result;
        }),

      getInstance: () => Effect.succeed(db),

      healthCheck: () => Effect.succeed(true),
    };
  });

  /**
   * Live layer placeholder
   *
   * In production, use makeLive() with a configured Kysely instance.
   * This placeholder fails with a helpful message.
   */
  static readonly Live = Layer.fail(
    new KyselyError({
      message: "Kysely Live layer not configured. Use Kysely.makeLive(kyselyInstance) instead.",
    }),
  );
}
