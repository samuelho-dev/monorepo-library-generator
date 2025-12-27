import { SupabaseStorage } from "@samuelho-dev/provider-supabase"
import type { DownloadOptions, SignedUrlOptions, StorageFile, UploadOptions } from "@samuelho-dev/provider-supabase"
import { Context, Effect, Layer } from "effect"
import {
  BucketNotFoundError,
  FileNotFoundError,
  FileSizeExceededError,
  InvalidFileTypeError,
  StorageError,
  UploadFailedError
} from "./errors"
import type { ListFilesOptions, ListFilesResult, StorageConfig, UploadResult } from "./types"

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
  readonly remove: (
    bucket: string,
    paths: ReadonlyArray<string>
  ) => Effect.Effect<void, StorageError>

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
   * Get public URL for a file
   */
  readonly getPublicUrl: (
    bucket: string,
    path: string
  ) => Effect.Effect<string, never>

  /**
   * Check if a file exists
   */
  readonly exists: (
    bucket: string,
    path: string
  ) => Effect.Effect<boolean, StorageError>
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Helper Functions (extracted for complexity reduction)
// ============================================================================

/**
 * Get file size from various input types
 */
const getFileSize = (file: Blob | File | ArrayBuffer | string): number => {
  if (file instanceof Blob) return file.size
  if (file instanceof ArrayBuffer) return file.byteLength
  if (typeof file === "string") return new Blob([file]).size
  return 0
}

/**
 * Get content type from file or options
 */
const getContentType = (
  file: Blob | File | ArrayBuffer | string,
  options?: UploadOptions
): string | undefined => options?.contentType || (file instanceof File ? file.type : undefined)

/**
 * Validate file size against config
 */
