/**
 * Supabase Provider Library
 *
 * Thin SDK adapter wrapping @supabase/supabase-js in Effect types.
 * Exposes Live layers only — Test/Dev implementations live in infra-storage.
 *
 * Services:
 * - SupabaseClient.Live — SDK client initialization
 * - SupabaseAuth.Live — authentication operations
 * - SupabaseStorage.Live — file storage operations (requires SupabaseClient.Live)
 */

// ============================================================================
// Error Types
// ============================================================================

export type { SupabaseProviderError } from './lib/errors'
export {
  // Auth errors
  SupabaseAuthError,
  SupabaseBucketNotFoundError,
  SupabaseConnectionError,
  // Base error
  SupabaseError,
  SupabaseFileNotFoundError,
  SupabaseInvalidCredentialsError,
  SupabaseSessionExpiredError,
  // Storage errors
  SupabaseStorageError,
  SupabaseTokenError
} from './lib/errors'

// ============================================================================
// Types
// ============================================================================

export type {
  // Auth types
  AuthMethod,
  AuthUser,
  DownloadOptions,
  OAuthProvider,
  SignedUrlOptions,
  SignInCredentials,
  SignUpCredentials,
  // Storage types
  StorageFile,
  // Configuration
  SupabaseConfig,
  // Session types
  SupabaseSession,
  // User types
  SupabaseUser,
  UploadOptions,
  UserMetadata
} from './lib/types'

// Schema exports for runtime validation
export {
  AuthResult,
  AuthUserSchema,
  StorageBucket,
  StorageFileSchema,
  SupabaseConfigSchema,
  SupabaseSessionSchema,
  SupabaseUserSchema,
  UserMetadataSchema
} from './lib/types'

// ============================================================================
// Services
// ============================================================================

// SupabaseClient - Core client for SDK initialization
//
// Effect 3.0+ Pattern: Context.Tag with static layer members
//   - SupabaseClient.Live (lazy env loading)
//   - SupabaseClient.Test (mock client)
//   - SupabaseClient.make(config) (custom configuration)

export {
  SupabaseClient,
  type SupabaseClientServiceInterface
} from './lib/service'

// SupabaseAuth - Authentication operations
//
// Provides: signInWithPassword, signUp, signOut, verifyToken, getSession, getUser
// Used by: infra-auth for auth middleware

export { SupabaseAuth, type SupabaseAuthServiceInterface } from './lib/auth'

// SupabaseStorage - File storage operations
//
// Provides: upload, download, remove, list, createSignedUrl, getPublicUrl
// Used by: infra-storage for file operations

export {
  SupabaseStorage,
  type SupabaseStorageServiceInterface
} from './lib/storage'
