import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { Opentelemetry } from './service'

describe('Opentelemetry', () => {
  it.effect('reports healthy', () =>
    Effect.gen(function* () {
      const service = yield* Opentelemetry
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(Opentelemetry.Test))
  )
})
