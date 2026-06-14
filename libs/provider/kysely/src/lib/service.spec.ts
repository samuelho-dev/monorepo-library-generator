import { Effect, Result } from 'effect'
import { describe, expect, it } from 'vitest'
import { DatabaseQueryError, KyselyConnectionError } from './errors'
import { makeKyselyService, makeTestKyselyService } from './service'

interface TestDB {
  users: { id: number; name: string; email: string }
  posts: { id: number; title: string; user_id: number }
}

describe('Kysely Provider', () => {
  describe('query compilation', () => {
    it('compiles SELECT queries with correct SQL', () => {
      const service = makeTestKyselyService<TestDB>()
      const query = service.getDb().selectFrom('users').selectAll().compile()
      expect(query.sql).toContain('select')
      expect(query.sql).toContain('users')
    })

    it('compiles INSERT queries with correct SQL', () => {
      const service = makeTestKyselyService<TestDB>()
      const query = service
        .getDb()
        .insertInto('users')
        .values({ id: 1, name: 'Alice', email: 'alice@test.com' })
        .compile()
      expect(query.sql).toContain('insert')
      expect(query.sql).toContain('users')
    })

    it('compiles UPDATE queries with correct SQL', () => {
      const service = makeTestKyselyService<TestDB>()
      const query = service
        .getDb()
        .updateTable('users')
        .set({ name: 'Bob' })
        .where('id', '=', 1)
        .compile()
      expect(query.sql).toContain('update')
      expect(query.sql).toContain('users')
    })

    it('compiles DELETE queries with correct SQL', () => {
      const service = makeTestKyselyService<TestDB>()
      const query = service.getDb().deleteFrom('posts').where('id', '=', 1).compile()
      expect(query.sql).toContain('delete')
      expect(query.sql).toContain('posts')
    })

    it('compiles JOIN queries across tables', () => {
      const service = makeTestKyselyService<TestDB>()
      const query = service
        .getDb()
        .selectFrom('users')
        .innerJoin('posts', 'posts.user_id', 'users.id')
        .selectAll()
        .compile()
      expect(query.sql).toContain('join')
      expect(query.sql).toContain('users')
      expect(query.sql).toContain('posts')
    })
  })

  describe('query execution via DummyDriver', () => {
    it('returns empty array for select queries', async () => {
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromise(
        service.query((db) => db.selectFrom('users').selectAll().execute())
      )
      expect(result).toEqual([])
    })

    it('returns empty array for compiled query execute', async () => {
      const service = makeTestKyselyService<TestDB>()
      const compiled = service.getDb().selectFrom('users').selectAll().compile()
      const result = await Effect.runPromise(service.execute(compiled))
      expect(result).toEqual([])
    })
  })

  describe('mock data injection', () => {
    it('returns injected data from execute when mockData.execute is set', async () => {
      const mockUsers = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
      const service = makeTestKyselyService<TestDB>({
        mockData: { execute: mockUsers }
      })
      const compiled = service.getDb().selectFrom('users').selectAll().compile()
      const result = await Effect.runPromise(service.execute(compiled))
      expect(result).toEqual(mockUsers)
    })

    it('returns injected data keyed by SQL string', async () => {
      const service = makeTestKyselyService<TestDB>()
      const compiled = service.getDb().selectFrom('users').selectAll().compile()
      const mockForThisQuery = [{ id: 99, name: 'Keyed' }]
      const serviceWithKey = makeTestKyselyService<TestDB>({
        mockData: { [compiled.sql]: mockForThisQuery }
      })
      const result = await Effect.runPromise(serviceWithKey.execute(compiled))
      expect(result).toEqual(mockForThisQuery)
    })

    it('returns empty array when no mockData matches', async () => {
      const service = makeTestKyselyService<TestDB>({
        mockData: { 'some-other-sql': [{ x: 1 }] }
      })
      const compiled = service.getDb().selectFrom('users').selectAll().compile()
      const result = await Effect.runPromise(service.execute(compiled))
      expect(result).toEqual([])
    })
  })

  describe('introspection', () => {
    it('returns empty tables by default', async () => {
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromise(service.introspection())
      expect(result).toEqual({ tables: [], dialect: 'postgresql' })
    })

    it('returns configured mock tables', async () => {
      const service = makeTestKyselyService<TestDB>({
        mockTables: ['users', 'posts', 'comments']
      })
      const result = await Effect.runPromise(service.introspection())
      expect(result.tables).toEqual(['users', 'posts', 'comments'])
      expect(result.dialect).toBe('postgresql')
    })
  })

  describe('ping', () => {
    it('succeeds in normal mode', async () => {
      const service = makeTestKyselyService<TestDB>()
      await Effect.runPromise(service.ping())
    })
  })

  describe('transaction', () => {
    it('executes callback and returns its result', async () => {
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromise(
        service.transaction((_tx) => Effect.succeed('tx-result'))
      )
      expect(result).toBe('tx-result')
    })

    it('propagates Effect failures from transaction callback', async () => {
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromise(
        service.transaction((_tx) => Effect.fail(new Error('inner failure'))).pipe(Effect.result)
      )
      expect(Result.isFailure(result)).toBe(true)
    })

    // Regression: before the Cause-sentinel fix, an Effect.fail inside the
    // transaction callback was collapsed into a DatabaseTransactionError by
    // the provider's tryPromise.catch handler, which meant callers could not
    // distinguish a typed domain error from a generic driver error. That
    // collapse also defeated rollback in the Effect-channel `database.
    // transaction` API at the infra layer. This test pins the contract that
    // the ORIGINAL typed error flows through unchanged on the error channel.
    it('preserves the original typed error (not collapsed to DatabaseTransactionError)', async () => {
      class DomainRefundNotAllowed {
        readonly _tag = 'DomainRefundNotAllowed' as const
        constructor(readonly orderId: string) {}
      }
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromise(
        service
          .transaction((_tx) => Effect.fail(new DomainRefundNotAllowed('order_42')))
          .pipe(Effect.result)
      )
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(DomainRefundNotAllowed)
        // Type-assertion via _tag discriminant
        if ('_tag' in result.failure && result.failure._tag === 'DomainRefundNotAllowed') {
          expect(result.failure.orderId).toBe('order_42')
        } else {
          throw new Error(`Expected DomainRefundNotAllowed, got ${JSON.stringify(result.failure)}`)
        }
      }
    })

    it('preserves Effect defects (unexpected exceptions from the callback)', async () => {
      const service = makeTestKyselyService<TestDB>()
      const result = await Effect.runPromiseExit(
        service.transaction((_tx) =>
          Effect.sync(() => {
            throw new Error('unexpected defect')
          })
        )
      )
      // A defect should surface as a Die on the Cause, not be collapsed into
      // a typed failure. This pins the full-fidelity Cause propagation.
      expect(result._tag).toBe('Failure')
    })
  })

  describe('destroy', () => {
    it('completes without error', async () => {
      const service = makeTestKyselyService<TestDB>()
      await Effect.runPromise(service.destroy())
    })
  })

  describe('config validation', () => {
    it('rejects invalid connection string protocol', async () => {
      const result = await Effect.runPromise(
        makeKyselyService({ connectionString: 'http://invalid' }).pipe(Effect.scoped, Effect.result)
      )
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(KyselyConnectionError)
        expect(result.failure.message).toContain('Invalid')
      }
    })

    it('rejects config with neither connectionString nor host+database', async () => {
      const result = await Effect.runPromise(
        makeKyselyService({}).pipe(Effect.scoped, Effect.result)
      )
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(KyselyConnectionError)
        expect(result.failure.message).toContain('connectionString or host + database')
      }
    })

    it('rejects mysql:// protocol', async () => {
      const result = await Effect.runPromise(
        makeKyselyService({ connectionString: 'mysql://localhost/db' }).pipe(
          Effect.scoped,
          Effect.result
        )
      )
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(KyselyConnectionError)
        expect(result.failure.message).toContain('Invalid')
      }
    })
  })

  describe('error simulation', () => {
    // `simulateErrors: true` fails deterministically on the first call — no
    // retry-loop, no Math.random gate (the prior probabilistic trigger made
    // these specs flaky: a run where the die never tripped spuriously failed).
    it('produces DatabaseQueryError on query when simulateErrors is on', async () => {
      const service = makeTestKyselyService<TestDB>({ simulateErrors: true })

      const result = await Effect.runPromise(
        service.query((db) => db.selectFrom('users').selectAll().execute()).pipe(Effect.result)
      )

      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(DatabaseQueryError)
        expect(result.failure.message).toContain('Mock query error')
      }
    })

    it('produces KyselyConnectionError on ping when simulateErrors is on', async () => {
      const service = makeTestKyselyService<TestDB>({ simulateErrors: true })

      const result = await Effect.runPromise(service.ping().pipe(Effect.result))

      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toBeInstanceOf(KyselyConnectionError)
        expect(result.failure.message).toContain('Mock connection error')
      }
    })
  })
})
