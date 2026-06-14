import { Schema } from 'effect'

/**
 * Supabase Provider Errors
 *
 * Schema.TaggedError-based error types for Supabase operations.

All errors extend Schema.TaggedError for:
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
export class SupabaseError extends Schema.TaggedErrorClass<SupabaseError>()('SupabaseError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {}

// ============================================================================
// Connection Errors
// ============================================================================

/**
 * Supabase connection/initialization error
 *
 * Thrown when unable to initialize Supabase client or connect to the service.
 */
export class SupabaseConnectionError extends Schema.TaggedErrorClass<SupabaseConnectionError>()(
  'SupabaseConnectionError',
  {
    message: Schema.String,
    retryable: Schema.Literal(true),
    cause: Schema.optional(Schema.Defect)
  }
) {}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Supabase authentication error
 *
 * Thrown when authentication operations fail (sign in, sign out, verify token).
 */
export class SupabaseAuthError extends Schema.TaggedErrorClass<SupabaseAuthError>()(
  'SupabaseAuthError',
  {
    message: Schema.String,
    retryable: Schema.Literal(true),
    operation: Schema.Union([
      Schema.Literal('signIn'),
      Schema.Literal('signOut'),
      Schema.Literal('signUp'),
      Schema.Literal('verifyToken'),
      Schema.Literal('refreshToken'),
      Schema.Literal('getSession'),
      Schema.Literal('getUser')
    ]),
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Invalid credentials error
 *
 * Thrown when provided credentials are invalid.
 */
export class SupabaseInvalidCredentialsError extends Schema.TaggedErrorClass<SupabaseInvalidCredentialsError>()(
  'SupabaseInvalidCredentialsError',
  {
    message: Schema.String,
    retryable: Schema.Literal(false),
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Session expired error
 *
 * Thrown when the session has expired and needs refresh.
 */
export class SupabaseSessionExpiredError extends Schema.TaggedErrorClass<SupabaseSessionExpiredError>()(
  'SupabaseSessionExpiredError',
  {
    message: Schema.String,
    retryable: Schema.Literal(false),
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Token verification error
 *
 * Thrown when JWT token verification fails.
 */
export class SupabaseTokenError extends Schema.TaggedErrorClass<SupabaseTokenError>()(
  'SupabaseTokenError',
  {
    message: Schema.String,
    retryable: Schema.Literal(false),
    tokenType: Schema.Union([Schema.Literal('access'), Schema.Literal('refresh')]),
    cause: Schema.optional(Schema.Defect)
  }
) {}

// ============================================================================
// Storage Errors
// ============================================================================

/**
 * Supabase storage error
 *
 * Thrown when storage operations fail (upload, download, delete).
 */
export class SupabaseStorageError extends Schema.TaggedErrorClass<SupabaseStorageError>()(
  'SupabaseStorageError',
  {
    message: Schema.String,
    retryable: Schema.Literal(true),
    operation: Schema.Union([
      Schema.Literal('upload'),
      Schema.Literal('download'),
      Schema.Literal('delete'),
      Schema.Literal('list'),
      Schema.Literal('move'),
      Schema.Literal('copy'),
      Schema.Literal('createBucket'),
      Schema.Literal('deleteBucket'),
      Schema.Literal('getBucket'),
      Schema.Literal('listBuckets'),
      Schema.Literal('createSignedUrl'),
      Schema.Literal('createSignedUploadUrl'),
      Schema.Literal('getPublicUrl')
    ]),
    bucket: Schema.optional(Schema.String),
    path: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * File not found error
 *
 * Thrown when attempting to access a file that doesn't exist.
 */
export class SupabaseFileNotFoundError extends Schema.TaggedErrorClass<SupabaseFileNotFoundError>()(
  'SupabaseFileNotFoundError',
  {
    message: Schema.String,
    retryable: Schema.Literal(false),
    bucket: Schema.String,
    path: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Bucket not found error
 *
 * Thrown when attempting to access a bucket that doesn't exist.
 */
export class SupabaseBucketNotFoundError extends Schema.TaggedErrorClass<SupabaseBucketNotFoundError>()(
  'SupabaseBucketNotFoundError',
  {
    message: Schema.String,
    retryable: Schema.Literal(false),
    bucket: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

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
