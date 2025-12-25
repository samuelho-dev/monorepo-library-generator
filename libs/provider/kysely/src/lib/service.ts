import { DatabaseConnectionError, DatabaseQueryError, DatabaseTransactionError } from "./errors"
import { Context, Effect } from "effect"

/**
 * Kysely Provider Service
 *
 * Kysely query builder provider with Effect integration.

Generic over DB type - specify your database schema when creating the service:
  const service = yield* makeKyselyService<DB>(config);

Architecture:
  prisma-effect-kysely → generates DB types
  provider-kysely → wraps Kysely SDK (this library)
  infra-database → uses this provider, exposes DatabaseService
 *
 * @module @samuelho-dev/provider-kysely/service
 * @see https://kysely.dev for Kysely documentation
 */


import {
  Kysely,
  PostgresDialect,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  DummyDriver,
  sql,
} from "kysely";
import type { Transaction } from "kysely";
import { Pool } from "pg";
import type { KyselyServiceInterface } from "./interface";
import { DB } from "types/database";


// ============================================================================
// Configuration
// ============================================================================


/**
 * Configuration for Kysely connection
 */
export interface KyselyConfig {
  readonly connectionString?: string;
  readonly host?: string;
  readonly port?: number;
  readonly database?: string;
  readonly username?: string;
  readonly password?: string;
  readonly max?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
}

/**
 * Validate database connection configuration
 *
 * Returns Effect for Effect-idiomatic error handling (no try-catch)
 */
const validateConnectionConfig = (config: KyselyConfig) =>
  Effect.gen(function*() {
    if (config.connectionString) {
      yield* Effect.try({
        try: () => {
          const url = new URL(config.connectionString!);
          if (!["postgres:", "postgresql:"].includes(url.protocol)) {
            throw new Error(`Invalid database protocol: ${url.protocol}. Expected postgres: or postgresql:`);
          }
        },
        catch: (error) =>
          new DatabaseConnectionError({
            message: `Invalid connection string: ${String(error)}`,
            cause: error,
          }),
      });
    } else if (!(config.host && config.database)) {
      return yield* Effect.fail(
        new DatabaseConnectionError({
          message: "Database configuration requires either connectionString or host + database",
          cause: undefined,
        })
      );
    }
  });

// ============================================================================
// Service Factory
// ============================================================================


/**
 * Create a Kysely service implementation
 *
 * @typeParam DB - Database schema type from prisma-effect-kysely
 * @param config - Database connection configuration
 * @returns Effect that provides the typed Kysely service
 *
 * @example
 * ```typescript
 * import type { DB } from "@samuelho-dev/types-database";
 *
 * const program = Effect.gen(function*() {
 *   const kysely = yield* makeKyselyService<DB>({
 *     connectionString: process.env.DATABASE_URL
 *   });
 *
 *   const users = yield* kysely.query((db) =>
 *     db.selectFrom("users").selectAll().execute()
 *   );
 * });
 * ```
 */
export const makeKyselyService = <DB = unknown>(config: KyselyConfig = {}) =>
  Effect.gen(function*() {
    // Validate configuration (Effect-idiomatic - no try-catch)
    yield* validateConnectionConfig(config);

    // Create database connection pool
    const pool = new Pool({
      connectionString: config.connectionString,
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    });

    // Register cleanup
    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        await pool.end();
      })
    );

    // Create Kysely instance with DB type
    const db = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
    });

    // Service implementation - types inferred from interface
    const service: KyselyServiceInterface<DB> = {
      getDb: () => db,

      query: (fn) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) =>
            new DatabaseQueryError({
              operation: "query",
              message: `Query failed: ${error}`,
              cause: error,
            }),
        }),

      execute: (query) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db.executeQuery(query);
            if (!Array.isArray(result.rows)) {
              throw new Error("Database returned non-array result");
            }
            return result.rows;
          },
          catch: (error) =>
            new DatabaseQueryError({
              operation: "execute",
              message: `Query execution failed: ${error}`,
              query: query.sql,
              cause: error,
            }),
        }),

      transaction: (fn) =>
        Effect.tryPromise({
          try: async () => {
            return await db.transaction().execute(async (tx) => {
              return await Effect.runPromise(fn(tx));
            });
          },
          catch: (error) =>
            new DatabaseTransactionError({
              message: `Transaction failed: ${error}`,
              cause: error,
            }),
        }),

      sql: (query) =>
        Effect.tryPromise({
          try: async () => {
            const result = await query.execute(db);
            if (!Array.isArray(result.rows)) {
              throw new Error("SQL query returned non-array result");
            }
            return result.rows;
          },
          catch: (error) =>
            new DatabaseQueryError({
              operation: "sql",
              message: `SQL query failed: ${error}`,
              cause: error,
            }),
        }),

      ping: () =>
        Effect.tryPromise({
          try: async () => {
            await sql`SELECT 1`.execute(db);
          },
          catch: (error) =>
            new DatabaseConnectionError({
              message: `Database ping failed: ${error}`,
              cause: error,
              host: config.host,
              port: config.port,
              database: config.database,
            }),
        }),

      introspection: () =>
        Effect.tryPromise({
          try: async () => {
            const result = await sql`
              SELECT table_name
              FROM information_schema.tables
              WHERE table_schema = 'public'
            `.execute(db);

            const tables = result.rows.map((row) => {
              if (row && typeof row === "object" && "table_name" in row) {
                return String(row.table_name);
              }
              return "unknown_table";
            });

            return { tables, dialect: "postgresql" };
          },
          catch: (error) =>
            new DatabaseQueryError({
              operation: "introspection",
              message: `Introspection failed: ${error}`,
              cause: error,
            }),
        }),

      destroy: () =>
        Effect.promise(async () => {
          await db.destroy();
        }),
    };

    return service;
  });

