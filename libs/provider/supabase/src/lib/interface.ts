/**
 * Supabase Provider - Service Interface
 *
 * Defines the Effect-based interface for Supabase client operations.
 */

import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js'
import type { Effect } from 'effect'
import type { SupabaseConnectionError, SupabaseError } from './errors'
import type { SupabaseConfig } from './types'

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
  readonly config: SupabaseConfig

  /**
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
