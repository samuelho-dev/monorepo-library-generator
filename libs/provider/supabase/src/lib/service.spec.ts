import { Effect, Layer, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { SupabaseAuth } from './auth'
import { SupabaseError } from './errors'
import { SupabaseClient } from './service'

/**
 * Supabase Provider Tests — Test-layer behavior + custom config wiring.
 * Live HTTP path covered in service.integration.spec.ts.
 *
 * @module @samuelho-dev/provider-supabase/tests
 */

describe('SupabaseClient', () => {
  describe('Test layer behavior', () => {
    it('healthCheck reports healthy', async () => {
      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return yield* client.healthCheck()
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseClient.Test)))
      expect(result).toBe(true)
    })

    it('Test layer provides the canonical test URL', async () => {
      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return client.config.url
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseClient.Test)))
      expect(result).toBe('https://test.supabase.co')
    })
  })

  describe('Layer override', () => {
    it('alternate config flows through to consumers', async () => {
      const customLayer = Layer.succeed(SupabaseClient, {
        config: { url: 'https://custom.supabase.co', anonKey: 'custom-key' },
        getClient: () => Effect.fail(new SupabaseError({ message: 'Not implemented' })),
        healthCheck: () => Effect.succeed(true)
      })

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return client.config.url
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(customLayer)))
      expect(result).toBe('https://custom.supabase.co')
    })

    it('Layer.scoped finalizer runs after scope closes', async () => {
      let initialized = false
      let finalized = false

      const scopedLayer = Layer.effect(
        SupabaseClient,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true
            return {
              config: {
                url: 'https://scoped.supabase.co',
                anonKey: 'scoped-key'
              },
              getClient: () => Effect.fail(new SupabaseError({ message: 'Not implemented' })),
              healthCheck: () => Effect.succeed(true)
            }
          }),
          () =>
            Effect.sync(() => {
              finalized = true
            })
        )
      )

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return client.config.url
      })

      const result = await Effect.runPromise(
        Effect.scoped(program.pipe(Effect.provide(scopedLayer)))
      )
      expect(result).toBe('https://scoped.supabase.co')
      expect(initialized).toBe(true)
      expect(finalized).toBe(true)
    })

    it('Layer.fresh forces re-initialization across uses', async () => {
      let callCount = 0

      const countingLayer = Layer.effect(
        SupabaseClient,
        Effect.sync(() => {
          callCount++
          return {
            config: {
              url: `https://call-${callCount}.supabase.co`,
              anonKey: 'key'
            },
            getClient: () => Effect.fail(new SupabaseError({ message: 'Not implemented' })),
            healthCheck: () => Effect.succeed(true)
          }
        })
      )

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return client.config.url
      })

      const fresh = Layer.fresh(countingLayer)
      await Effect.runPromise(program.pipe(Effect.provide(fresh)))
      await Effect.runPromise(program.pipe(Effect.provide(fresh)))
      expect(callCount).toBeGreaterThan(1)
    })
  })

  describe('Custom Configuration', () => {
    it('SupabaseClient.make accepts custom config', async () => {
      const customConfig = {
        url: 'https://my-project.supabase.co',
        anonKey: 'my-anon-key'
      }

      const layer = SupabaseClient.make(customConfig)

      const program = Effect.gen(function* () {
        const client = yield* SupabaseClient
        return client.config
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(layer)))
      expect(result.url).toBe(customConfig.url)
      expect(result.anonKey).toBe(customConfig.anonKey)
    })
  })
})

describe('SupabaseAuth', () => {
  describe('Authentication', () => {
    it('signInWithPassword returns canonical test user', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const result = yield* auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password123'
        })
        return result
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(result.user.id).toBe('test-user-id')
    })

    it('signUp returns the new-user fixture', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const result = yield* auth.signUp({
          email: 'new@example.com',
          password: 'password123'
        })
        return result
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(result.user.id).toBe('new-user-id')
    })

    it('verifyToken decodes the canonical test access token', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const user = yield* auth.verifyToken('test-access-token')
        return user
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(result.id).toBe('test-user-id')
      expect(result.email).toBe('test@example.com')
    })
  })

  describe('Session Management', () => {
    it('getSession returns Some with the canonical access token', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const session = yield* auth.getSession()
        return session
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.access_token).toBe('test-access-token')
      }
    })

    it('getUser returns Some for the canonical session', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const user = yield* auth.getUser()
        return user
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(Option.isSome(result)).toBe(true)
    })

    it('signOut completes without error', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        yield* auth.signOut()
        return true
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(result).toBe(true)
    })
  })

  describe('RPC Integration', () => {
    it('getUserFromToken returns user with authenticated role', async () => {
      const program = Effect.gen(function* () {
        const auth = yield* SupabaseAuth
        const user = yield* auth.getUserFromToken('bearer-token')
        return user
      })

      const result = await Effect.runPromise(program.pipe(Effect.provide(SupabaseAuth.Test)))
      expect(result.id).toBe('test-user-id')
      expect(result.role).toBe('authenticated')
    })
  })
})
