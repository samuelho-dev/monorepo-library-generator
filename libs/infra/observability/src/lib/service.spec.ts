import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ObservabilityService } from './service'

describe('ObservabilityService', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* ObservabilityService
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(ObservabilityService.Test))
  )
})
