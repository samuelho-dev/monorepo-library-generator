import { describe, expect, it } from '@effect/vitest'
import { AuthVerifier } from '@samuelho-dev/contract-auth'
import { Effect, Layer, Option } from 'effect'
import { Headers } from 'effect/unstable/http'
import { AuthService, AuthVerifierTest } from './service'

/**
 * AuthService / AuthVerifier — Test-layer behavior.
 *
 * The Test layer is deliberately permissive: it accepts ALL tokens and ignores
 * headers (so consumers can unit-test their own logic without auth blocking
 * them). Real JWT validation, header-priority parsing, and rejection paths live
 * in the Live layer (Supabase-backed) and are covered by integration tests, not
 * here. These specs pin the ONE behavior the Test layer actually decides on its
 * own — `verifyOptional`'s falsy-token → None branch — plus the canned-identity
 * contract every consumer relies on. Redundant restatements of "the stub returns
 * the same user" are intentionally collapsed to a single assertion each.
 *
 * @module @samuelho-dev/infra-auth
 */

const TEST_USER_ID = '00000000-0000-4000-8000-000000000001'

describe('AuthService.Test', () => {
  it.effect('verifyToken resolves the canned authenticated user', () =>
    Effect.gen(function* () {
      const service = yield* AuthService
      const user = yield* service.verifyToken('any-token')

      expect(user.id).toBe(TEST_USER_ID)
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.role).toBe('authenticated')
    }).pipe(Effect.provide(Layer.fresh(AuthService.Test)))
  )

  it.effect('getCurrentUser returns Some with the canned user', () =>
    Effect.gen(function* () {
      const service = yield* AuthService
      const result = yield* service.getCurrentUser()

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe(TEST_USER_ID)
      }
    }).pipe(Effect.provide(Layer.fresh(AuthService.Test)))
  )

  it.effect('buildAuthContext yields a session-method context with no session token', () =>
    Effect.gen(function* () {
      const service = yield* AuthService
      const context = yield* service.buildAuthContext(
        Headers.fromInput({ authorization: 'Bearer real-token' })
      )

      expect(Option.isSome(context)).toBe(true)
      if (Option.isSome(context)) {
        expect(context.value.authMethod).toBe('session')
        // Test layer skips header parsing, so it never sets a session token
        // (Live sets it when auth comes from a Bearer header).
        expect(context.value.sessionToken).toBeUndefined()
      }
    }).pipe(Effect.provide(Layer.fresh(AuthService.Test)))
  )
})

describe('AuthVerifier.Test', () => {
  it.effect('verify resolves the canned user', () =>
    Effect.gen(function* () {
      const verifier = yield* AuthVerifier
      const userData = yield* verifier.verify('any-token')

      expect(userData.id).toBe(TEST_USER_ID)
      expect(userData.email).toBe('test@example.com')
    }).pipe(Effect.provide(Layer.fresh(AuthVerifierTest)))
  )

  it.effect('verifyOptional returns Some for a non-empty token, None for falsy', () =>
    // This is the only branch the Test layer decides itself: a falsy token
    // (undefined or '' ) → None; any non-empty token → Some(user).
    Effect.gen(function* () {
      const verifier = yield* AuthVerifier

      expect(Option.isNone(yield* verifier.verifyOptional(undefined))).toBe(true)
      expect(Option.isNone(yield* verifier.verifyOptional(''))).toBe(true)

      const some = yield* verifier.verifyOptional('garbage-token')
      expect(Option.isSome(some)).toBe(true)
      if (Option.isSome(some)) {
        expect(some.value.id).toBe(TEST_USER_ID)
      }
    }).pipe(Effect.provide(Layer.fresh(AuthVerifierTest)))
  )
})
