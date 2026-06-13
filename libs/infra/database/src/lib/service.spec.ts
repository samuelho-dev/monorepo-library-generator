import { describe, expect, it } from '@effect/vitest'
import { DatabaseError } from '@samuelho-dev/contract-database'
import { type Cause, Effect, Exit, Layer, Ref, Result, Schema } from 'effect'
import type { Transaction } from 'kysely'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from 'kysely'
import { DatabaseConnectionError } from './errors'
import type { DB } from './schema'
import { DatabaseService } from './service'

const DatabaseServiceFailing = Layer.succeed(DatabaseService, {
  query: () =>
    Effect.fail(
      new DatabaseError({
        message: 'Simulated query failure',
        operation: 'query',
        entity: 'test',
        identifiers: {}
      })
    ),
  transaction: () =>
    Effect.fail(
      new DatabaseError({
        message: 'Simulated transaction failure',
        operation: 'transaction',
        entity: 'test',
        identifiers: {}
      })
    ),
  healthCheck: () =>
    Effect.fail(
      new DatabaseConnectionError({
        message: 'Simulated connection failure',
        target: 'database',
        cause: new Error('Simulated connection failure')
      })
    )
})

/**
 * DatabaseService Tests
 *
 * @module @samuelho-dev/infra-database
 */

