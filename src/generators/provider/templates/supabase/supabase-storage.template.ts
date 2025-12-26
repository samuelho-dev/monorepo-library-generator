/**
 * Supabase Storage Service Template
 *
 * Generates the SupabaseStorage service for file storage operations.
 * Wraps Supabase Storage API with Effect error handling.
 *
 * @module monorepo-library-generator/provider/templates/supabase/storage
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate SupabaseStorage service file
 */
export function generateSupabaseStorageServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "SupabaseStorage Service",
    description: `Supabase storage provider with Effect integration.

Wraps Supabase Storage API for:
- File upload/download
- Bucket management
- Signed URLs for secure access

This service is consumed by infra-storage for file operations.`,
    module: `${packageName}/service/storage`,
    see: ["https://supabase.com/docs/reference/javascript/storage-api"]
  })
  builder.addBlankLine()

  // Imports - use native types from @supabase/storage-js
  builder.addImports([
    {
      from: "@supabase/storage-js",
      imports: ["Bucket", "FileObject", "FileOptions", "SearchOptions", "TransformOptions"],
      isTypeOnly: true
    },
    {
      from: "@supabase/supabase-js",
      imports: [{ name: "SupabaseClient", alias: "SupabaseSDKClient" }],
      isTypeOnly: true
    },
    { from: "effect", imports: ["Context", "Effect", "Layer", "Option"] },
    { from: "./client", imports: ["SupabaseClient"] },
    { from: "./errors", imports: ["SupabaseBucketNotFoundError", "SupabaseFileNotFoundError", "SupabaseStorageError"] }
  ])

  // Result Types
  builder.addSectionComment("Result Types")
  builder.addBlankLine()

  builder.addRaw(`/**
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
}`)
  builder.addBlankLine()

  // Service interface
  builder.addSectionComment("Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
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
  readonly remove: (
    bucket: string,
    paths: Array<string>
  ) => Effect.Effect<void, SupabaseStorageError>

  /** List files in a bucket */
  readonly list: (
    bucket: string,
    path?: string,
    options?: SearchOptions
  ) => Effect.Effect<Array<FileObject>, SupabaseStorageError | SupabaseBucketNotFoundError>

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

  /** Get public URL for a file */
  readonly getPublicUrl: (
    bucket: string,
    path: string
  ) => Effect.Effect<string, never>

  /** List all buckets */
  readonly listBuckets: () => Effect.Effect<Array<Bucket>, SupabaseStorageError>

  /** Get bucket details */
  readonly getBucket: (
    name: string
  ) => Effect.Effect<Option.Option<Bucket>, SupabaseStorageError>

  /** Create a new bucket */
  readonly createBucket: (
    name: string,
    options?: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: Array<string> }
  ) => Effect.Effect<StorageBucketResult, SupabaseStorageError>

  /** Delete a bucket (must be empty) */
  readonly deleteBucket: (
    name: string
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseBucketNotFoundError>
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * SupabaseStorage Service Tag
 *
 * Access via: yield* SupabaseStorage
 *
 * Requires: SupabaseClient
 *
 * Static layers:
 * - SupabaseStorage.Live - Production layer (requires SupabaseClient.Live)
 * - SupabaseStorage.Test - Test layer with in-memory storage
 * - SupabaseStorage.Dev - Development with debug logging
 */
export class SupabaseStorage extends Context.Tag("SupabaseStorage")<
  SupabaseStorage,
  SupabaseStorageServiceInterface
>() {
  /**
   * Create storage service from Supabase client
   */
  private static createService(client: SupabaseSDKClient) {
    return {
      upload: (bucket: string, path: string, file: Blob | File | ArrayBuffer | string, options?: FileOptions) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).upload(path, file, options),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Upload failed",
                operation: "upload",
                bucket,
                path,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Bucket not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: \`Bucket not found: \${bucket}\`,
                  bucket,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Upload failed",
                operation: "upload",
                bucket,
                path,
                cause: error
              })
            )
          }

          // SDK returns { id, path, fullPath } - return minimal StorageUploadResult
          // We don't need to fetch full FileObject since interface only requires name
          return {
            name: data.path,
            bucket_id: bucket
          }
        }).pipe(Effect.withSpan("SupabaseStorage.upload")),

      download: (bucket: string, path: string, options?: { transform?: TransformOptions }) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).download(path, options),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Download failed",
                operation: "download",
                bucket,
                path,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: \`File not found: \${path}\`,
                  bucket,
                  path,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Download failed",
                operation: "download",
                bucket,
                path,
                cause: error
              })
            )
          }

          return data
        }).pipe(Effect.withSpan("SupabaseStorage.download")),

      remove: (bucket: string, paths: Array<string>) =>
        Effect.gen(function*() {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).remove(paths),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Delete failed",
                operation: "delete",
                bucket,
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Delete failed",
                operation: "delete",
                bucket,
                cause: error
              })
            )
          }
        }).pipe(Effect.withSpan("SupabaseStorage.remove")),

      list: (bucket: string, path?: string, options?: SearchOptions) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).list(path, options),
            catch: (error) =>
              new SupabaseStorageError({
                message: "List failed",
                operation: "list",
                bucket,
                ...(path && { path }),
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Bucket not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: \`Bucket not found: \${bucket}\`,
                  bucket,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "List failed",
                operation: "list",
                bucket,
                ...(path && { path }),
                cause: error
              })
            )
          }

          return data
        }).pipe(Effect.withSpan("SupabaseStorage.list")),

      move: (bucket: string, fromPath: string, toPath: string) =>
        Effect.gen(function*() {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).move(fromPath, toPath),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Move failed",
                operation: "move",
                bucket,
                path: fromPath,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: \`File not found: \${fromPath}\`,
                  bucket,
                  path: fromPath,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Move failed",
                operation: "move",
                bucket,
                path: fromPath,
                cause: error
              })
            )
          }
        }).pipe(Effect.withSpan("SupabaseStorage.move")),

      copy: (bucket: string, fromPath: string, toPath: string) =>
        Effect.gen(function*() {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).copy(fromPath, toPath),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Copy failed",
                operation: "copy",
                bucket,
                path: fromPath,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: \`File not found: \${fromPath}\`,
                  bucket,
                  path: fromPath,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Copy failed",
                operation: "copy",
                bucket,
                path: fromPath,
                cause: error
              })
            )
          }
        }).pipe(Effect.withSpan("SupabaseStorage.copy")),

      createSignedUrl: (bucket: string, path: string, expiresIn: number, options?: { download?: string | boolean; transform?: TransformOptions }) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).createSignedUrl(path, expiresIn, options),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Create signed URL failed",
                operation: "createSignedUrl",
                bucket,
                path,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: \`File not found: \${path}\`,
                  bucket,
                  path,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Create signed URL failed",
                operation: "createSignedUrl",
                bucket,
                path,
                cause: error
              })
            )
          }

          return data.signedUrl
        }).pipe(Effect.withSpan("SupabaseStorage.createSignedUrl")),

      getPublicUrl: (bucket: string, path: string) =>
        Effect.sync(() => {
          const { data } = client.storage.from(bucket).getPublicUrl(path)
          return data.publicUrl
        }).pipe(Effect.withSpan("SupabaseStorage.getPublicUrl")),

      listBuckets: () =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.listBuckets(),
            catch: (error) =>
              new SupabaseStorageError({
                message: "List buckets failed",
                operation: "list",
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "List buckets failed",
                operation: "list",
                cause: error
              })
            )
          }

          return data
        }).pipe(Effect.withSpan("SupabaseStorage.listBuckets")),

      getBucket: (name: string) =>
        Effect.gen(function*() {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.getBucket(name),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Get bucket failed",
                operation: "getBucket",
                bucket: name,
                cause: error
              })
          })

          if (error) {
            // Bucket not found is not an error, just return None
            if (error.message?.includes("not found")) {
              return Option.none<Bucket>()
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Get bucket failed",
                operation: "getBucket",
                bucket: name,
                cause: error
              })
            )
          }

          return Option.some(data)
        }).pipe(Effect.withSpan("SupabaseStorage.getBucket")),

      createBucket: (name: string, options?: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: Array<string> }) =>
        Effect.gen(function*() {
          const bucketOptions = {
            public: options?.public ?? false,
            ...(options?.fileSizeLimit !== undefined && { fileSizeLimit: options.fileSizeLimit }),
            ...(options?.allowedMimeTypes !== undefined && { allowedMimeTypes: options.allowedMimeTypes }),
          }

          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.createBucket(name, bucketOptions),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Create bucket failed",
                operation: "createBucket",
                bucket: name,
                cause: error
              })
          })

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Create bucket failed",
                operation: "createBucket",
                bucket: name,
                cause: error
              })
            )
          }

          // Fetch full bucket data after creation
          const bucketResult = yield* Effect.tryPromise({
            try: () => client.storage.getBucket(name),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Failed to fetch created bucket details",
                operation: "createBucket",
                bucket: name,
                cause: error
              })
          }).pipe(Effect.option)

          // Return full bucket data if available, otherwise minimal result
          const bucketData = bucketResult._tag === "Some" ? bucketResult.value : null
          if (!bucketData?.data) {
            // Return minimal bucket if fetch fails
            return { id: data.name, name: data.name, public: options?.public ?? false }
          }
          return {
            id: bucketData.data.id,
            name: bucketData.data.name,
            public: bucketData.data.public,
            created_at: bucketData.data.created_at,
            updated_at: bucketData.data.updated_at
          }
        }).pipe(Effect.withSpan("SupabaseStorage.createBucket")),

      deleteBucket: (name: string) =>
        Effect.gen(function*() {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.deleteBucket(name),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Delete bucket failed",
                operation: "deleteBucket",
                bucket: name,
                cause: error
              })
          })

          if (error) {
            if (error.message?.includes("not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: \`Bucket not found: \${name}\`,
                  bucket: name,
                  cause: error
                })
              )
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Delete bucket failed",
                operation: "deleteBucket",
                bucket: name,
                cause: error
              })
            )
          }
        }).pipe(Effect.withSpan("SupabaseStorage.deleteBucket")),
    }
  }

  /**
   * Live layer - requires SupabaseClient
   */
  static readonly Live = Layer.effect(
    SupabaseStorage,
    Effect.gen(function*() {
      const supabaseClient = yield* SupabaseClient;
      const client = yield* supabaseClient.getClient()
      return SupabaseStorage.createService(client)
    })
  )

  /**
   * Test layer with in-memory storage
   */
  static readonly Test = Layer.sync(SupabaseStorage, () => {
    // In-memory storage for testing
    const buckets = new Map<string, { public: boolean; files: Map<string, Blob> }>()
    buckets.set("test-bucket", { public: false, files: new Map() })

    return {
      upload: (bucket, path, file) =>
        Effect.gen(function*() {
          const bucketData = buckets.get(bucket)
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: \`Bucket not found: \${bucket}\`,
                bucket
              })
            )
          }
          const blob = file instanceof Blob ? file : new Blob([file])
          bucketData.files.set(path, blob)
          // Return minimal StorageFile - name is required field
          return { name: path }
        }),

      download: (bucket, path) =>
        Effect.gen(function*() {
          const bucketData = buckets.get(bucket)
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: \`Bucket not found: \${bucket}\`,
                operation: "download",
                bucket,
                path
              })
            )
          }
          const file = bucketData.files.get(path)
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: \`File not found: \${path}\`,
                bucket,
                path
              })
            )
          }
          return file
        }),

      remove: (bucket, paths) =>
        Effect.sync(() => {
          const bucketData = buckets.get(bucket)
          if (bucketData) {
            for (const path of paths) {
              bucketData.files.delete(path)
            }
          }
        }),

      list: (bucket) =>
        Effect.gen(function*() {
          const bucketData = buckets.get(bucket)
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: \`Bucket not found: \${bucket}\`,
                bucket
              })
            )
          }
          // Test layer returns empty array - tests should mock specific responses if needed
          return []
        }),

      move: (bucket, fromPath, toPath) =>
        Effect.gen(function*() {
          const bucketData = buckets.get(bucket)
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: \`Bucket not found: \${bucket}\`,
                operation: "move",
                bucket,
                path: fromPath
              })
            )
          }
          const file = bucketData.files.get(fromPath)
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: \`File not found: \${fromPath}\`,
                bucket,
                path: fromPath
              })
            )
          }
          bucketData.files.delete(fromPath)
          bucketData.files.set(toPath, file)
        }),

      copy: (bucket, fromPath, toPath) =>
        Effect.gen(function*() {
          const bucketData = buckets.get(bucket)
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: \`Bucket not found: \${bucket}\`,
                operation: "copy",
                bucket,
                path: fromPath
              })
            )
          }
          const file = bucketData.files.get(fromPath)
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: \`File not found: \${fromPath}\`,
                bucket,
                path: fromPath
              })
            )
          }
          bucketData.files.set(toPath, file)
        }),

      createSignedUrl: (bucket, path, expiresIn, options) =>
        Effect.succeed(\`https://test.supabase.co/storage/v1/object/sign/\${bucket}/\${path}?expiresIn=\${expiresIn}\${options?.download ? "&download=true" : ""}\`),

      getPublicUrl: (bucket, path) =>
        Effect.succeed(\`https://test.supabase.co/storage/v1/object/public/\${bucket}/\${path}\`),

      listBuckets: () =>
        Effect.succeed(
          Array.from(buckets.keys()).map((name) => ({
            id: name,
            name,
            owner: "test-owner",
            public: buckets.get(name)?.public ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        ),

      getBucket: (name) =>
        Effect.succeed(
          buckets.has(name)
            ? Option.some({
                id: name,
                name,
                owner: "test-owner",
                public: buckets.get(name)?.public ?? false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            : Option.none()
        ),

      createBucket: (name, options) =>
        Effect.sync(() => {
          buckets.set(name, { public: options?.public ?? false, files: new Map() })
          return {
            id: name,
            name,
            public: options?.public ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }),

      deleteBucket: (name) =>
        Effect.gen(function*() {
          if (!buckets.has(name)) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: \`Bucket not found: \${name}\`,
                bucket: name
              })
            )
          }
          buckets.delete(name)
        }),
    }
  })

  /**
   * Dev layer with debug logging
   */
  static readonly Dev = Layer.effect(
    SupabaseStorage,
    Effect.gen(function*() {
      yield* Effect.logDebug("[SupabaseStorage] Initializing dev storage service...")

      // Use test layer as base with logging
      const testService = (yield* Layer.build(SupabaseStorage.Test)).pipe(
        Context.get(SupabaseStorage)
      )

      return {
        upload: (bucket, path, file, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] upload", { bucket, path, options })
            return yield* testService.upload(bucket, path, file, options)
          }),

        download: (bucket, path, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] download", { bucket, path, options })
            return yield* testService.download(bucket, path, options)
          }),

        remove: (bucket, paths) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] remove", { bucket, paths })
            return yield* testService.remove(bucket, paths)
          }),

        list: (bucket, path, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] list", { bucket, path, options })
            return yield* testService.list(bucket, path, options)
          }),

        move: (bucket, fromPath, toPath) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] move", { bucket, fromPath, toPath })
            return yield* testService.move(bucket, fromPath, toPath)
          }),

        copy: (bucket, fromPath, toPath) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] copy", { bucket, fromPath, toPath })
            return yield* testService.copy(bucket, fromPath, toPath)
          }),

        createSignedUrl: (bucket, path, expiresIn, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] createSignedUrl", { bucket, path, expiresIn, options })
            return yield* testService.createSignedUrl(bucket, path, expiresIn, options)
          }),

        getPublicUrl: (bucket, path) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] getPublicUrl", { bucket, path })
            return yield* testService.getPublicUrl(bucket, path)
          }),

        listBuckets: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] listBuckets")
            return yield* testService.listBuckets()
          }),

        getBucket: (name) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] getBucket", { name })
            return yield* testService.getBucket(name)
          }),

        createBucket: (name, options) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] createBucket", { name, options })
            return yield* testService.createBucket(name, options)
          }),

        deleteBucket: (name) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[SupabaseStorage] deleteBucket", { name })
            return yield* testService.deleteBucket(name)
          })
      } ;
    })
  )
}`)

  return builder.toString()
}
