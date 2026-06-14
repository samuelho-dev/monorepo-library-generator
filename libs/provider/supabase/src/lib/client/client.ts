/**
 * Supabase Browser Client
 *
 * Factory functions for creating Supabase clients in browser environments.
 * Uses singleton pattern for consistent client instance across the app.
 */

import { env } from '@samuelho-dev/env/client'
import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

function getConfig() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!(url && anonKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  return { url, anonKey }
}

/**
 * Get the Supabase browser client (singleton)
 *
 * Used in client-side React components and hooks.
 * Creates a single instance that persists across the app.
 *
 * @returns Configured Supabase browser client
 */
export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = getConfig()
  browserClient = createBrowserClient(url, anonKey)

  return browserClient
}

/**
 * Create a new Supabase browser client instance
 *
 * Use this when you need a fresh client instance.
 * Prefer getSupabaseBrowserClient() for most use cases.
 *
 * @returns New Supabase browser client
 */
export function createSupabaseClient() {
  const { url, anonKey } = getConfig()
  return createBrowserClient(url, anonKey)
}

/**
 * Re-export necessary types for client-side usage
 */
export type {
  AuthError,
  AuthResponse,
  AuthSession,
  AuthTokenResponse,
  AuthUser,
  PostgrestError,
  PostgrestResponse,
  RealtimeChannel,
  RealtimeChannelSendResponse,
  Session,
  SupabaseClient,
  User
} from '@supabase/supabase-js'
