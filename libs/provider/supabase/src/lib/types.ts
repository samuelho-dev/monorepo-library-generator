import { Schema } from "effect"

/**
 * Supabase Provider Types
 *
 * Type definitions and Effect Schemas for Supabase services.

Uses Effect Schema for runtime validation and type-safe serialization.
All schemas are composable and can be extended for domain-specific needs.
 *
 * @module @samuelho-dev/provider-supabase/types
 */


// ============================================================================
// Configuration
// ============================================================================

/**
 * Supabase client configuration
 *
 * Required for initializing the Supabase client.
 */
export interface SupabaseConfig {
  readonly url: string
  readonly anonKey: string
  readonly serviceRoleKey?: string
}

/**
 * Supabase configuration schema for validation
 */
export const SupabaseConfigSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.nonEmptyString()),
  anonKey: Schema.String.pipe(Schema.nonEmptyString()),
  serviceRoleKey: Schema.optional(Schema.String.pipe(Schema.nonEmptyString()))
})

// ============================================================================
// User Types
// ============================================================================

/**
 * Supabase user metadata
 */
export const UserMetadataSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  avatar_url: Schema.optional(Schema.String),
  email_verified: Schema.optional(Schema.Boolean)
}).pipe(Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })))

export type UserMetadata = Schema.Schema.Type<typeof UserMetadataSchema>

/**
 * Supabase user
 */
export const SupabaseUserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.optional(Schema.String),
  phone: Schema.optional(Schema.String),
  created_at: Schema.String,
  updated_at: Schema.optional(Schema.String),
  last_sign_in_at: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  user_metadata: Schema.optional(UserMetadataSchema),
  app_metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

export type SupabaseUser = Schema.Schema.Type<typeof SupabaseUserSchema>

/**
 * Auth user for downstream consumption
 *
 * Simplified user object for auth middleware and RPC context.
 */
export const AuthUserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

export type AuthUser = Schema.Schema.Type<typeof AuthUserSchema>

// ============================================================================
// Session Types
// ============================================================================

/**
 * Supabase session
 */
export const SupabaseSessionSchema = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
  expires_in: Schema.Number,
  expires_at: Schema.optional(Schema.Number),
  token_type: Schema.String,
  user: SupabaseUserSchema
})

export type SupabaseSession = Schema.Schema.Type<typeof SupabaseSessionSchema>

/**
 * Auth result from sign in operations
 */
export const AuthResultSchema = Schema.Struct({
  user: SupabaseUserSchema,
  session: Schema.NullOr(SupabaseSessionSchema)
})

export type AuthResult = Schema.Schema.Type<typeof AuthResultSchema>

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage types are re-exported from the native @supabase/storage-js SDK
 * with aliases for consistent naming across the provider.
 */
export type { Bucket, FileObject, FileOptions, SearchOptions, TransformOptions } from "@supabase/storage-js"
import type { Bucket, FileObject, FileOptions, TransformOptions } from "@supabase/storage-js"

/**
 * Type alias for storage bucket (matches Bucket from SDK)
 */
export type StorageBucket = Bucket

/**
 * Type alias for storage file (matches FileObject from SDK)
 */
export type StorageFile = FileObject

/**
 * Upload options for storage operations
 */
export type UploadOptions = FileOptions

/**
 * Download options for storage operations
 */
export interface DownloadOptions {
  readonly transform?: TransformOptions
}

/**
 * Options for creating signed URLs
 */
export interface SignedUrlOptions {
  readonly expiresIn?: number
  readonly download?: string | boolean
  readonly transform?: TransformOptions
}

/**
 * Storage bucket schema for runtime validation
 */
export const StorageBucketSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  public: Schema.Boolean,
  created_at: Schema.optional(Schema.String),
  updated_at: Schema.optional(Schema.String),
  owner: Schema.optional(Schema.String),
  file_size_limit: Schema.optional(Schema.NullOr(Schema.Number)),
  allowed_mime_types: Schema.optional(Schema.NullOr(Schema.Array(Schema.String)))
})

/**
 * Storage file schema for runtime validation
 */
export const StorageFileSchema = Schema.Struct({
  name: Schema.String,
  id: Schema.optional(Schema.String),
  bucket_id: Schema.optional(Schema.String),
  created_at: Schema.optional(Schema.String),
  updated_at: Schema.optional(Schema.String),
  last_accessed_at: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

// ============================================================================
// Auth Method Types
// ============================================================================

/**
 * Authentication method used
 *
 * Used by RPC middleware to identify how the user was authenticated.
 */
export type AuthMethod = "session" | "api-key" | "service-role"

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  readonly email: string
  readonly password: string
}

/**
 * Sign up credentials
 */
export interface SignUpCredentials {
  readonly email: string
  readonly password: string
  readonly options?: {
    readonly data?: Record<string, unknown>
    readonly emailRedirectTo?: string
  }
}

/**
 * OAuth provider
 */
export type OAuthProvider =
  | "google"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "azure"
  | "facebook"
  | "twitter"
  | "discord"
  | "slack"
  | "spotify"
  | "notion"
  | "zoom"
  | "linkedin"
  | "linkedin_oidc"
  | "apple"
  | "keycloak"
  | "workos"