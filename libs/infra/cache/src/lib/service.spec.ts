import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { CacheService } from './service'

describe('CacheService', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* CacheService
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(CacheService.Test))
  )
})
