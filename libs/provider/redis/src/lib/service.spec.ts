import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { Redis } from './service'

describe('Redis', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* Redis
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(Redis.Test))
  )
})