// ============================================================================
// Mock Service Factory
// ============================================================================


/**
 * Mock service configuration options
 */
export interface MockServiceOptions {
  /** Simulate errors for testing error paths */
  simulateErrors?: boolean;
  /** Add artificial latency in milliseconds */
  latency?: number;
  /** Custom mock data to return from queries */
  mockData?: Record<string, Array<unknown>>;
  /** Tables to report in introspection */
  mockTables?: Array<string>;
}

/**
 * Create a test service using Kysely's native DummyDriver
 *
 * Uses Kysely's built-in DummyDriver which provides a real Kysely instance
 * without requiring a database connection. Queries compile but return empty results.
 *
 * @typeParam DB - Database schema type
 * @param options - Mock configuration options
 * @returns Kysely service with DummyDriver for testing
 *
 * @see https://kysely.dev/docs/recipes/splitting-query-building-and-execution
 *
 * @example
 * ```typescript
 * const testService = makeTestKyselyService<DB>({
 *   mockTables: ["users", "posts"]
 * });
 *
 * // getDb() returns a real Kysely instance with DummyDriver
 * const db = testService.getDb();
 * const query = db.selectFrom("users").selectAll().compile();
 * // query.sql === 'select * from "users"'
 * ```
 */
export const makeTestKyselyService = <DB = unknown>(
  options: MockServiceOptions = {}
) => {
  const {
    simulateErrors = false,
    latency = 0,
    mockData = {},
    mockTables = [],
  } = options;

  // Create Kysely with DummyDriver - Kysely's native testing approach
  // This provides a real Kysely instance that compiles queries without a database
  const db = new Kysely<DB>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });

  const withLatency = <T, E>(effect: Effect.Effect<T, E>) =>
    latency > 0 ? Effect.delay(effect, latency) : effect;

  const service: KyselyServiceInterface<DB> = {
    // Returns real Kysely instance with DummyDriver
    getDb: () => db,

    query: (fn) =>
      withLatency(
        simulateErrors && Math.random() > 0.5
          ? Effect.fail(
              new DatabaseQueryError({
                operation: "query",
                message: "Mock query error for testing",
                cause: new Error("Simulated query failure"),
              })
            )
          : Effect.tryPromise({
              try: () => fn(db),
              catch: () => mockData.query ?? [],
            }).pipe(Effect.orElseSucceed(() => mockData.query ?? []))
      ),

    execute: (query) =>
      withLatency(
        simulateErrors && Math.random() > 0.5
          ? Effect.fail(
              new DatabaseQueryError({
                operation: "execute",
                message: "Mock execute error for testing",
                query: query.sql,
                cause: new Error("Simulated execution failure"),
              })
            )
          : Effect.succeed(mockData[query.sql] ?? mockData.execute ?? [])
      ),

    // Transaction uses DummyDriver's transaction support
    transaction: (fn) =>
      withLatency(
        simulateErrors && Math.random() > 0.7
          ? Effect.fail(
              new DatabaseTransactionError({
                message: "Mock transaction error for testing",
                cause: new Error("Simulated transaction failure"),
              })
            )
          : Effect.tryPromise({
              try: () => db.transaction().execute((tx) => Effect.runPromise(fn(tx))),
              catch: (error) =>
                new DatabaseTransactionError({
                  message: `Transaction failed: ${error}`,
                  cause: error,
                }),
            })
      ),

    sql: () =>
      withLatency(
        simulateErrors && Math.random() > 0.5
          ? Effect.fail(
              new DatabaseQueryError({
                operation: "sql",
                message: "Mock SQL error for testing",
                cause: new Error("Simulated SQL failure"),
              })
            )
          : Effect.succeed(mockData.sql ?? [])
      ),

    ping: () =>
      withLatency(
        simulateErrors && Math.random() > 0.8
          ? Effect.fail(
              new DatabaseConnectionError({
                message: "Mock connection error for testing",
                cause: new Error("Simulated connection failure"),
              })
            )
          : Effect.succeed(undefined)
      ),

    introspection: () =>
      withLatency(
        simulateErrors && Math.random() > 0.9
          ? Effect.fail(
              new DatabaseQueryError({
                operation: "introspection",
                message: "Mock introspection error for testing",
                cause: new Error("Simulated introspection failure"),
              })
            )
          : Effect.succeed({ tables: mockTables, dialect: "postgresql" })
      ),

    destroy: () => Effect.promise(() => db.destroy()),
  };

  return service;
};

// ============================================================================
// Context Tag
// ============================================================================


/**
 * Kysely Service Tag
 *
 * Used for dependency injection via Effect's Context system.
 *
 * @typeParam DB - Database schema type
 *
 * @example
 * ```typescript
 * import type { DB } from "@samuelho-dev/types-database";
 *
 * const KyselyTag = KyselyService<DB>();
 *
 * const program = Effect.gen(function*() {
 *   const kysely = yield* KyselyTag;
 *   // Use kysely service...
 * });
 * ```
 */
export const KyselyService<DB>() =>
  Context.GenericTag<KyselyServiceInterface<DB>>("KyselyService");
