import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { RpcService } from './service'

describe('RpcService', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* RpcService
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(RpcService.Test))
  )
})
