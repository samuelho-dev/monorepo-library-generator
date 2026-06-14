import { DatabaseError } from '@samuelho-dev/contract-database'
import { env } from '@samuelho-dev/env'
import type { KyselyConnectionError } from '@samuelho-dev/provider-kysely'
import {
  makeKyselyService,
  makeTestKyselyService,
  type DatabaseQueryError as ProviderQueryError,
  DatabaseTransactionError as ProviderTransactionError
} from '@samuelho-dev/provider-kysely'
import { Context, Effect, Layer, Redacted } from 'effect'
import type { Kysely, Transaction } from 'kysely'
import { DatabaseConnectionError } from './errors'
import type { DB } from './schema'

// ============================================================================
// Internal Helpers
// ============================================================================

const liftQueryError = (error: ProviderQueryError): Effect.Effect<never, DatabaseError> =>
  Effect.fail(
    new DatabaseError({
      message: error.message,
      operation: 'query',
      entity: 'unknown',
      identifiers: {},
      cause: error
    })
  )

// Lifts ProviderTransactionError (driver failure outside fn) into DatabaseError.
// Typed failures from fn propagate unchanged via the generic E channel.
// catchIf used (not catchTag) so generic E residual passes through unchanged.
const liftTransactionError = <A, E>(
  self: Effect.Effect<A, E | ProviderTransactionError>
): Effect.Effect<A, E | DatabaseError> =>
  self.pipe(
    Effect.catchIf(
      (error): error is ProviderTransactionError => error instanceof ProviderTransactionError,
      (error) =>
        Effect.fail(
          new DatabaseError({
            message: error.message,
            operation: 'transaction',
            entity: 'unknown',
            identifiers: {},
            cause: error
          })
        )
    )
  )

/**
 * Database Service
 *
 * Wraps the Kysely provider with a simplified database API.
 * All query and transaction failures surface as `DatabaseError` in the typed
 * error channel. Callers `catchTag('DatabaseError')` when they need to inspect
 * or recover (e.g. unique-constraint violations via `isUniqueViolation`).
 *
 * @module @samuelho-dev/infra-database/service
 */
export class DatabaseService extends Context.Service<
  DatabaseService,
  {
    /**
     * Execute a database query.
     *
     * All failures surface as `DatabaseError`. Use `isUniqueViolation(constraint)`
     * to detect pg unique-constraint violations.
     */
    readonly query: <A>(fn: (db: Kysely<DB>) => Promise<A>) => Effect.Effect<A, DatabaseError>

    /**
     * Execute multiple queries in a transaction.
     *
     * Typed failures from `fn` propagate unchanged and trigger rollback.
     * Driver/constraint errors surface as `DatabaseError`.
     */
    readonly transaction: <A, E>(
      fn: (tx: Transaction<DB>) => Effect.Effect<A, E>
    ) => Effect.Effect<A, E | DatabaseError>

    /**
     * Health check for database connection.
     */
    readonly healthCheck: () => Effect.Effect<boolean, DatabaseConnectionError>
  }
>()('@samuelho-dev/infra-database/DatabaseService') {
  static readonly Live = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const connectionStringRedacted = env.DATABASE_URL
      if (!connectionStringRedacted) {
        return yield* Effect.die(new Error('DATABASE_URL environment variable is required'))
      }

      const connectionString = Redacted.value(connectionStringRedacted)
      const kysely = yield* makeKyselyService<DB>({ connectionString })

      return {
        query: <A>(fn: (db: Kysely<DB>) => Promise<A>) =>
          kysely
            .query(fn)
            .pipe(
              Effect.catchTag('DatabaseQueryError', liftQueryError),
              Effect.withSpan('DatabaseService.query')
            ),

        // Do NOT wrap fn(tx) with Effect.result — that defeats rollback by
        // hiding typed failures from the provider's Cause-sentinel mechanism.
        transaction: <A, E>(
          fn: (tx: Transaction<DB>) => Effect.Effect<A, E>
        ): Effect.Effect<A, E | DatabaseError> =>
          kysely
            .transaction(fn)
            .pipe(liftTransactionError, Effect.withSpan('DatabaseService.transaction')),

        healthCheck: () =>
          kysely.ping().pipe(
            Effect.map(() => true),
            Effect.catchTag('KyselyConnectionError', (error: KyselyConnectionError) =>
              Effect.fail(
                new DatabaseConnectionError({
                  message: 'Health check failed',
                  target: 'database',
                  cause: error
                })
              )
            ),
            Effect.withSpan('DatabaseService.healthCheck')
          )
      }
    })
  )

  static readonly Test = Layer.sync(DatabaseService, () => {
    const testService = makeTestKyselyService<DB>()

    return {
      query: <A>(fn: (db: Kysely<DB>) => Promise<A>) =>
        testService.query(fn).pipe(Effect.catchTag('DatabaseQueryError', liftQueryError)),

      transaction: <A, E>(
        fn: (tx: Transaction<DB>) => Effect.Effect<A, E>
      ): Effect.Effect<A, E | DatabaseError> =>
        testService.transaction(fn).pipe(liftTransactionError),

      healthCheck: () =>
        testService.ping().pipe(
          Effect.map(() => true),
          Effect.catchTag('KyselyConnectionError', (error: KyselyConnectionError) =>
            Effect.fail(
              new DatabaseConnectionError({
                message: 'Health check failed',
                target: 'database',
                cause: error
              })
            )
          )
        )
    }
  })

  static readonly Auto = Layer.suspend(() =>
    env.NODE_ENV === 'test' ? DatabaseService.Test : DatabaseService.Live
  )
}
