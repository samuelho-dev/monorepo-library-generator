import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { SupabaseUserSchema } from './types'

/**
 * SupabaseUserSchema decode tests.
 *
 * Regression guard for the Effect v4 `Schema.Date` breakage: bare `Schema.Date`
 * is `instanceOf(Date)` and REJECTS ISO strings. The Supabase SDK delivers
 * timestamps as ISO strings, so the schema must use `Schema.DateFromString`.
 *
 * @module @samuelho-dev/provider-supabase/types-tests
 */

const decode = Schema.decodeUnknownSync(SupabaseUserSchema)

describe('SupabaseUserSchema', () => {
  it('decodes an ISO-string created_at (Supabase SDK wire shape) to a Date', () => {
    const user = decode({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'user@example.com',
      created_at: '2024-01-01T00:00:00.000Z'
    })

    expect(user.created_at).toBeInstanceOf(Date)
    expect(user.created_at.toISOString()).toBe('2024-01-01T00:00:00.000Z')
  })

  it('decodes optional ISO-string updated_at and last_sign_in_at to Dates', () => {
    const user = decode({
      id: '00000000-0000-4000-8000-000000000002',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-02-02T12:30:00.000Z',
      last_sign_in_at: '2024-03-03T08:15:00.000Z'
    })

    expect(user.updated_at).toBeInstanceOf(Date)
    expect(user.updated_at?.toISOString()).toBe('2024-02-02T12:30:00.000Z')
    expect(user.last_sign_in_at).toBeInstanceOf(Date)
    expect(user.last_sign_in_at?.toISOString()).toBe('2024-03-03T08:15:00.000Z')
  })

  it('omits absent optional timestamps without failing', () => {
    const user = decode({
      id: '00000000-0000-4000-8000-000000000003',
      created_at: '2024-01-01T00:00:00.000Z'
    })

    expect(user.updated_at).toBeUndefined()
    expect(user.last_sign_in_at).toBeUndefined()
  })
})
