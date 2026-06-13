/**
 * Supabase client-side exports
 *
 * This module provides browser-safe Supabase functionality.
 * Safe for use in client-side React components and browser environments.
 * No server-side functionality or Effect services are exported here.
 */

// Re-export SDK functions for browser use
export { createBrowserClient } from '@supabase/ssr'
// Type exports for client-side usage
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
export { createClient } from '@supabase/supabase-js'
// Browser client exports
export {
  createSupabaseClient,
  getSupabaseBrowserClient
} from './lib/client/client'
// Resumable (TUS) upload for large files
export {
  type ResumableUploadOptions,
  resumableUpload
} from './lib/client/resumable-upload'
