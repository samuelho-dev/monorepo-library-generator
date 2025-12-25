import { Schema } from "effect"

/**
 * Storage Infrastructure Types
 *
 * Type definitions for storage infrastructure.

Re-exports types from provider-supabase and adds storage-specific types.
 *
 * @module @samuelho-dev/infra-storage/types
 */


// ============================================================================
// Provider Types
// ============================================================================

// NOTE: For provider-specific types (StorageBucket, StorageFile, etc.),
// import directly from @samuelho-dev/provider-supabase:
// import type { StorageBucket, StorageFile, UploadOptions } from "@samuelho-dev/provider-supabase"
// import { StorageBucketSchema, StorageFileSchema } from "@samuelho-dev/provider-supabase"

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Storage service configuration
 */
export interface StorageConfig {
  /**
   * Default bucket for operations
   */
  readonly defaultBucket?: string

  /**
   * Maximum file size in bytes
   */
  readonly maxFileSize?: number

  /**
   * Allowed MIME types
   */
  readonly allowedMimeTypes?: ReadonlyArray<string>

  /**
   * Default signed URL expiration in seconds
   */
  readonly signedUrlExpiresIn?: number
}

/**
 * Storage config schema
 */
export const StorageConfigSchema = Schema.Struct({
  defaultBucket: Schema.optional(Schema.String),
  maxFileSize: Schema.optional(Schema.Number),
  allowedMimeTypes: Schema.optional(Schema.Array(Schema.String)),
  signedUrlExpiresIn: Schema.optional(Schema.Number)
})

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Upload result
 */
export interface UploadResult {
  readonly path: string
  readonly bucket: string
  readonly publicUrl?: string
  readonly signedUrl?: string
}

/**
 * Upload result schema
 */
export const UploadResultSchema = Schema.Struct({
  path: Schema.String,
  bucket: Schema.String,
  publicUrl: Schema.optional(Schema.String),
  signedUrl: Schema.optional(Schema.String)
})

/**
 * List files options
 */
export interface ListFilesOptions {
  readonly limit?: number
  readonly offset?: number
  readonly prefix?: string
  readonly sortBy?: {
    readonly column: 'name' | 'created_at' | 'updated_at'
    readonly order: 'asc' | 'desc'
  }
}

/**
 * Storage file info (subset of provider StorageFile)
 */
export interface StorageFileInfo {
  readonly name: string
  readonly id?: string
  readonly created_at?: string
  readonly updated_at?: string
}

/**
 * List files result
 */
export interface ListFilesResult {
  readonly files: ReadonlyArray<StorageFileInfo>
  readonly hasMore: boolean
  readonly nextOffset?: number
}