// Only reads `env.NODE_ENV` (shared) to pick Live vs Test transport.
// Sourced from `env/client` so this infra lib stays runtime-agnostic
// and doesn't drag `@t3-oss/env-nextjs` (Next.js-specific) into
// non-Next consumers (Electron renderer, Node services, vitest).
import { env } from '@samuelho-dev/env/client'
import type {
  DownloadOptions,
  SignedUrlOptions,
  StorageFile,
  UploadOptions
} from '@samuelho-dev/provider-supabase'
import { SupabaseStorage } from '@samuelho-dev/provider-supabase'
import { Context, Effect, Layer, Option } from 'effect'
import {
  BucketNotFoundError,
  FileNotFoundError,
  FileSizeExceededError,
  InvalidFileTypeError,
  StorageError,
  UploadFailedError
} from './errors'
import type { ListFilesOptions, ListFilesResult, StorageConfig, UploadResult } from './types'

/**
 * Storage Infrastructure Service
 *
 * Storage service that orchestrates file storage providers.

Consumes SupabaseStorage from provider-supabase and provides:
- File upload with validation
- File download with transforms
- Bucket management
- Signed URL generation

This service provides a unified storage API for the application.
 *
 * @module @samuelho-dev/infra-storage/service
 */

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Storage Service Interface
 *
 * Provides file storage operations for the application.
 */
export interface StorageServiceInterface {
  /**
   * Configuration
   */
  readonly config: StorageConfig

  /**
   * Upload a file
   *
   * Validates file size and type before uploading.
   */
  readonly upload: (
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer | string,
    options?: UploadOptions
  ) => Effect.Effect<
    UploadResult,
    UploadFailedError | BucketNotFoundError | FileSizeExceededError | InvalidFileTypeError
  >

  /**
   * Download a file
   */
  readonly download: (
    bucket: string,
    path: string,
    options?: DownloadOptions
  ) => Effect.Effect<Blob, FileNotFoundError | StorageError>

  /**
   * Delete files
   */
  readonly remove: (bucket: string, paths: readonly string[]) => Effect.Effect<void, StorageError>

  /**
   * List files in a bucket
   */
  readonly list: (
    bucket: string,
    options?: ListFilesOptions
  ) => Effect.Effect<ListFilesResult, BucketNotFoundError | StorageError>

