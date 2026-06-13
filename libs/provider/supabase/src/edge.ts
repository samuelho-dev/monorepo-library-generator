/**
 * Supabase Edge Runtime Exports
 *
 * Edge-compatible Supabase functionality for Next.js middleware.
 * No Node.js APIs, no Effect services - pure Edge Runtime compatible code only.
 *
 * @module @samuelho-dev/provider-supabase/edge
 */

// Re-export SSR-specific types for cookie handling
export type { CookieOptions, CookieOptionsWithName } from '@supabase/ssr'
// Re-export Edge Runtime-compatible server client from Supabase SSR
// This is already optimized for Edge Runtime (Web APIs only, no Node.js)
export { createServerClient } from '@supabase/ssr'
// Re-export Edge-safe types (types have no runtime overhead)
export type {
  AuthError,
  AuthResponse,
  AuthSession,
  AuthTokenResponse,
  AuthUser,
  PostgrestError,
  PostgrestResponse,
  Session,
  SupabaseClient,
  User
} from '@supabase/supabase-js'
