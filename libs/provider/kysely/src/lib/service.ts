import { type Cause, Context, Effect, Exit } from 'effect'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  sql,
  type Transaction
} from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import { DatabaseQueryError, DatabaseTransactionError, KyselyConnectionError } from './errors'
import type { KyselyServiceInterface } from './interface'

/**
 * Kysely Provider Service
 *
 * Kysely query builder provider with Effect integration.
 * Uses postgres.js for Bun-optimized database connections.
 *
 * Generic over DB type - specify your database schema when creating the service:
 *   const service = yield* makeKyselyService<DB>(config)
 *
 * Architecture:
 *   prisma-effect-kysely → generates DB types
 *   provider-kysely → wraps Kysely SDK (this library)
 *   infra-database → uses this provider, exposes DatabaseService
 *
 * @module @samuelho-dev/provider-kysely/service
 * @see https://kysely.dev for Kysely documentation
 * @see https://github.com/porsager/postgres for postgres.js
 */

type PostgresConnection = ReturnType<typeof postgres>

/**
 * Extract the pg driver's SQLSTATE code and constraint name from a raw
 * error. `pg` surfaces these as top-level fields on every raised error; if
 * the error isn't from pg (e.g. a plain JS exception), both come back
 * undefined.
 */
const extractPgFields = (error: unknown): { pgCode?: string; pgConstraint?: string } => {
  if (error === null || typeof error !== 'object') return {}
  const out: { pgCode?: string; pgConstraint?: string } = {}
  if ('code' in error && typeof error.code === 'string') out.pgCode = error.code
  if ('constraint' in error && typeof error.constraint === 'string') {
    out.pgConstraint = error.constraint
  }
  return out
}

/**
 * Wrap a raw Kysely/pg error into a `DatabaseQueryError` with pg metadata
 * promoted into typed fields. Single wrap site so downstream layers
 * (infra-database, data-access) never walk `.cause` chains — the DA layer
 * calls `error.isUniqueViolation(name)` on the `DatabaseError` it
 * receives and the method inspects `cause instanceof DatabaseQueryError`
 * under the hood.
 */
const wrapKyselyError = (operation: string, error: unknown, query?: string): DatabaseQueryError =>
  new DatabaseQueryError({
    operation,
    message: error instanceof Error ? error.message : `${operation} failed: ${String(error)}`,
    ...(query !== undefined ? { query } : {}),
    cause: error,
    ...extractPgFields(error)
  })

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for Kysely connection
 */
export interface KyselyConfig {
  readonly connectionString?: string
  readonly host?: string
  readonly port?: number
  readonly database?: string
  readonly username?: string
  readonly password?: string
  readonly max?: number
  readonly idleTimeoutMillis?: number
  readonly connectionTimeoutMillis?: number
}

/**
 * Build connection string from config
 * postgres.js accepts a connection string
 */
const buildConnectionString = (config: KyselyConfig) => {
  if (config.connectionString) {
    return config.connectionString
  }

  const user = config.username ?? ''
  const password = config.password ?? ''
  const auth = user ? (password ? `${user}:${password}@` : `${user}@`) : ''
  const host = config.host ?? 'localhost'
  const port = config.port ?? 5432
  const database = config.database ?? 'postgres'

  return `postgres://${auth}${host}:${port}/${database}`
}

/**
 * Validate database connection configuration
 *
 * Returns Effect for Effect-idiomatic error handling (no try-catch)
 */
const validateConnectionConfig = (config: KyselyConfig) =>
  Effect.gen(function* () {
    const configString = config.connectionString
    if (configString) {
      yield* Effect.try({
        try: () => {
          const url = new URL(configString)
          if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
            throw new Error(
              `Invalid database protocol: ${url.protocol}. Expected postgres: or postgresql:`
            )
          }
        },
        catch: (error) =>
          new KyselyConnectionError({
            message: `Invalid connection string: ${String(error)}`,
            cause: error
          })
      })
    } else if (!(config.host && config.database)) {
      return yield* new KyselyConnectionError({
        message: 'Database configuration requires either connectionString or host + database',
        cause: undefined
      })
    }
  })

// ============================================================================
// SSL Configuration
// ============================================================================

/**
 * Parse sslmode from connection string query params.
 * postgres.js doesn't handle sslmode=no-verify from the URL automatically.
 */
