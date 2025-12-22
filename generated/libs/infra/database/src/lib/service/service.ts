import { DatabaseConnectionError, DatabaseInternalError } from "./errors"
import { Kysely } from "@myorg/provider-kysely"
import { Context, Effect, Layer } from "effect"
import type { DatabaseError } from "./errors"

/**
 * Database Service
 *
 * Database infrastructure service that delegates to the Kysely provider.

This service wraps the Kysely provider to expose a simplified database API.
Types come from prisma-effect-kysely; the Kysely provider handles SDK integration.

Architecture:
  prisma-effect-kysely → generates DB types
  @myorg/provider-kysely → wraps Kysely SDK (Kysely Context.Tag)
  @myorg/infra-database → this service (DatabaseService)

Usage:
  const database = yield* DatabaseService;
  const users = yield* database.query((db) =>
    db.selectFrom("users").selectAll().execute()
  );
 *
 * @module @myorg/infra-database/service
 * @see EFFECT_PATTERNS.md for database patterns
 */

// ============================================================================
// Re-export Database Types from Provider
// ============================================================================

/**
 * Re-export Database type from provider for convenience
 *
 * In production, extend this with your prisma-effect-kysely types:
 *
 * @example
 * ```typescript
 * import type { DB } from "@myorg/prisma-types";
 *
 * declare module "@myorg/infra-database" {
 *   interface Database extends DB {}
 * }
 * ```
 */
export type { Database } from "@myorg/provider-kysely"

// ============================================================================
// Service Context.Tag Definition
// ============================================================================

/**
 * Database Service
 *
 * Database infrastructure that delegates to the Kysely provider.
 * Provides a simplified API for data-access libraries.
 *
 * @example
 * ```typescript
 * import { DatabaseService } from "@myorg/infra-database";
 *
 * const program = Effect.gen(function* () {
 *   const database = yield* DatabaseService;
 *
 *   // Simple query
 *   const users = yield* database.query((db) =>
 *     db.selectFrom("users").selectAll().execute()
 *   );
 *
 *   // Query with filtering
 *   const activeUsers = yield* database.query((db) =>
 *     db.selectFrom("users")
 *       .selectAll()
 *       .where("status", "=", "active")
 *       .execute()
 *   );
 *
 *   // Transaction
 *   yield* database.transaction((db) =>
 *     Effect.gen(function* () {
 *       const user = yield* database.query(() =>
 *         db.insertInto("users")
 *           .values({ name: "John" })
 *           .returningAll()
 *           .executeTakeFirstOrThrow()
 *       );
 *       yield* database.query(() =>
 *         db.insertInto("audit_logs")
 *           .values({ userId: user.id, action: "created" })
 *           .execute()
 *       );
 *       return user;
 *     })
 *   );
 * });
 *
 * // Provide layers
 * const runnable = program.pipe(
 *   Effect.provide(DatabaseService.Live),
 *   Effect.provide(Kysely.makeLive(kyselyInstance))
 * );
 * ```
 */
