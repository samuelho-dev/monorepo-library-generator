/**
 * Supabase server-side exports
 *
 * This module provides server-side Supabase functionality.
 * Only safe for Node.js server environments.
 * Includes Next.js SSR client creation with cookies support.
 */

// Configuration types
export type { CookieOptions } from '@supabase/ssr'

// Re-export SDK functions for server use
export { createServerClient } from '@supabase/ssr'
// Type exports for server-side usage
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
  User
} from '@supabase/supabase-js'
export { createClient } from '@supabase/supabase-js'
export { SupabaseAuth } from './lib/auth'
// Error types
export {
  SupabaseAuthError,
  SupabaseBucketNotFoundError,
  SupabaseConnectionError,
  SupabaseError,
  SupabaseFileNotFoundError,
  SupabaseInvalidCredentialsError,
  SupabaseSessionExpiredError,
  SupabaseStorageError,
  SupabaseTokenError
} from './lib/errors'
// Server client exports
export {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from './lib/server/server'
// Effect service exports
export { SupabaseClient } from './lib/service'
export { SupabaseStorage } from './lib/storage'

export type { SupabaseConfig } from './lib/types'