const validateFileSize = (
  size: number,
  config: StorageConfig
): Effect.Effect<void, FileSizeExceededError> => {
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
const validateMimeType = (
  contentType: string | undefined,
  config: StorageConfig
): Effect.Effect<void, InvalidFileTypeError> => {
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

/**
 * Map bucket not found error
 */
const mapBucketNotFoundError = (error: { message: string; bucket: string }) =>
  Effect.fail(
    new BucketNotFoundError({
      message: error.message,
      bucket: error.bucket,
      cause: error
    })
  )

/**
 * Map file not found error
 */
const mapFileNotFoundError = (error: { message: string; bucket: string; path: string }) =>
  Effect.fail(
    new FileNotFoundError({
      message: error.message,
      bucket: error.bucket,
      path: error.path,
      cause: error
    })
  )

/**
 * Map generic storage error
 */
const mapStorageError = (error: { message: string }) =>
  Effect.fail(
    new StorageError({
      message: error.message,
      cause: error
    })
  )

/**
 * Build list options from input options
 */
const buildListOptions = (options?: ListFilesOptions) => ({
  ...(options?.limit !== undefined && { limit: options.limit }),
  ...(options?.offset !== undefined && { offset: options.offset }),
  ...(options?.sortBy !== undefined && { sortBy: options.sortBy })
})

/**
 * Transform storage files to list result
 */
const buildListResult = (
  files: ReadonlyArray<StorageFile>,
  options?: ListFilesOptions
): ListFilesResult => {
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
export class StorageService extends Context.Tag("StorageService")<
  StorageService,
  StorageServiceInterface
>() {
  /**
   * Live layer - requires SupabaseStorage
   */
  static readonly Live = Layer.effect(
    StorageService,
    Effect.gen(function*() {
      const storage = yield* SupabaseStorage

      const config: StorageConfig = {
        signedUrlExpiresIn: 3600
      }

      /**
       * Validate file before upload
       */
      const validateFile = (
        file: Blob | File | ArrayBuffer | string,
        options?: UploadOptions
      ) =>
        Effect.gen(function*() {
          const size = getFileSize(file)
          yield* validateFileSize(size, config)
          const contentType = getContentType(file, options)
          yield* validateMimeType(contentType, config)
        })

      return {
        config,

        upload: (bucket, path, file, options) =>
          Effect.gen(function*() {
            yield* validateFile(file, options)

            const result = yield* storage.upload(bucket, path, file, options).pipe(
              Effect.catchTag("SupabaseBucketNotFoundError", mapBucketNotFoundError),
              Effect.catchAll((error) =>
                Effect.fail(
                  new UploadFailedError({
                    message: error.message,
                    bucket,
                    path,
                    cause: error
                  })
                )
              )
            )

            const publicUrl = yield* storage.getPublicUrl(bucket, path)

            return {
              path: result.name,
              bucket,
              publicUrl
            }
          }).pipe(Effect.withSpan("StorageService.upload")),

        download: (bucket, path, options) =>
          storage.download(bucket, path, options).pipe(
            Effect.catchTag("SupabaseFileNotFoundError", mapFileNotFoundError),
            Effect.catchAll(mapStorageError),
            Effect.withSpan("StorageService.download")
          ),

        remove: (bucket, paths) =>
          storage.remove(bucket, [...paths]).pipe(
            Effect.mapError((error) =>
              new StorageError({
                message: error.message,
                cause: error
              })
            ),
            Effect.withSpan("StorageService.remove")
          ),

        list: (bucket, options) =>
          Effect.gen(function*() {
            const listOptions = buildListOptions(options)

            const files = yield* storage
              .list(bucket, options?.prefix, listOptions)
              .pipe(
                Effect.catchTag("SupabaseBucketNotFoundError", mapBucketNotFoundError),
                Effect.catchAll(mapStorageError)
              )

            return buildListResult(files, options)
          }).pipe(Effect.withSpan("StorageService.list")),

        move: (bucket, fromPath, toPath) =>
          storage.move(bucket, fromPath, toPath).pipe(
            Effect.catchTag("SupabaseFileNotFoundError", mapFileNotFoundError),
            Effect.catchAll(mapStorageError),
            Effect.withSpan("StorageService.move")
          ),

        copy: (bucket, fromPath, toPath) =>
          storage.copy(bucket, fromPath, toPath).pipe(
            Effect.catchTag("SupabaseFileNotFoundError", mapFileNotFoundError),
            Effect.catchAll(mapStorageError),
            Effect.withSpan("StorageService.copy")
          ),

        createSignedUrl: (bucket, path, options) => {
          // Extract expiresIn as separate parameter for Supabase API
          const expiresIn = options?.expiresIn ?? config.signedUrlExpiresIn ?? 3600
          const signedUrlOptions = {
            ...(options?.download !== undefined && { download: options.download }),
            ...(options?.transform !== undefined && { transform: options.transform })
          }
          return storage
            .createSignedUrl(bucket, path, expiresIn, signedUrlOptions)
            .pipe(
              Effect.catchTag("SupabaseFileNotFoundError", mapFileNotFoundError),
              Effect.catchAll(mapStorageError),
              Effect.withSpan("StorageService.createSignedUrl")
            )
        },

        getPublicUrl: (bucket, path) =>
          storage.getPublicUrl(bucket, path).pipe(
            Effect.withSpan("StorageService.getPublicUrl")
          ),

        exists: (bucket, path) =>
          Effect.gen(function*() {
            const emptyFiles: ReadonlyArray<StorageFile> = []
            const files = yield* storage.list(bucket, path).pipe(
              Effect.catchAll(() => Effect.succeed(emptyFiles))
            )
            return files.some((f) => f.name === path.split("/").pop())
          }).pipe(Effect.withSpan("StorageService.exists"))
      }
    })
  )

  /**
   * Test layer with in-memory storage
   */
  static readonly Test = Layer.succeed(StorageService, {
    config: {
      signedUrlExpiresIn: 3600
    },

    upload: (bucket, path) =>
      Effect.succeed({
        path,
        bucket,
        publicUrl: `https://test.storage.co/${bucket}/${path}`
      }),

    download: () => Effect.succeed(new Blob(["test content"])),

    remove: () => Effect.void,

    list: () =>
      Effect.succeed({
        files: [{ name: "test-file.txt" }],
        hasMore: false
      }),

    move: () => Effect.void,

    copy: () => Effect.void,

    createSignedUrl: (bucket, path) => Effect.succeed(`https://test.storage.co/signed/${bucket}/${path}`),

    getPublicUrl: (bucket, path) => Effect.succeed(`https://test.storage.co/public/${bucket}/${path}`),

    exists: () => Effect.succeed(true)
  })

  /**
   * Dev layer with logging
   */
  static readonly Dev = Layer.effect(
    StorageService,
    Effect.gen(function*() {
      yield* Effect.logDebug("[StorageService] Initializing dev storage service...")

      return {
        config: { signedUrlExpiresIn: 3600 },

        upload: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] upload", { bucket, path })
            return {
              path,
              bucket,
              publicUrl: `https://dev.storage.co/${bucket}/${path}`
            }
          }),

        download: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] download", { bucket, path })
            return new Blob(["dev content"])
          }),

        remove: (bucket, paths) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] remove", { bucket, paths })
          }),

        list: (bucket, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] list", { bucket, options })
            return { files: [], hasMore: false }
          }),

        move: (bucket, fromPath, toPath) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] move", { bucket, fromPath, toPath })
          }),

        copy: (bucket, fromPath, toPath) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] copy", { bucket, fromPath, toPath })
          }),

        createSignedUrl: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] createSignedUrl", { bucket, path })
            return `https://dev.storage.co/signed/${bucket}/${path}`
          }),

        getPublicUrl: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] getPublicUrl", { bucket, path })
            return `https://dev.storage.co/public/${bucket}/${path}`
          }),

        exists: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[StorageService] exists", { bucket, path })
            return true
          })
      }
    })
  )
}