export class DatabaseService extends Context.Tag(
  "@myorg/infra-database/DatabaseService"
)<
  DatabaseService,
  {
    /**
     * Execute a database query
     *
     * Delegates to the Kysely provider's query method.
     *
     * @param fn - Query builder function that receives the Kysely instance
     * @returns Effect that succeeds with the query result
     */
    readonly query: <A>(
      fn: (db: import("kysely").Kysely<import("@myorg/provider-kysely").Database>) => Promise<A>
    ) => Effect.Effect<A, DatabaseError>

    /**
     * Execute multiple queries in a transaction
     *
     * All queries within the transaction share the same connection.
     * If any query fails, the entire transaction is rolled back.
     *
     * @param fn - Effect that performs database operations within transaction scope
     * @returns Effect that succeeds with the transaction result
     */
    readonly transaction: <A, E, R>(
      fn: (db: import("kysely").Kysely<import("@myorg/provider-kysely").Database>) => Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E | DatabaseError, R>

    /**
     * Health check for database connection
     *
     * @returns Effect that succeeds with true if database is healthy
     */
    readonly healthCheck: () => Effect.Effect<boolean, DatabaseError>
  }
>() {
  // ===========================================================================
  // Static Live Layer - Delegates to Kysely Provider
  // ===========================================================================

  /**
   * Live Layer - Delegates to the Kysely provider
   *
   * Requires Kysely layer to be provided.
   *
   * @example
   * ```typescript
   * import { Kysely, PostgresDialect } from "kysely";
   * import { Pool } from "pg";
   * import { Kysely as KyselyProvider } from "@myorg/provider-kysely";
   *
   * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   * const kyselyInstance = new Kysely({ dialect: new PostgresDialect({ pool }) });
   *
   * const program = myProgram.pipe(
   *   Effect.provide(DatabaseService.Live),
   *   Effect.provide(KyselyProvider.makeLive(kyselyInstance))
   * );
   * ```
   */
  static readonly Live = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          kysely.query(fn).pipe(
            Effect.mapError((error) =>
              new DatabaseInternalError({
                message: error.message,
                cause: error
              })
            ),
            Effect.withSpan("DatabaseService.query")
          ),

        transaction: (fn) =>
          kysely.transaction(fn).pipe(
            Effect.mapError((error) =>
              new DatabaseInternalError({
                message: "Transaction failed",
                cause: error
              })
            ),
            Effect.withSpan("DatabaseService.transaction")
          ),

        healthCheck: () =>
          kysely.healthCheck().pipe(
            Effect.mapError((error) =>
              new DatabaseConnectionError({
                message: "Health check failed",
                endpoint: "database",
                cause: error
              })
            ),
            Effect.withSpan("DatabaseService.healthCheck")
          )
      }
    })
  )

  // ===========================================================================
  // Static Test Layer - Delegates to Kysely Provider Test Layer
  // ===========================================================================

  /**
   * Test Layer - Uses the Kysely provider's Test layer
   *
   * Provides an in-memory mock database for testing.
   * No external database connection required.
   */
  static readonly Test = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          kysely.query(fn).pipe(
            Effect.mapError((error) =>
              new DatabaseInternalError({
                message: error.message,
                cause: error
              })
            )
          ),

        transaction: (fn) =>
          kysely.transaction(fn).pipe(
            Effect.mapError((error) =>
              new DatabaseInternalError({
                message: "Transaction failed",
                cause: error
              })
            )
          ),

        healthCheck: () =>
          kysely.healthCheck().pipe(
            Effect.mapError((error) =>
              new DatabaseConnectionError({
                message: "Health check failed",
                endpoint: "database",
                cause: error
              })
            )
          )
      }
    })
  ).pipe(Layer.provide(Kysely.Test))

  // ===========================================================================
  // Static Dev Layer - Uses Kysely Provider with Logging
  // ===========================================================================

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Uses the Kysely provider's Test layer with debug logging enabled.
   */
  static readonly Dev = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[DatabaseService] [DEV] Executing query")
            const result = yield* kysely.query(fn).pipe(
              Effect.mapError((error) =>
                new DatabaseInternalError({
                  message: error.message,
                  cause: error
                })
              )
            )
            yield* Effect.logDebug("[DatabaseService] [DEV] Query completed")
            return result
          }),

        transaction: (fn) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[DatabaseService] [DEV] Starting transaction")
            const result = yield* kysely.transaction(fn).pipe(
              Effect.mapError((error) =>
                new DatabaseInternalError({
                  message: "Transaction failed",
                  cause: error
                })
              )
            )
            yield* Effect.logDebug("[DatabaseService] [DEV] Transaction completed")
            return result
          }),

        healthCheck: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[DatabaseService] [DEV] Health check")
            return yield* kysely.healthCheck().pipe(
              Effect.mapError((error) =>
                new DatabaseConnectionError({
                  message: "Health check failed",
                  endpoint: "database",
                  cause: error
                })
              )
            )
          })
      }
    })
  ).pipe(Layer.provide(Kysely.Dev))
}
