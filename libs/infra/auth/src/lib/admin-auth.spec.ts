/**
 * AdminAuth.Live regression spec [P0 security].
 *
 * Pins the P0 security fix: the pre-fix inline check had two compounding
 * bugs that let `Authorization: Bearer <redacted>` pass admin auth in
 * production. This asserts they can never reappear:
 *
 *   1. `env.ADMIN_API_KEY || 'development-only-key'` — the Redacted object
 *      was always truthy so the dev fallback was dead code.
 *   2. `` `Bearer ${adminKey}` `` interpolated Redacted.toString() →
 *      '<redacted>', so the literal `Bearer <redacted>` header matched.
 *
 * Pattern: static import + per-test `ConfigProvider.fromEnv` via
 * `ConfigProvider.layer` to drive env states. No dynamic imports, no
 * process.env mutation, no vi.mock. Mirrors `service-auth.spec.ts`.
 *
 * The service `check` takes the raw Authorization header string (not a
 * request object), so this spec needs no HTTP-framework stub.
 *
 * @module @samuelho-dev/infra-auth/admin-auth.spec
 */

import { describe, expect, it } from '@effect/vitest'
import { Cause, ConfigProvider, Effect, Exit, Layer } from 'effect'
import { AdminAuth } from './admin-auth'

// Use `Effect.exit` (not `Effect.result`) so BOTH boot-invariant failure
// modes are captured uniformly: missing ADMIN_API_KEY surfaces as a typed
// ConfigError (error channel), while an EMPTY key is a non-recoverable boot
// invariant that `Effect.die`s on (a defect / Die cause). `Effect.exit`
// captures the full Cause.
const buildWithProvider = (provider: ConfigProvider.ConfigProvider) =>
  Layer.build(AdminAuth.Live).pipe(
    Effect.provide(ConfigProvider.layer(provider)),
    Effect.scoped,
    Effect.exit
  )

describe('AdminAuth.Live [P0 security regression]', () => {
  describe('NODE_ENV=production with valid ADMIN_API_KEY', () => {
    const provider = ConfigProvider.fromEnv({
      env: {
        NODE_ENV: 'production',
        ADMIN_API_KEY: 'real-prod-admin-key-abc123'
      }
    })

    it.effect('builds successfully and accepts the correct bearer token', () =>
      Effect.gen(function* () {
        const result = yield* buildWithProvider(provider)
        expect(result._tag).toBe('Success')
        if (result._tag === 'Failure') return
        const auth = yield* AdminAuth.pipe(
          Effect.provide(AdminAuth.Live),
          Effect.provide(ConfigProvider.layer(provider))
        )
        expect(auth.check('Bearer real-prod-admin-key-abc123')).toBe(true)
      })
    )

    it.effect('REJECTS the pre-fix exploit header `Bearer <redacted>`', () =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth.pipe(
          Effect.provide(AdminAuth.Live),
          Effect.provide(ConfigProvider.layer(provider))
        )
        expect(auth.check('Bearer <redacted>')).toBe(false)
      })
    )

    it.effect('REJECTS a request with no authorization header', () =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth.pipe(
          Effect.provide(AdminAuth.Live),
          Effect.provide(ConfigProvider.layer(provider))
        )
        expect(auth.check(undefined)).toBe(false)
      })
    )

    it.effect('REJECTS a request with a wrong bearer token', () =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth.pipe(
          Effect.provide(AdminAuth.Live),
          Effect.provide(ConfigProvider.layer(provider))
        )
        expect(auth.check('Bearer wrong-key')).toBe(false)
      })
    )
  })

  describe('NODE_ENV=production with missing ADMIN_API_KEY', () => {
    it.effect('Layer build FAILS with ConfigError — fail-loud on startup', () =>
      Effect.gen(function* () {
        const provider = ConfigProvider.fromEnv({
          env: { NODE_ENV: 'production' }
        })
        const exit = yield* buildWithProvider(provider)
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          expect(Cause.pretty(exit.cause)).toContain('ADMIN_API_KEY')
        }
      })
    )
  })

  describe('NODE_ENV=production with empty ADMIN_API_KEY', () => {
    it.effect('Layer build FAILS — refuses bypassable gate', () =>
      Effect.gen(function* () {
        const provider = ConfigProvider.fromEnv({
          env: { NODE_ENV: 'production', ADMIN_API_KEY: '' }
        })
        const exit = yield* buildWithProvider(provider)
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          // Empty key is a Die (defect) boot invariant; Cause.pretty renders it.
          expect(Cause.pretty(exit.cause)).toContain('ADMIN_API_KEY')
        }
      })
    )
  })

  describe('NODE_ENV=development', () => {
    const provider = ConfigProvider.fromEnv({
      env: { NODE_ENV: 'development' }
    })

    it.effect('Layer build succeeds even without ADMIN_API_KEY', () =>
      Effect.gen(function* () {
        const result = yield* buildWithProvider(provider)
        expect(result._tag).toBe('Success')
      })
    )

    it.effect('ACCEPTS any request regardless of authorization header', () =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth.pipe(
          Effect.provide(AdminAuth.Live),
          Effect.provide(ConfigProvider.layer(provider))
        )
        expect(auth.check(undefined)).toBe(true)
        expect(auth.check('Bearer anything')).toBe(true)
        expect(auth.check('Bearer <redacted>')).toBe(true)
      })
    )
  })
})