const parseSslMode = (
  connectionString: string
): { ssl?: 'require' | 'prefer' | { rejectUnauthorized: boolean } } => {
  try {
    const url = new URL(connectionString)
    const sslmode = url.searchParams.get('sslmode')
    switch (sslmode) {
      case 'no-verify':
      case 'require':
        return { ssl: { rejectUnauthorized: false } }
      case 'verify-ca':
      case 'verify-full':
        return { ssl: 'require' }
      case 'prefer':
        return { ssl: 'prefer' }
      case 'disable':
      case null:
        return {}
      default:
        return {}
    }
  } catch {
    return {}
  }
}

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
 * import type { DB } from "@samuelho-dev/infra-database";
 *
 * const program = Effect.gen(function*() {
 *   const kysely = yield* makeKyselyService<DB>({
 *     connectionString: process.env.DATABASE_URL
 *   })
 *
 *   const users = yield* kysely.query((db) =>
 *     db.selectFrom("users").selectAll().execute()
 *   )
 * })
 * ```
 */
/**
 * Sentinel thrown inside `db.transaction().execute(...)` to trigger
 * kysely rollback. The typed `Cause<E>` is captured in the per-call
 * closure (not on this object) so the outer `.catch` can resume via
 * `Effect.failCause(cause)` without an `as` cast.
 */
class TransactionRollbackSentinel extends Error {
  readonly _tag = 'TransactionRollbackSentinel' as const
  constructor() {
    super('TransactionRollbackSentinel')
  }
}

/**
 * Run an Effect inside a kysely transaction, preserving typed errors
 * from the callback AND rolling back the underlying SQL transaction on
 * failure.
 *
 * Mechanics: `runPromiseExit` turns the callback's `Effect<A, E>` into
 * an `Exit<A, E>` value, the cause is captured in a per-call closure,
 * and a payload-less `TransactionRollbackSentinel` is thrown to signal
 * kysely to roll back. The outer `.catch` lifts the captured Cause
 * back onto the Effect channel via `Effect.failCause`, so typed errors
 * flow through unwrapped. Non-Effect failures (driver crashes,
 * connection loss) fall through to `DatabaseTransactionError`.
 *
 * Both the Live (`makeKyselyService`) and Test
 * (`makeTestKyselyService`) paths call this helper so specs exercise
 * the same rollback contract as production.
 */
const runKyselyTransaction = <DB, A, E>(
  db: Kysely<DB>,
  // v4: Runtime.Runtime<never> removed → capture the current services
  // (Context.Context<never>) via Effect.context and run the callback with
  // Effect.runPromiseExitWith(services). Effect.async → Effect.callback.
  services: Context.Context<never>,
  fn: (tx: Transaction<DB>) => Effect.Effect<A, E>
): Effect.Effect<A, DatabaseTransactionError | E> =>
  Effect.callback<A, DatabaseTransactionError | E>((resume) => {
    let capturedCause: Cause.Cause<E> | undefined
    db.transaction()
      .execute(async (tx): Promise<A> => {
        const exit = await Effect.runPromiseExitWith(services)(fn(tx))
        if (Exit.isFailure(exit)) {
          capturedCause = exit.cause
          throw new TransactionRollbackSentinel()
        }
        return exit.value
      })
      .then((value) => {
        resume(Effect.succeed(value))
      })
      .catch((error: unknown) => {
        if (capturedCause !== undefined) {
          // Typed Effect failure from the callback. Preserves defects,
          // interrupts, and multi-error causes — the original Cause<E>
          // flows through unchanged.
          resume(Effect.failCause(capturedCause))
          return
        }
        // Driver, connection, or constraint error raised outside of
        // `fn(tx)` — wrap as DatabaseTransactionError.
        resume(
          Effect.fail(
            new DatabaseTransactionError({
              message: `Transaction failed: ${error}`,
              cause: error
            })
          )
        )
      })
  })

export const makeKyselyService = <DB = unknown>(config: KyselyConfig = {}) =>
  Effect.gen(function* () {
    // Validate configuration (Effect-idiomatic - no try-catch)
    yield* validateConnectionConfig(config)

    // Build connection string from config
    const connectionString = buildConnectionString(config)

    // Parse sslmode from connection string since postgres.js doesn't handle it
    const sslOptions = parseSslMode(connectionString)

    // Create database connection using postgres.js
    //
    // `types` overrides parse postgres int8 (oid 20) and numeric (oid 1700, 1231)
    // as JS number instead of the default string. Without this, every
    // `fn.count<number>()` and aggregate sum returns a string at runtime even
    // though Kysely's type generic claims `number`. Per-callsite `Number(...)`
    // wraps drift across the codebase; fixing it once here removes 60+ wrappers.
    // Values >Number.MAX_SAFE_INTEGER lose precision — acceptable for counts
    // and money-in-cents, the only int8/numeric usages in this codebase.
    const connection: PostgresConnection = yield* Effect.try({
      try: () =>
        postgres(connectionString, {
          max: config.max ?? 10,
          idle_timeout: Math.floor((config.idleTimeoutMillis ?? 30000) / 1000),
          connect_timeout: Math.floor((config.connectionTimeoutMillis ?? 5000) / 1000),
          ...sslOptions,
          types: {
            int8: {
              to: 20,
              from: [20],
              serialize: (value: number | string | bigint) => String(value),
              parse: (value: string) => Number(value)
            },
            numeric: {
              to: 1700,
              from: [1700, 1231],
              serialize: (value: number | string) => String(value),
              parse: (value: string) => Number(value)
            }
          }
        }),
      catch: (error) =>
        new KyselyConnectionError({
          message: `Failed to create database connection: ${error}`,
          cause: error
        })
    })

    // Register cleanup
    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        await connection.end()
      })
    )

    // Create Kysely instance with DB type using PostgresJSDialect
    const db = new Kysely<DB>({
      dialect: new PostgresJSDialect({ postgres: connection })
    })

    // Service implementation - types inferred from interface
    const service: KyselyServiceInterface<DB> = {
      getDb: () => db,

      query: (fn) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => wrapKyselyError('query', error)
        }),

      execute: (query) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db.executeQuery(query)
            if (!Array.isArray(result.rows)) {
              throw new Error('Database returned non-array result')
            }
            return result.rows
          },
          catch: (error) => wrapKyselyError('execute', error, query.sql)
        }),

      // See `runKyselyTransaction` for the rollback + cause-preservation
      // contract — both Live and Test call the same helper.
      transaction: <A, E>(fn: (tx: Transaction<DB>) => Effect.Effect<A, E>) =>
        Effect.gen(function* () {
          const services = yield* Effect.context<never>()
          return yield* runKyselyTransaction(db, services, fn)
        }),

      sql: (query) =>
        Effect.tryPromise({
          try: async () => {
            const result = await query.execute(db)
            if (!Array.isArray(result.rows)) {
              throw new Error('SQL query returned non-array result')
            }
            return result.rows
          },
          catch: (error) => wrapKyselyError('sql', error)
        }),

      ping: () =>
        Effect.tryPromise({
          try: async () => {
            await sql`SELECT 1`.execute(db)
          },
          catch: (error) => {
            // Build error props conditionally (exactOptionalPropertyTypes)
            const errorProps: {
              message: string
              cause: unknown
              host?: string
              port?: number
              database?: string
            } = {
              message: `Database ping failed: ${error}`,
              cause: error
            }
            if (config.host !== undefined) {
              errorProps.host = config.host
            }
            if (config.port !== undefined) {
              errorProps.port = config.port
            }
            if (config.database !== undefined) {
              errorProps.database = config.database
            }
            return new KyselyConnectionError(errorProps)
          }
        }),

      introspection: () =>
        Effect.tryPromise({
          try: async () => {
            const result = await sql`
              SELECT table_name
              FROM information_schema.tables
              WHERE table_schema = 'public'
            `.execute(db)

            const tables = result.rows.map((row) => {
              if (!row || typeof row !== 'object' || !('table_name' in row)) {
                throw new Error(`Unexpected introspection row shape: ${JSON.stringify(row)}`)
              }
              return String(row.table_name)
            })

            return { tables, dialect: 'postgresql' }
          },
          catch: (error) => wrapKyselyError('introspection', error)
        }),

      destroy: () =>
        Effect.promise(async () => {
          await db.destroy()
        })
    }

    return service
  })

// ============================================================================
// Mock Service Factory
// ============================================================================

/**
 * Mock service configuration options
 */
export interface MockServiceOptions {
  /**
   * Simulate errors for testing error paths.
   *
   * When `true`, EVERY operation fails deterministically with its
   * corresponding tagged error — there is no random gate. A test double must
   * fail on a flag, not a dice roll: a probabilistic trigger makes error-path
   * specs flaky (a run where the die never trips spuriously fails) and forces
   * brittle retry-loops at the call site.
   */
  simulateErrors?: boolean
  /** Add artificial latency in milliseconds */
  latency?: number
  /** Custom mock data to return from queries */
  mockData?: Record<string, unknown[]>
  /** Tables to report in introspection */
  mockTables?: string[]
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
 * })
 *
 * // getDb() returns a real Kysely instance with DummyDriver
 * const db = testService.getDb()
 * const query = db.selectFrom("users").selectAll().compile()
 * // query.sql === 'select * from "users"'
 * ```
 */
