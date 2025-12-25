import { env } from "@samuelho-dev/env"
import { Context, Effect, Layer, Redacted } from "effect"
import { SupabaseConnectionError, SupabaseError } from "./errors"

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

import type { SupabaseConfig } from "./types"
import { createClient, type SupabaseClient as SupabaseSDKClient } from "@supabase/supabase-js"

// ============================================================================
// Service Interface
// ============================================================================

/**
 * SupabaseClient Service Interface
 *
 * Provides access to the core Supabase client.
 * Used by SupabaseAuth and SupabaseStorage services.
 */
export interface SupabaseClientServiceInterface {
  /**
   * Configuration used to initialize the client
   */
  readonly config: SupabaseConfig  /**
   * Get the underlying Supabase client
   *
   * Use this for advanced operations not covered by SupabaseAuth/SupabaseStorage.
   * Prefer the specialized services for auth and storage operations.
   */
  readonly getClient: () => Effect.Effect<SupabaseSDKClient, SupabaseError>

  /**
   * Health check - verifies Supabase connectivity
   */
  readonly healthCheck: () => Effect.Effect<boolean, SupabaseConnectionError>
}

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
 * - SupabaseClient.Dev - Development with debug logging
 * - SupabaseClient.make(config) - Custom configuration
 */
export class SupabaseClient extends Context.Tag("SupabaseClient")<
  SupabaseClient,
  SupabaseClientServiceInterface
>() {
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
              message: "Failed to create Supabase client",
              cause: error
            }),
        }),

      healthCheck: () =>
        Effect.gen(function*() {
          const client = createClient(config.url, config.anonKey)
          // Simple health check - verify we can reach Supabase
          const { error } = yield* Effect.tryPromise({
            try: () => client.auth.getSession(),
            catch: (error) =>
              new SupabaseConnectionError({
                message: "Failed to connect to Supabase",
                cause: error
              })
          })
          // getSession returns null session when not authenticated, that's OK
          // We only care if there's an actual error
          if (error && error.status !== 400) {
            return yield* Effect.fail(
              new SupabaseConnectionError({
                message: "Supabase health check failed",
                cause: error
              })
            )
          }
          return true
        }),
    })
  }

  /**
   * Live layer using the centralized env library
   *
   * Environment variables are validated at application startup
   * via the @scope/env library. This layer simply reads the
   * pre-validated values.
   */
  static readonly Live = Layer.sync(SupabaseClient, () => {
      // Read from centralized env library (already validated at startup)
      const url = env.SUPABASE_URL
      const anonKey = Redacted.value(env.SUPABASE_ANON_KEY)
      const serviceRoleKey = Redacted.value(env.SUPABASE_SERVICE_ROLE_KEY)

      const config: SupabaseConfig = {
        url,
        anonKey,
        serviceRoleKey,
      }

      const client = createClient(config.url, config.anonKey)

      return {
        config,

        getClient: () => Effect.succeed(client),

        healthCheck: () =>
          Effect.gen(function*() {
            const { error } = yield* Effect.tryPromise({
              try: () => client.auth.getSession(),
              catch: (error) =>
                new SupabaseConnectionError({
                  message: "Failed to connect to Supabase",
                  cause: error
                }),
            })
            if (error && error.status !== 400) {
              return yield* Effect.fail(
                new SupabaseConnectionError({
                  message: "Supabase health check failed",
                  cause: error
                })
              )
            }
            return true;
          })
      } 
  })

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
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
    },

    getClient: () =>
      Effect.fail(
        new SupabaseError({
          message: "Test layer does not provide a real client. Use make() for integration tests.",
        })
      ),

    healthCheck: () => Effect.succeed(true)
  }))

  /**
   * Dev layer with debug logging
   *
   * Uses the same env library as Live, but adds debug logging.
   */
  static readonly Dev = Layer.effect(
    SupabaseClient,
    Effect.gen(function*() {
      yield* Effect.logDebug("[SupabaseClient] Initializing dev client...")

      // Read from centralized env library
      const url = env.SUPABASE_URL
      const anonKey = Redacted.value(env.SUPABASE_ANON_KEY)
      const serviceRoleKey = Redacted.value(env.SUPABASE_SERVICE_ROLE_KEY)

      const config: SupabaseConfig = { url, anonKey, serviceRoleKey }

      yield* Effect.logDebug("[SupabaseClient] Config loaded", { url: config.url })

      return {
        config,

        getClient: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseClient] Creating client...")
            return createClient(config.url, config.anonKey)
          }),

        healthCheck: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseClient] Running health check...")
            yield* Effect.logDebug("[SupabaseClient] Health check passed (dev mode)")
            return true;
          })
      } ;
    })
  )
}