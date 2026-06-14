/**
 * Admin API-key auth gate.
 *
 * Validates the `Authorization` header against `ADMIN_API_KEY` for /admin
 * routes. Framework-agnostic: callers pass the raw header string, not a
 * request object, so this lives in infra-auth rather than the app layer.
 *
 * SECURITY [P0]: the key + NODE_ENV are read directly via `Config.*`
 * (bypassing libs/env) and the layer fails at build with a typed
 * `ConfigError`/die when `ADMIN_API_KEY` is empty in production — same
 * pattern as `JwtSecret` in service-auth middleware. In dev/test the gate
 * short-circuits to `true`; it only enforces in production.
 *
 * @module @samuelho-dev/infra-auth/admin-auth
 */

import { Config, Context, Effect, Layer, Redacted } from 'effect'

export interface AdminAuthShape {
  /** Returns true when the request's Authorization header is allowed. */
  readonly check: (authorizationHeader: string | undefined) => boolean
}

export class AdminAuth extends Context.Service<AdminAuth, AdminAuthShape>()(
  '@samuelho-dev/infra-auth/AdminAuth'
) {
  /**
   * Live layer. Reads `NODE_ENV` + `ADMIN_API_KEY` via `Config.*` and dies
   * at layer build if `ADMIN_API_KEY` is empty in production. The `check`
   * is pre-computed from the resolved key so per-request cost is one `===`.
   */
  static readonly Live = Layer.effect(
    AdminAuth,
    Effect.gen(function* () {
      const nodeEnv = yield* Config.string('NODE_ENV').pipe(Config.withDefault('development'))
      const isProduction = nodeEnv === 'production'

      // In dev/test the gate short-circuits to `true`. Reading the key with
      // a default would silently accept an empty dev key and become a
      // bypassable gate if NODE_ENV flipped to production without the key set.
      if (!isProduction) {
        return { check: () => true }
      }

      const apiKey = Redacted.value(yield* Config.redacted('ADMIN_API_KEY'))
      if (apiKey.length === 0) {
        // Non-recoverable boot invariant → die (layer build fails loudly).
        return yield* Effect.die(
          new Error(
            'ADMIN_API_KEY is empty in production — refusing to boot with a bypassable admin auth gate'
          )
        )
      }

      const expectedBearerHeader = `Bearer ${apiKey}`
      return {
        check: (authorizationHeader: string | undefined) =>
          authorizationHeader === expectedBearerHeader
      }
    })
  )
}
