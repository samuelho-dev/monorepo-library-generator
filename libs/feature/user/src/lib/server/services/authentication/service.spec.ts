import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { AuthenticationFeature } from './service'

describe('AuthenticationFeature', () => {
  it.effect('runs the authentication capability', () =>
    Effect.gen(function* () {
      const feature = yield* AuthenticationFeature
      expect(yield* feature.run()).toBe('authentication')
    }).pipe(Effect.provide(AuthenticationFeature.Default))
  )
})
