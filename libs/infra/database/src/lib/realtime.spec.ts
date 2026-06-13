import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { RealtimeService } from './realtime'

describe('RealtimeService', () => {
  it.effect('provides a no-op test subscription with an unsubscribe function', () =>
    Effect.gen(function* () {
      const realtime = yield* RealtimeService
      const unsubscribe = yield* realtime.subscribeToTableChanges({
        table: 'user',
        event: 'UPDATE',
        onEvent: () => undefined
      })

      expect(unsubscribe()).toBeUndefined()
    }).pipe(Effect.provide(RealtimeService.Test))
  )
})
