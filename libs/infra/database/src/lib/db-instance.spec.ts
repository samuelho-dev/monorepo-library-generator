import { describe, expect, it } from 'vitest'
import { makeDatabaseClient } from './db-instance'

interface TestDatabase {
  readonly user: {
    readonly id: string
    readonly email: string
  }
}

describe('makeDatabaseClient', () => {
  it('creates a typed postgres.js Kysely client without connecting eagerly', async () => {
    const client = makeDatabaseClient<TestDatabase>({
      connectionString: 'postgres://postgres:postgres@localhost:5432/test?sslmode=require'
    })

    const query = client.selectFrom('user').select(['id', 'email']).compile()

    expect(query.sql).toBe('select "id", "email" from "user"')
    await client.destroy()
  })
})
