/**
 * CountFromDb Tests
 *
 * The DB count decoder accepts number | bigint | string (driver variance for
 * Postgres COUNT/SUM) and produces a single `number` domain Type.
 */

import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { CountFromDb } from './count'

describe('CountFromDb', () => {
  const decode = Schema.decodeUnknownSync(CountFromDb)

  it('decodes a number to itself', () => {
    expect(decode(5)).toBe(5)
  })

  it('decodes a bigint to a number', () => {
    expect(decode(5n)).toBe(5)
  })

  it('decodes a numeric string to a number', () => {
    expect(decode('42')).toBe(42)
  })

  it('decodes zero from each representation', () => {
    expect(decode(0)).toBe(0)
    expect(decode(0n)).toBe(0)
    expect(decode('0')).toBe(0)
  })

  it('encodes a number back to a number', () => {
    expect(Schema.encodeSync(CountFromDb)(7)).toBe(7)
  })
})