  /**
   * Move a file
   */
  readonly move: (
    bucket: string,
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, FileNotFoundError | StorageError>

  /**
   * Copy a file
   */
  readonly copy: (
    bucket: string,
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, FileNotFoundError | StorageError>

  /**
   * Create a signed URL for temporary access
   */
  readonly createSignedUrl: (
    bucket: string,
    path: string,
    options?: SignedUrlOptions
  ) => Effect.Effect<string, FileNotFoundError | StorageError>

  /**
   * Create a signed upload URL (token + path) for client-side uploads
   */
  readonly createPresignedUploadUrl: (
    bucket: string,
    path: string,
    expiresIn?: number
  ) => Effect.Effect<{ token: string; path: string }, StorageError>

  /**
   * Get public URL for a file
   */
  readonly getPublicUrl: (bucket: string, path: string) => Effect.Effect<string, never>

  /**
   * Check if a file exists
   */
  readonly exists: (bucket: string, path: string) => Effect.Effect<boolean, StorageError>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get file size from various input types
 */
const getFileSize = (file: Blob | File | ArrayBuffer | string) => {
  if (file instanceof Blob) return file.size
  if (file instanceof ArrayBuffer) return file.byteLength
  if (typeof file === 'string') return new Blob([file]).size
  return 0
}

/**
 * Get content type from file or options
 */
const getContentType = (file: Blob | File | ArrayBuffer | string, options?: UploadOptions) =>
  options?.contentType || (file instanceof File ? file.type : undefined)

/**
 * Validate file size against config
 */
const validateFileSize = (size: number, config: StorageConfig) => {
  if (config.maxFileSize && size > config.maxFileSize) {
    return Effect.fail(
      new FileSizeExceededError({
        message: `File size ${size} exceeds maximum ${config.maxFileSize}`,
        maxSize: config.maxFileSize,
        actualSize: size
      })
    )
  }
  return Effect.void
}

/**
 * Validate file MIME type against config
 */
const validateMimeType = (contentType: string | undefined, config: StorageConfig) => {
  if (config.allowedMimeTypes && contentType) {
    if (!config.allowedMimeTypes.includes(contentType)) {
      return Effect.fail(
        new InvalidFileTypeError({
          message: `File type ${contentType} is not allowed`,
          allowedTypes: config.allowedMimeTypes,
          actualType: contentType
        })
      )
    }
  }
  return Effect.void
}

// ============================================================================
// Service Definition
// ============================================================================

/**
 * Storage Service Tag
 *
 * Access via: yield* StorageService
 *
 * Requires: SupabaseStorage (from provider-supabase)
 */
export class StorageService extends Context.Service<StorageService, StorageServiceInterface>()(
  '@samuelho-dev/infra-storage/StorageService'
) {
  /**
   * Live layer - requires SupabaseStorage
   */
  static readonly Live = Layer.effect(
    StorageService,
    Effect.gen(function* () {
      const storage = yield* SupabaseStorage

      const config: StorageConfig = {
        signedUrlExpiresIn: 3600
      }

      /**
       * Validate file before upload
       */
      const validateFile = (file: Blob | File | ArrayBuffer | string, options?: UploadOptions) =>
        Effect.gen(function* () {
          const size = getFileSize(file)
          yield* validateFileSize(size, config)
          const contentType = getContentType(file, options)
          yield* validateMimeType(contentType, config)
        })

      return {
        config,

        upload: Effect.fn('StorageService.upload')(function* (bucket, path, file, options) {
          yield* validateFile(file, options)

          const result = yield* storage.upload(bucket, path, file, options).pipe(
            Effect.catchTags({
              SupabaseBucketNotFoundError: (error) =>
                Effect.fail(
                  new BucketNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new UploadFailedError({
                    message: error.message,
                    bucket,
                    path,
                    cause: error
                  })
                )
            })
          )

          const publicUrl = yield* storage.getPublicUrl(bucket, path)

          return {
            path: result.name,
            bucket,
            publicUrl
          }
        }, Effect.withSpan('StorageService.upload')),

        download: (bucket, path, options) =>
          storage.download(bucket, path, options).pipe(
            Effect.catchTags({
              SupabaseFileNotFoundError: (error) =>
                Effect.fail(
                  new FileNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    path: error.path,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new StorageError({
                    message: error.message,
                    cause: error
                  })
                )
            }),
            Effect.withSpan('StorageService.download')
          ),

        remove: (bucket, paths) =>
          storage.remove(bucket, [...paths]).pipe(
            Effect.mapError(
              (error) =>
                new StorageError({
                  message: error.message,
                  cause: error
                })
            ),
            Effect.withSpan('StorageService.remove')
          ),

        list: Effect.fn('StorageService.list')(function* (bucket, options) {
          const listOptions = {
            ...(options?.limit && { limit: options.limit }),
            ...(options?.offset && { offset: options.offset }),
            ...(options?.sortBy && { sortBy: options.sortBy })
          }

          const files = yield* storage.list(bucket, options?.prefix, listOptions).pipe(
            Effect.catchTags({
              SupabaseBucketNotFoundError: (error) =>
                Effect.fail(
                  new BucketNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new StorageError({
                    message: error.message,
                    cause: error
                  })
                )
            })
          )

          const limit = options?.limit ?? 100
          const hasMore = files.length === limit
          return {
            files: files.map((f) => ({
              name: f.name,
              ...(f.id && { id: f.id }),
              ...(f.created_at && { created_at: f.created_at }),
              ...(f.updated_at && { updated_at: f.updated_at })
            })),
            hasMore,
            ...(hasMore && { nextOffset: (options?.offset ?? 0) + limit })
          }
        }, Effect.withSpan('StorageService.list')),

        move: (bucket, fromPath, toPath) =>
          storage.move(bucket, fromPath, toPath).pipe(
            Effect.catchTags({
              SupabaseFileNotFoundError: (error) =>
                Effect.fail(
                  new FileNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    path: error.path,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new StorageError({
                    message: error.message,
                    cause: error
                  })
                )
            }),
            Effect.withSpan('StorageService.move')
          ),

        copy: (bucket, fromPath, toPath) =>
          storage.copy(bucket, fromPath, toPath).pipe(
            Effect.catchTags({
              SupabaseFileNotFoundError: (error) =>
                Effect.fail(
                  new FileNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    path: error.path,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new StorageError({
                    message: error.message,
                    cause: error
                  })
                )
            }),
            Effect.withSpan('StorageService.copy')
          ),

        createPresignedUploadUrl: (bucket, path) =>
          storage.createSignedUploadUrl(bucket, path).pipe(
            Effect.mapError(
              (error) =>
                new StorageError({
                  message: error.message,
                  cause: error
                })
            ),
            Effect.withSpan('StorageService.createPresignedUploadUrl')
          ),

        createSignedUrl: (bucket, path, options) => {
          // Extract expiresIn as separate parameter for Supabase API
          const expiresIn = options?.expiresIn ?? config.signedUrlExpiresIn ?? 3600
          const signedUrlOptions = {
            ...(options?.download && { download: options.download }),
            ...(options?.transform && { transform: options.transform })
          }
          return storage.createSignedUrl(bucket, path, expiresIn, signedUrlOptions).pipe(
            Effect.catchTags({
              SupabaseFileNotFoundError: (error) =>
                Effect.fail(
                  new FileNotFoundError({
                    message: error.message,
                    bucket: error.bucket,
                    path: error.path,
                    cause: error
                  })
                ),
              SupabaseStorageError: (error) =>
                Effect.fail(
                  new StorageError({
                    message: error.message,
                    cause: error
                  })
                )
            }),
            Effect.withSpan('StorageService.createSignedUrl')
          )
        },

        getPublicUrl: (bucket, path) =>
          storage.getPublicUrl(bucket, path).pipe(Effect.withSpan('StorageService.getPublicUrl')),

        exists: Effect.fn('StorageService.exists')(function* (bucket, path) {
          const emptyFiles: readonly StorageFile[] = []
          const files = yield* storage
            .list(bucket, path)
            .pipe(Effect.option, Effect.map(Option.getOrElse(() => emptyFiles)))
          return files.some((f) => f.name === path.split('/').pop())
        }, Effect.withSpan('StorageService.exists'))
      }
    })
  )

  /**
   * Test layer with in-memory storage. Each `Layer.fresh(StorageService.Test)`
   * gets its own isolated store so tests don't leak state.
   */
  static readonly Test = Layer.effect(
    StorageService,
    Effect.sync(() => {
      /** bucket -> path -> Blob */
      const store = new Map<string, Map<string, Blob>>()

      const bucketStore = (bucket: string): Map<string, Blob> => {
        let m = store.get(bucket)
        if (!m) {
          m = new Map()
          store.set(bucket, m)
        }
        return m
      }

      const toBlob = (file: Blob | File | ArrayBuffer | string): Blob => {
        if (file instanceof Blob) return file
        if (file instanceof ArrayBuffer) return new Blob([file])
        if (typeof file === 'string') return new Blob([file])
        return new Blob([])
      }

      const requireBlob = (bucket: string, path: string): Effect.Effect<Blob, FileNotFoundError> =>
        Effect.suspend(() => {
          const blob = bucketStore(bucket).get(path)
          if (!blob) {
            return Effect.fail(
              new FileNotFoundError({
                message: `File not found: ${bucket}/${path}`,
                bucket,
                path
              })
            )
          }
          return Effect.succeed(blob)
        })

      return {
        config: {
          signedUrlExpiresIn: 3600
        },

        upload: (bucket, path, file) =>
          Effect.sync(() => {
            bucketStore(bucket).set(path, toBlob(file))
            return {
              path,
              bucket,
              publicUrl: `https://test.storage.co/${bucket}/${path}`
            }
          }),

        download: (bucket, path) => requireBlob(bucket, path),

        remove: (bucket, paths) =>
          Effect.sync(() => {
            const m = bucketStore(bucket)
            for (const p of paths) {
              m.delete(p)
            }
          }),

        list: (bucket, options) =>
          Effect.sync(() => {
            const m = bucketStore(bucket)
            const prefix = options?.prefix ?? ''
            const limit = options?.limit ?? 100
            const offset = options?.offset ?? 0

            const filtered = [...m.keys()].filter((k) => k.startsWith(prefix)).sort()
            const matched = filtered.slice(offset, offset + limit)
            const hasMore = filtered.length > offset + limit

            return {
              files: matched.map((name) => ({ name })),
              hasMore,
              ...(hasMore ? { nextOffset: offset + limit } : {})
            }
          }),

        move: (bucket, fromPath, toPath) =>
          requireBlob(bucket, fromPath).pipe(
            Effect.tap((blob) =>
              Effect.sync(() => {
                const m = bucketStore(bucket)
                m.set(toPath, blob)
                m.delete(fromPath)
              })
            ),
            Effect.asVoid
          ),

        copy: (bucket, fromPath, toPath) =>
          requireBlob(bucket, fromPath).pipe(
            Effect.tap((blob) => Effect.sync(() => bucketStore(bucket).set(toPath, blob))),
            Effect.asVoid
          ),

        createSignedUrl: (bucket, path) =>
          Effect.succeed(`https://test.storage.co/signed/${bucket}/${path}`),

        createPresignedUploadUrl: (bucket, path) =>
          Effect.succeed({
            token: `test-upload-token:${bucket}`,
            path
          }),

        getPublicUrl: (bucket, path) =>
          Effect.succeed(`https://test.storage.co/public/${bucket}/${path}`),

        exists: (bucket, path) => Effect.sync(() => bucketStore(bucket).has(path))
      }
    })
  )

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "test" → Test (in-memory mock)
   * - else → Live (requires SupabaseStorage)
   */
  static readonly Auto = Layer.suspend(() =>
    env.NODE_ENV === 'test' ? StorageService.Test : StorageService.Live
  )
}

// Re-export getPublicUrl utility for convenience
export { getPublicUrl } from './validation'
