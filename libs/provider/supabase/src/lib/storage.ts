import type {
  Bucket,
  FileObject,
  FileOptions,
  SearchOptions,
  TransformOptions
} from '@supabase/storage-js'
import { createClient, type SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js'
import { Context, Effect, Layer, Option } from 'effect'
import {
  SupabaseBucketNotFoundError,
  SupabaseFileNotFoundError,
  SupabaseStorageError
} from './errors'
import { SupabaseClient } from './service'

/**
 * SupabaseStorage Service
 *
 * Supabase storage provider with Effect integration.

Wraps Supabase Storage API for:
- File upload/download
- Bucket management
- Signed URLs for secure access

This service is consumed by infra-storage for file operations.
 *
 * @module @samuelho-dev/provider-supabase/service/storage
 * @see https://supabase.com/docs/reference/javascript/storage-api
 */

// ============================================================================
// Result Types
// ============================================================================

/**
 * Upload result - minimal type for upload operations
 *
 * Supabase SDK returns minimal data on upload. Full FileObject
 * requires a separate list() call to retrieve.
 */
export interface StorageUploadResult {
  readonly name: string
  readonly bucket_id?: string
}

/**
 * Bucket creation result - minimal type for createBucket operations
 *
 * SDK returns minimal data. Full Bucket requires getBucket() call.
 */
export interface StorageBucketResult {
  readonly id: string
  readonly name: string
  readonly public: boolean
  readonly created_at?: string
  readonly updated_at?: string
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * SupabaseStorage Service Interface
 *
 * Uses native types from @supabase/storage-js SDK where possible.
 * Upload and createBucket return minimal types since SDK doesn't return full objects.
 */
export interface SupabaseStorageServiceInterface {
  /** Upload a file to storage */
  readonly upload: (
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer | string,
    options?: FileOptions
  ) => Effect.Effect<StorageUploadResult, SupabaseStorageError | SupabaseBucketNotFoundError>

  /** Download a file from storage */
  readonly download: (
    bucket: string,
    path: string,
    options?: { transform?: TransformOptions }
  ) => Effect.Effect<Blob, SupabaseStorageError | SupabaseFileNotFoundError>

  /** Delete files from storage */
  readonly remove: (bucket: string, paths: string[]) => Effect.Effect<void, SupabaseStorageError>

  /** List files in a bucket */
  readonly list: (
    bucket: string,
    path?: string,
    options?: SearchOptions
  ) => Effect.Effect<FileObject[], SupabaseStorageError | SupabaseBucketNotFoundError>

  /** Move a file to a new location */
  readonly move: (
    bucket: string,
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseFileNotFoundError>

  /** Copy a file to a new location */
  readonly copy: (
    bucket: string,
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseFileNotFoundError>

  /** Create a signed URL for temporary access */
  readonly createSignedUrl: (
    bucket: string,
    path: string,
    expiresIn: number,
    options?: { download?: string | boolean; transform?: TransformOptions }
  ) => Effect.Effect<string, SupabaseStorageError | SupabaseFileNotFoundError>

  /** Create a signed upload URL (token + path) for client-side uploads */
  readonly createSignedUploadUrl: (
    bucket: string,
    path: string,
    options?: { upsert?: boolean }
  ) => Effect.Effect<{ signedUrl: string; token: string; path: string }, SupabaseStorageError>

  /** Get public URL for a file */
  readonly getPublicUrl: (bucket: string, path: string) => Effect.Effect<string, never>

  /** List all buckets */
  readonly listBuckets: () => Effect.Effect<Bucket[], SupabaseStorageError>

  /** Get bucket details */
  readonly getBucket: (name: string) => Effect.Effect<Option.Option<Bucket>, SupabaseStorageError>

  /** Create a new bucket */
  readonly createBucket: (
    name: string,
    options?: {
      public?: boolean
      fileSizeLimit?: number
      allowedMimeTypes?: string[]
    }
  ) => Effect.Effect<StorageBucketResult, SupabaseStorageError>

  /** Delete a bucket (must be empty) */
  readonly deleteBucket: (
    name: string
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseBucketNotFoundError>
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * SupabaseStorage Service Tag
 *
 * Access via: yield* SupabaseStorage
 *
 * Requires: SupabaseClient
 *
 * Static layers:
 * - SupabaseStorage.Live - Production layer (requires SupabaseClient.Live)
 *
 * Test implementation lives in infra-storage (StorageService.Test)
 */
export class SupabaseStorage extends Context.Service<
  SupabaseStorage,
  SupabaseStorageServiceInterface
>()('@samuelho-dev/provider-supabase/SupabaseStorage') {
  /**
   * Create storage service from Supabase client
   */
  private static createService(client: SupabaseSDKClient) {
    return {
      upload: Effect.fn('SupabaseStorage.upload')(function* (
        bucket: string,
        path: string,
        file: Blob | File | ArrayBuffer | string,
        options?: FileOptions
      ) {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).upload(path, file, options),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Upload failed',
              operation: 'upload',
              bucket,
              path,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Bucket not found')) {
            return yield* new SupabaseBucketNotFoundError({
              retryable: false as const,
              message: `Bucket not found: ${bucket}`,
              bucket,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Upload failed',
            operation: 'upload',
            bucket,
            path,
            cause: error
          })
        }

        // SDK returns { id, path, fullPath } - return minimal StorageUploadResult
        // We don't need to fetch full FileObject since interface only requires name
        return {
          name: data.path,
          bucket_id: bucket
        }
      }, Effect.withSpan('SupabaseStorage.upload')),

      download: Effect.fn('SupabaseStorage.download')(function* (
        bucket: string,
        path: string,
        options?: { transform?: TransformOptions }
      ) {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).download(path, options),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Download failed',
              operation: 'download',
              bucket,
              path,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Object not found')) {
            return yield* new SupabaseFileNotFoundError({
              retryable: false as const,
              message: `File not found: ${path}`,
              bucket,
              path,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Download failed',
            operation: 'download',
            bucket,
            path,
            cause: error
          })
        }

        return data
      }, Effect.withSpan('SupabaseStorage.download')),

      remove: Effect.fn('SupabaseStorage.remove')(function* (bucket: string, paths: string[]) {
        const { error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).remove(paths),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Delete failed',
              operation: 'delete',
              bucket,
              cause: error
            })
        })

        if (error) {
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Delete failed',
            operation: 'delete',
            bucket,
            cause: error
          })
        }
      }, Effect.withSpan('SupabaseStorage.remove')),

      list: Effect.fn('SupabaseStorage.list')(function* (
        bucket: string,
        path?: string,
        options?: SearchOptions
      ) {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).list(path, options),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'List failed',
              operation: 'list',
              bucket,
              ...(path && { path }),
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Bucket not found')) {
            return yield* new SupabaseBucketNotFoundError({
              retryable: false as const,
              message: `Bucket not found: ${bucket}`,
              bucket,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'List failed',
            operation: 'list',
            bucket,
            ...(path && { path }),
            cause: error
          })
        }

        return data
      }, Effect.withSpan('SupabaseStorage.list')),

      move: Effect.fn('SupabaseStorage.move')(function* (
        bucket: string,
        fromPath: string,
        toPath: string
      ) {
        const { error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).move(fromPath, toPath),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Move failed',
              operation: 'move',
              bucket,
              path: fromPath,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Object not found')) {
            return yield* new SupabaseFileNotFoundError({
              retryable: false as const,
              message: `File not found: ${fromPath}`,
              bucket,
              path: fromPath,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Move failed',
            operation: 'move',
            bucket,
            path: fromPath,
            cause: error
          })
        }
      }, Effect.withSpan('SupabaseStorage.move')),

      copy: Effect.fn('SupabaseStorage.copy')(function* (
        bucket: string,
        fromPath: string,
        toPath: string
      ) {
        const { error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).copy(fromPath, toPath),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Copy failed',
              operation: 'copy',
              bucket,
              path: fromPath,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Object not found')) {
            return yield* new SupabaseFileNotFoundError({
              retryable: false as const,
              message: `File not found: ${fromPath}`,
              bucket,
              path: fromPath,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Copy failed',
            operation: 'copy',
            bucket,
            path: fromPath,
            cause: error
          })
        }
      }, Effect.withSpan('SupabaseStorage.copy')),

      createSignedUrl: Effect.fn('SupabaseStorage.createSignedUrl')(function* (
        bucket: string,
        path: string,
        expiresIn: number,
        options?: { download?: string | boolean; transform?: TransformOptions }
      ) {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.from(bucket).createSignedUrl(path, expiresIn, options),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Create signed URL failed',
              operation: 'createSignedUrl',
              bucket,
              path,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('Object not found')) {
            return yield* new SupabaseFileNotFoundError({
              retryable: false as const,
              message: `File not found: ${path}`,
              bucket,
              path,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Create signed URL failed',
            operation: 'createSignedUrl',
            bucket,
            path,
            cause: error
          })
        }

        return data.signedUrl
      }, Effect.withSpan('SupabaseStorage.createSignedUrl')),

      createSignedUploadUrl: Effect.fn('SupabaseStorage.createSignedUploadUrl')(function* (
        bucket: string,
        path: string,
        options?: { upsert?: boolean }
      ) {
        const { data, error } = yield* Effect.tryPromise({
          try: () =>
            client.storage
              .from(bucket)
              .createSignedUploadUrl(path, options?.upsert ? { upsert: true } : undefined),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Create signed upload URL failed',
              operation: 'createSignedUploadUrl',
              bucket,
              path,
              cause: error
            })
        })

        if (error) {
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Create signed upload URL failed',
            operation: 'createSignedUploadUrl',
            bucket,
            path,
            cause: error
          })
        }

        return {
          signedUrl: data.signedUrl,
          token: data.token,
          path: data.path
        }
      }, Effect.withSpan('SupabaseStorage.createSignedUploadUrl')),

      getPublicUrl: (bucket: string, path: string) =>
        Effect.sync(() => {
          const { data } = client.storage.from(bucket).getPublicUrl(path)
          return data.publicUrl
        }).pipe(Effect.withSpan('SupabaseStorage.getPublicUrl')),

      listBuckets: Effect.fn('SupabaseStorage.listBuckets')(function* () {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.listBuckets(),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'List buckets failed',
              operation: 'list',
              cause: error
            })
        })

        if (error) {
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'List buckets failed',
            operation: 'list',
            cause: error
          })
        }

        return data
      }, Effect.withSpan('SupabaseStorage.listBuckets')),

      getBucket: Effect.fn('SupabaseStorage.getBucket')(function* (name: string) {
        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.getBucket(name),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Get bucket failed',
              operation: 'getBucket',
              bucket: name,
              cause: error
            })
        })

        if (error) {
          // Bucket not found is not an error, just return None
          if (error.message?.includes('not found')) {
            return Option.none<Bucket>()
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Get bucket failed',
            operation: 'getBucket',
            bucket: name,
            cause: error
          })
        }

        return Option.some(data)
      }, Effect.withSpan('SupabaseStorage.getBucket')),

      createBucket: Effect.fn('SupabaseStorage.createBucket')(function* (
        name: string,
        options?: {
          public?: boolean
          fileSizeLimit?: number
          allowedMimeTypes?: string[]
        }
      ) {
        const bucketOptions = {
          public: options?.public ?? false,
          ...(options?.fileSizeLimit && {
            fileSizeLimit: options.fileSizeLimit
          }),
          ...(options?.allowedMimeTypes && {
            allowedMimeTypes: options.allowedMimeTypes
          })
        }

        const { data, error } = yield* Effect.tryPromise({
          try: () => client.storage.createBucket(name, bucketOptions),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Create bucket failed',
              operation: 'createBucket',
              bucket: name,
              cause: error
            })
        })

        if (error) {
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Create bucket failed',
            operation: 'createBucket',
            bucket: name,
            cause: error
          })
        }

        // Fetch full bucket data after creation
        const bucketResult = yield* Effect.tryPromise({
          try: () => client.storage.getBucket(name),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Failed to fetch created bucket details',
              operation: 'createBucket',
              bucket: name,
              cause: error
            })
        }).pipe(Effect.option)

        // Return full bucket data if available, otherwise minimal result
        const bucketData = bucketResult._tag === 'Some' ? bucketResult.value : null
        if (!bucketData?.data) {
          // Return minimal bucket if fetch fails
          return {
            id: data.name,
            name: data.name,
            public: options?.public ?? false
          }
        }
        return {
          id: bucketData.data.id,
          name: bucketData.data.name,
          public: bucketData.data.public,
          created_at: bucketData.data.created_at,
          updated_at: bucketData.data.updated_at
        }
      }, Effect.withSpan('SupabaseStorage.createBucket')),

      deleteBucket: Effect.fn('SupabaseStorage.deleteBucket')(function* (name: string) {
        const { error } = yield* Effect.tryPromise({
          try: () => client.storage.deleteBucket(name),
          catch: (error) =>
            new SupabaseStorageError({
              retryable: true as const,
              message: 'Delete bucket failed',
              operation: 'deleteBucket',
              bucket: name,
              cause: error
            })
        })

        if (error) {
          if (error.message?.includes('not found')) {
            return yield* new SupabaseBucketNotFoundError({
              retryable: false as const,
              message: `Bucket not found: ${name}`,
              bucket: name,
              cause: error
            })
          }
          return yield* new SupabaseStorageError({
            retryable: true as const,
            message: error.message || 'Delete bucket failed',
            operation: 'deleteBucket',
            bucket: name,
            cause: error
          })
        }
      }, Effect.withSpan('SupabaseStorage.deleteBucket'))
    }
  }

  static readonly Live = Layer.effect(
    SupabaseStorage,
    Effect.gen(function* () {
      const supabaseClient = yield* SupabaseClient
      const { url, serviceRoleKey } = supabaseClient.config

      // Storage runs SERVER-SIDE only and operates on PRIVATE buckets (previews,
      // products, tmp). It must use the service-role key: the anon client cannot
      // see private-bucket objects, so createSignedUrl returns "Object not found"
      // for them (the bug that broke 3D turntable signing while audio — which uses
      // pass-through absolute URLs — appeared to work). This privileged client is
      // built INSIDE the storage closure and never exposed via the SupabaseClient
      // interface, so the RLS-exempt client can't leak to other consumers or the
      // browser bundle. Fall back to anon only if no service key is configured
      // (degraded: private-bucket signing will fail, but public ops still work).
      const client = serviceRoleKey
        ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
        : yield* supabaseClient.getClient()

      return SupabaseStorage.createService(client)
    })
  )
}