export const makeTestKyselyService = <DB = unknown>(options: MockServiceOptions = {}) => {
  const { simulateErrors = false, latency = 0, mockData = {}, mockTables = [] } = options

  // Create Kysely with DummyDriver - Kysely's native testing approach
  // This provides a real Kysely instance that compiles queries without a database
  const db = new Kysely<DB>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler()
    }
  })

  const withLatency = <T, E>(effect: Effect.Effect<T, E>) =>
    latency > 0 ? Effect.delay(effect, latency) : effect

  const service: KyselyServiceInterface<DB> = {
    // Returns real Kysely instance with DummyDriver
    getDb: () => db,

    // For mock service, execute the query against DummyDriver
    // DummyDriver returns empty results, which is expected for testing
    query: <T>(fn: (db: Kysely<DB>) => Promise<T>) =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new DatabaseQueryError({
                operation: 'query',
                message: 'Mock query error for testing',
                cause: new Error('Simulated query failure')
              })
            )
          : Effect.tryPromise({
              try: () => fn(db),
              catch: (error) => wrapKyselyError('query', error)
            })
      ),

    execute: (query) =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new DatabaseQueryError({
                operation: 'execute',
                message: 'Mock execute error for testing',
                query: query.sql,
                cause: new Error('Simulated execution failure')
              })
            )
          : Effect.succeed(
              query.sql in mockData
                ? (mockData[query.sql] ?? [])
                : 'execute' in mockData
                  ? (mockData['execute'] ?? [])
                  : []
            )
      ),

    // Transaction: mirrors the Live implementation via the shared
    // `runKyselyTransaction` helper so specs exercise the same typed-
    // error rollback contract as production.
    transaction: <A, E>(fn: (tx: Transaction<DB>) => Effect.Effect<A, E>) =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new DatabaseTransactionError({
                message: 'Mock transaction error for testing',
                cause: new Error('Simulated transaction failure')
              })
            )
          : Effect.gen(function* () {
              const services = yield* Effect.context<never>()
              return yield* runKyselyTransaction(db, services, fn)
            })
      ),

    sql: (sqlQuery) =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new DatabaseQueryError({
                operation: 'sql',
                message: 'Mock SQL error for testing',
                cause: new Error('Simulated SQL failure')
              })
            )
          : Effect.tryPromise({
              try: async () => {
                const result = await sqlQuery.execute(db)
                return result.rows
              },
              catch: (error) => wrapKyselyError('sql', error)
            })
      ),

    ping: () =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new KyselyConnectionError({
                message: 'Mock connection error for testing',
                cause: new Error('Simulated connection failure')
              })
            )
          : Effect.void
      ),

    introspection: () =>
      withLatency(
        simulateErrors
          ? Effect.fail(
              new DatabaseQueryError({
                operation: 'introspection',
                message: 'Mock introspection error for testing',
                cause: new Error('Simulated introspection failure')
              })
            )
          : Effect.succeed({ tables: mockTables, dialect: 'postgresql' })
      ),

    destroy: () => Effect.promise(() => db.destroy())
  }

  return service
}

// ============================================================================
// Context Tag
// ============================================================================

/**
 * Kysely Service Tag
 *
 * Returns a `Context.GenericTag` (not a class-based `Context.Tag`) because the
 * DB type parameter must be supplied at each call site — a class cannot carry a
 * free type variable. Live/Test/Auto layers are intentionally absent here;
 * `infra-database` owns that boundary and provides `DatabaseLive`, `DatabaseTest`,
 * and `DatabaseAuto` layers that wrap this tag with the concrete DB schema and
 * connection management. Consumers depend on `infra-database`, not this provider.
 *
 * @typeParam DB - Database schema type (supply at call site via `KyselyService<DB>()`)
 */
export const KyselyService = <DB = unknown>() =>
  Context.Service<KyselyServiceInterface<DB>>('@samuelho-dev/provider-kysely/KyselyService')
