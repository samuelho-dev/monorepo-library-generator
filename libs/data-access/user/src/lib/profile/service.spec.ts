import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ProfileDataAccess, UserProfileTest } from './service'

describe('ProfileDataAccess', () => {
  it.effect('reports a healthy test implementation', () =>
    Effect.gen(function* () {
      const service = yield* ProfileDataAccess
      expect(yield* service.health()).toBe(true)
    }).pipe(Effect.provide(UserProfileTest))
  )
})