describe('DatabaseService', () => {
  describe('Test Layer', () => {
    it.effect('healthCheck returns true', () =>
      Effect.gen(function* () {
        const service = yield* DatabaseService
        const healthy = yield* service.healthCheck()
        expect(healthy).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(DatabaseService.Test)))
    )

    it.effect('query returns empty results from DummyDriver', () =>
      Effect.gen(function* () {
        const service = yield* DatabaseService
        const result = yield* service
          .query((db) => db.selectFrom('user').selectAll().execute())
          .pipe(Effect.catch(() => Effect.succeed([])))
        expect(Array.isArray(result)).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(DatabaseService.Test)))
    )
  })

  describe('Failing Layer', () => {
    it.effect('query fails with DatabaseError', () =>
      Effect.gen(function* () {
        const service = yield* DatabaseService
        const result = yield* service
          .query((db) => db.selectFrom('user').selectAll().execute())
          .pipe(Effect.result)

        expect(Result.isFailure(result)).toBe(true)
        if (Result.isFailure(result)) {
          expect(result.failure._tag).toBe('DatabaseError')
        }
      }).pipe(Effect.provide(DatabaseServiceFailing))
    )

    it.effect('healthCheck fails with DatabaseConnectionError', () =>
      Effect.gen(function* () {
        const service = yield* DatabaseService
        const result = yield* service.healthCheck().pipe(Effect.result)

        expect(Result.isFailure(result)).toBe(true)
        if (Result.isFailure(result)) {
          expect(result.failure._tag).toBe('DatabaseConnectionError')
        }
      }).pipe(Effect.provide(DatabaseServiceFailing))
    )
  })

  // ==========================================================================
  // transaction Effect-channel rollback regression
  // ==========================================================================
  //
  // Bug: wrapping fn(tx) with Effect.either before handing to kysely.transaction
  // converts a typed Effect failure into Right<E>, so kysely sees a successful
  // Promise resolution and COMMITS — even though the application logic intended
  // a rollback. This spec is the regression guard.
  describe('transaction Effect-channel rollback', () => {
    class TestRollbackError extends Schema.TaggedErrorClass<TestRollbackError>()(
      'TestRollbackError',
      {
        reason: Schema.String
      }
    ) {}

    class TransactionRollbackSentinel extends Error {
      readonly _tag = 'TransactionRollbackSentinel' as const
      constructor() {
        super('TransactionRollbackSentinel')
      }
    }

    type TxnEvent = 'commit' | 'rollback'

    const makeRecordingLayer = (events: Ref.Ref<TxnEvent[]>) =>
      Layer.sync(DatabaseService, () => {
        const db = new Kysely<DB>({
          dialect: {
            createAdapter: () => new PostgresAdapter(),
            createDriver: () => new DummyDriver(),
            createIntrospector: (db) => new PostgresIntrospector(db),
            createQueryCompiler: () => new PostgresQueryCompiler()
          }
        })

        return {
          query: <A>(fn: (db: Kysely<DB>) => Promise<A>) =>
            Effect.tryPromise({
              try: () => fn(db),
              catch: (error) =>
                new DatabaseError({
                  message: error instanceof Error ? error.message : 'query failed',
                  operation: 'query',
                  entity: 'unknown',
                  identifiers: {},
                  cause: error
                })
            }),

          transaction: <A, E>(fn: (tx: Transaction<DB>) => Effect.Effect<A, E>) =>
            Effect.gen(function* () {
              const services = yield* Effect.context<never>()
              return yield* Effect.callback<A, E | DatabaseError>((resume) => {
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
                    Effect.runSync(
                      Ref.update(events, (xs: TxnEvent[]): TxnEvent[] => [...xs, 'commit'])
                    )
                    resume(Effect.succeed(value))
                  })
                  .catch((error: unknown) => {
                    Effect.runSync(
                      Ref.update(events, (xs: TxnEvent[]): TxnEvent[] => [...xs, 'rollback'])
                    )
                    if (capturedCause !== undefined) {
                      resume(Effect.failCause(capturedCause))
                      return
                    }
                    resume(
                      Effect.fail(
                        new DatabaseError({
                          message: error instanceof Error ? error.message : 'transaction failed',
                          operation: 'transaction',
                          entity: 'unknown',
                          identifiers: {},
                          cause: error
                        })
                      )
                    )
                  })
              })
            }),

          healthCheck: () => Effect.succeed(true)
        }
      })

    const runWithRecorder = async <A, E>(
      program: Effect.Effect<A, E, DatabaseService>
    ): Promise<{ exit: Exit.Exit<A, E>; events: TxnEvent[] }> => {
      const eventsRef = Effect.runSync(Ref.make<TxnEvent[]>([]))
      const layer = makeRecordingLayer(eventsRef)
      const exit = await Effect.runPromise(program.pipe(Effect.exit, Effect.provide(layer)))
      const events = Effect.runSync(Ref.get(eventsRef))
      return { exit, events }
    }

    it('case 1: success path — inner Effect resolves, kysely commits', async () => {
      const program = Effect.gen(function* () {
        const service = yield* DatabaseService
        return yield* service.transaction(() => Effect.succeed('ok' as const))
      })

      const { exit, events } = await runWithRecorder(program)
      expect(exit._tag).toBe('Success')
      if (exit._tag === 'Success') {
        expect(exit.value).toBe('ok')
      }
      expect(events).toEqual(['commit'])
    })

    it('case 2: typed failure — inner Effect fails, kysely MUST roll back (BUG REGRESSION)', async () => {
      const program = Effect.gen(function* () {
        const service = yield* DatabaseService
        return yield* service.transaction(() =>
          Effect.fail(new TestRollbackError({ reason: 'business rule' }))
        )
      })

      const { exit, events } = await runWithRecorder(program)
      expect(exit._tag).toBe('Failure')
      // BUG STATE:   events === ['commit']   → TEST FAILS
      // FIXED STATE: events === ['rollback'] → TEST PASSES
      expect(events).toEqual(['rollback'])
    })

    it('case 3: defect — inner Effect dies, kysely MUST roll back', async () => {
      const program = Effect.gen(function* () {
        const service = yield* DatabaseService
        return yield* service.transaction(() => Effect.die(new Error('boom')))
      })

      const { exit, events } = await runWithRecorder(program)
      expect(exit._tag).toBe('Failure')
      expect(events).toEqual(['rollback'])
    })
  })
})
