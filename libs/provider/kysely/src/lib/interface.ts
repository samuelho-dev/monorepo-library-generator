import type { Effect } from "effect"
import type { CompiledQuery, Kysely, RawBuilder, Transaction } from "kysely"
import type { DatabaseConnectionError, DatabaseQueryError, DatabaseTransactionError } from "./errors"

/**
 * Kysely Service Interface
 *
 * Type-safe database service interface.

Generic over DB type - the database schema is specified when creating the service.
All method parameter types are inferred from the interface.
 *
 * @module @samuelho-dev/provider-kysely/interface
 * @see https://kysely.dev for Kysely documentation
 */

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Kysely Service Interface
 *
 * Provides type-safe database operations using Kysely.
 * Generic over DB type - specify your database schema when creating the service.
 *
 * @typeParam DB - Database schema type from prisma-effect-kysely
 *
 * @example
 * ```typescript
 * import type { DB } from "@scope/types-database";
 *
 * const service: KyselyServiceInterface<DB> = {
 *   // Implementation with inferred types...
 * };
 * ```
 */
export interface KyselyServiceInterface<DB> {
  /**
   * Get the raw Kysely database instance
   *
   * Use for advanced operations not covered by other methods.
   */
  readonly getDb: () => Kysely<DB>

  /**
   * Execute a database query
   *
   * @param fn - Function that receives Kysely instance and returns a Promise
   * @returns Effect that succeeds with query result or fails with DatabaseQueryError
   *
   * @example
   * ```typescript
   * const users = yield* kysely.query((db) =>
   *   db.selectFrom("users").selectAll().execute()
   * )
   * ```
   */
  readonly query: <T>(
    fn: (db: Kysely<DB>) => Promise<T>
  ) => Effect.Effect<T, DatabaseQueryError>

  /**
   * Execute a compiled query
   *
   * @param query - Compiled query from Kysely
   * @returns Effect that succeeds with rows as unknown[]
   */
  readonly execute: (
    query: CompiledQuery
  ) => Effect.Effect<ReadonlyArray<unknown>, DatabaseQueryError>

  /**
   * Execute queries within a transaction
   *
   * @param fn - Function that receives transaction and returns Effect
   * @returns Effect that succeeds with transaction result
   *
   * @example
   * ```typescript
   * yield* kysely.transaction((tx) =>
   *   Effect.gen(function*() {
   *     yield* kysely.query(() =>
   *       tx.insertInto("users").values({ name: "John" }).execute()
   *     )
   *     yield* kysely.query(() =>
   *       tx.insertInto("audit").values({ action: "created" }).execute()
   *     )
   *   })
   * )
   * ```
   */
  readonly transaction: <A, E>(
    fn: (tx: Transaction<DB>) => Effect.Effect<A, E>
  ) => Effect.Effect<A, DatabaseTransactionError | E>

  /**
   * Execute raw SQL query
   *
   * @param query - SQL template literal result from kysely.sql
   * @returns Effect that succeeds with rows as unknown[]
   */
  readonly sql: (
    query: RawBuilder<unknown>
  ) => Effect.Effect<ReadonlyArray<unknown>, DatabaseQueryError>

  /**
   * Ping database to check connectivity
   *
   * @returns Effect that succeeds with void if connected
   */
  readonly ping: () => Effect.Effect<void, DatabaseConnectionError>

  /**
   * Get database introspection info
   *
   * @returns Effect with tables and dialect info
   */
  readonly introspection: () => Effect.Effect<
    { tables: Array<string>, dialect: string },
    DatabaseQueryError
  >

  /**
   * Destroy database connection
   *
   * @returns Effect that succeeds when connection is closed
   */
  readonly destroy: () => Effect.Effect<void>
}