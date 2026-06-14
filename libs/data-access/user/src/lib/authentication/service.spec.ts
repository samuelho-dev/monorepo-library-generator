import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { AuthenticationDataAccess, UserAuthenticationTest } from './service'

describe('AuthenticationDataAccess', () => {
  it.effect('reports a healthy test implementation', () =>
    Effect.gen(function* () {
      const service = yield* AuthenticationDataAccess
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(UserAuthenticationTest))
  )
})
