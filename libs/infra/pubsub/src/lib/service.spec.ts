import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { PubsubService } from './service'

describe('PubsubService', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* PubsubService
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(PubsubService.Test))
  )
})
