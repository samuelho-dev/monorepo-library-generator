import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ProfileFeature } from './service'

describe('ProfileFeature', () => {
  it.effect('runs the profile capability', () =>
    Effect.gen(function* () {
      const feature = yield* ProfileFeature
      expect(yield* feature.run()).toBe('profile')
    }).pipe(Effect.provide(ProfileFeature.Default))
  )
})
