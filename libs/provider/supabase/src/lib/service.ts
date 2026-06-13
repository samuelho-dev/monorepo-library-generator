import { Config, Context, Effect, Layer, Redacted } from 'effect'
import { SupabaseConnectionError, SupabaseError } from './errors'
import type { SupabaseClientServiceInterface } from './interface'
import type { SupabaseConfig } from './types'

/**
 * SupabaseClient Service
 *
 * Core Supabase client provider with Effect integration.

Wraps the @supabase/supabase-js SDK in Effect types.
Other Supabase services (Auth, Storage) depend on this client.

Architecture:
  provider-supabase → wraps Supabase SDK (this library)
  infra-auth → uses SupabaseAuth for authentication
  infra-storage → uses SupabaseStorage for file storage
 *
 * @module @samuelho-dev/provider-supabase/service/client
 * @see https://supabase.com/docs for Supabase documentation
 */

import { createClient } from '@supabase/supabase-js'

// Re-export interface for convenience
export type { SupabaseClientServiceInterface } from './interface'

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * SupabaseClient Service Tag
 *
 * Access via: yield* SupabaseClient
 *
 * Static layers:
 * - SupabaseClient.Live - Production with lazy env loading
 * - SupabaseClient.Test - Test layer with mock client
 * - SupabaseClient.make(config) - Custom configuration
 */
export class SupabaseClient extends Context.Service<
  SupabaseClient,
  SupabaseClientServiceInterface
>()('@samuelho-dev/provider-supabase/SupabaseClient') {
  /**
   * Create a layer with custom configuration
   *
   * @param config - Supabase configuration
   * @returns Layer providing SupabaseClientServiceInterface
   */
  static make(config: SupabaseConfig) {
    return Layer.succeed(SupabaseClient, {
      config,

      getClient: () =>
        Effect.try({
          try: () => createClient(config.url, config.anonKey),
          catch: (error) =>
            new SupabaseError({
              message: 'Failed to create Supabase client',
              cause: error
            })
        }),

      healthCheck: () =>
        Effect.gen(function* () {
          const client = createClient(config.url, config.anonKey)
          // Simple health check - verify we can reach Supabase
          const { error } = yield* Effect.tryPromise({
            try: () => client.auth.getSession(),
            catch: (error) =>
              new SupabaseConnectionError({
                retryable: true as const,
                message: 'Failed to connect to Supabase',
                cause: error
              })
          })
          // getSession returns null session when not authenticated, that's OK
          // We only care if there's an actual error
          if (error && error.status !== 400) {
            return yield* new SupabaseConnectionError({
              retryable: true as const,
              message: 'Supabase health check failed',
              cause: error
            })
          }
          return true
        })
    })
  }

  /**
   * Live layer using the centralized env library
   *
   * Environment variables are validated at application startup
   * via the @scope/env library. This layer simply reads the
   * pre-validated values.
   */
  static readonly Live = Layer.effect(
    SupabaseClient,
    Effect.gen(function* () {
      const url = yield* Config.string('SUPABASE_URL')
      const anonKey = Redacted.value(yield* Config.redacted('SUPABASE_ANON_KEY'))
      const serviceRoleKey = Redacted.value(yield* Config.redacted('SUPABASE_SERVICE_ROLE_KEY'))

      const config: SupabaseConfig = { url, anonKey, serviceRoleKey }

      const client = createClient(config.url, config.anonKey)

      return {
        config,

        getClient: () => Effect.succeed(client),

        healthCheck: () =>
          Effect.gen(function* () {
            const { error } = yield* Effect.tryPromise({
              try: () => client.auth.getSession(),
              catch: (error) =>
                new SupabaseConnectionError({
                  retryable: true as const,
                  message: 'Failed to connect to Supabase',
                  cause: error
                })
            })
            if (error && error.status !== 400) {
              return yield* new SupabaseConnectionError({
                retryable: true as const,
                message: 'Supabase health check failed',
                cause: error
              })
            }
            return true
          })
      }
    })
  )

  /**
   * Test layer with mock client
   *
   * Provides a stub client for unit testing without Supabase connection.
   * Uses Layer.sync for test isolation (fresh instance per test run).
   *
   * For integration tests requiring real Supabase operations, use:
   * ```typescript
   * SupabaseClient.make({ url: "...", anonKey: "..." })
   * ```
   */
  static readonly Test = Layer.sync(SupabaseClient, () => ({
    config: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    },

    getClient: () =>
      Effect.fail(
        new SupabaseError({
          message: 'Test layer does not provide a real client. Use make() for integration tests.'
        })
      ),

    healthCheck: () => Effect.succeed(true)
  }))

  /**
   * Auto layer — selects `Test` under NODE_ENV=test, otherwise `Live`.
   */
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (nodeEnv) =>
      nodeEnv === 'test' ? SupabaseClient.Test : SupabaseClient.Live
    )
  )
}
