/**
 * Supabase Server Client
 *
 * Factory functions for creating Supabase clients in Next.js server environments.
 * These functions handle cookie-based session management for SSR.
 */

import { env } from '@samuelho-dev/env'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Redacted } from 'effect'
import { cookies } from 'next/headers'

/**
 * Create a Supabase server client with cookie-based session management
 *
 * Used in:
 * - Server Components
 * - API Routes
 * - Server Actions
 *
 * @returns Configured Supabase client
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  // Derive cookie storage key from NEXT_PUBLIC_SUPABASE_URL to match browser client.
  // @supabase/ssr derives cookie names from the URL. If server uses internal K8s URL
  // but browser uses external domain, cookie names diverge and PKCE breaks.
  const publicRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  const storageKey = `sb-${publicRef}-auth-token`

  // No `cookieEncoding` override — match the browser client default
  // (`base64url`). The previous explicit `'raw'` setting only affected
  // server-side WRITES while the browser library defaulted to base64url
  // on its writes; @supabase/ssr auto-detects the format on read so both
  // worked, but the configs disagreed. Aligning on the library default
  // removes the latent inconsistency.
  return createServerClient(env.SUPABASE_URL, Redacted.value(env.SUPABASE_ANON_KEY), {
    cookieOptions: { name: storageKey },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: Array<{
          name: string
          value: string
          options?: Parameters<typeof cookieStore.set>[2]
        }>
      ) {
        try {
          for (const cookie of cookiesToSet) {
            if (cookie.options) {
              cookieStore.set(cookie.name, cookie.value, cookie.options)
            } else {
              cookieStore.set(cookie.name, cookie.value)
            }
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}

/**
 * Create a Supabase admin client with service role key
 *
 * Used for admin operations that bypass Row Level Security.
 * WARNING: Only use in trusted server contexts.
 *
 * @returns Configured admin Supabase client
 */
export function createSupabaseAdminClient() {
  return createClient(env.SUPABASE_URL, Redacted.value(env.SUPABASE_SERVICE_ROLE_KEY), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Re-export necessary types for server-side usage
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
