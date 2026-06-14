import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { QueueService } from './service'

describe('QueueService', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* QueueService
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(QueueService.Test))
  )
})
