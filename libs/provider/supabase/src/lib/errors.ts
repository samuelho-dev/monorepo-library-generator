import { Data } from "effect"

/**
 * Supabase Provider Errors
 *
 * Data.TaggedError-based error types for Supabase operations.

All errors extend Data.TaggedError for:
- Structural equality
- Serialization support
- Pattern matching with Effect.catchTag
 *
 * @module @samuelho-dev/provider-supabase/errors
 */


// ============================================================================
// Base Error Type
// ============================================================================

/**
 * Base Supabase error
 *
 * Parent class for all Supabase-specific errors.
 * Use specific error types for better error handling.
 */
export class SupabaseError extends Data.TaggedError("SupabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Connection Errors
// ============================================================================

/**
 * Supabase connection/initialization error
 *
 * Thrown when unable to initialize Supabase client or connect to the service.
 */
export class SupabaseConnectionError extends Data.TaggedError("SupabaseConnectionError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Supabase authentication error
 *
 * Thrown when authentication operations fail (sign in, sign out, verify token).
 */
export class SupabaseAuthError extends Data.TaggedError("SupabaseAuthError")<{
  readonly message: string
  readonly operation: "signIn" | "signOut" | "signUp" | "verifyToken" | "refreshToken" | "getSession" | "getUser"
  readonly cause?: unknown
}> {}

/**
 * Invalid credentials error
 *
 * Thrown when provided credentials are invalid.
 */
export class SupabaseInvalidCredentialsError extends Data.TaggedError("SupabaseInvalidCredentialsError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Session expired error
 *
 * Thrown when the session has expired and needs refresh.
 */
export class SupabaseSessionExpiredError extends Data.TaggedError("SupabaseSessionExpiredError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Token verification error
 *
 * Thrown when JWT token verification fails.
 */
export class SupabaseTokenError extends Data.TaggedError("SupabaseTokenError")<{
  readonly message: string
  readonly tokenType: "access" | "refresh"
  readonly cause?: unknown
}> {}

// ============================================================================
// Storage Errors
// ============================================================================

/**
 * Supabase storage error
 *
 * Thrown when storage operations fail (upload, download, delete).
 */
export class SupabaseStorageError extends Data.TaggedError("SupabaseStorageError")<{
  readonly message: string
  readonly operation: "upload" | "download" | "delete" | "list" | "move" | "copy" | "createBucket" | "deleteBucket" | "getBucket" | "listBuckets" | "createSignedUrl" | "getPublicUrl"
  readonly bucket?: string
  readonly path?: string
  readonly cause?: unknown
}> {}

/**
 * File not found error
 *
 * Thrown when attempting to access a file that doesn't exist.
 */
export class SupabaseFileNotFoundError extends Data.TaggedError("SupabaseFileNotFoundError")<{
  readonly message: string
  readonly bucket: string
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Bucket not found error
 *
 * Thrown when attempting to access a bucket that doesn't exist.
 */
export class SupabaseBucketNotFoundError extends Data.TaggedError("SupabaseBucketNotFoundError")<{
  readonly message: string
  readonly bucket: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Error Union Type
// ============================================================================

/**
 * Union of all Supabase provider errors
 *
 * Use this type when you need to handle any Supabase error.
 */
export type SupabaseProviderError =
  | SupabaseError
  | SupabaseConnectionError
  | SupabaseAuthError
  | SupabaseInvalidCredentialsError
  | SupabaseSessionExpiredError
  | SupabaseTokenError
  | SupabaseStorageError
  | SupabaseFileNotFoundError
  | SupabaseBucketNotFoundError