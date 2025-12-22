import { Context, Effect, Layer, Option } from "effect";
import {
  SupabaseBucketNotFoundError,
  SupabaseFileNotFoundError,
  SupabaseStorageError,
} from "../errors";

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
 * @module @myorg/provider-supabase/service/storage
 * @see https://supabase.com/docs/reference/javascript/storage-api
 */

import type { SupabaseClient as SupabaseSDKClient } from "@supabase/supabase-js";
import type {
  DownloadOptions,
  SignedUrlOptions,
  StorageBucket,
  StorageFile,
  UploadOptions,
} from "../types";
import { SupabaseClient } from "./client";

// ============================================================================
// Service Interface
// ============================================================================

/**
 * SupabaseStorage Service Interface
 *
 * Provides file storage operations wrapped in Effect.
 */
export interface SupabaseStorageServiceInterface {
  /**
   * Upload a file to storage
   *
   * @param bucket - Bucket name
   * @param path - File path within the bucket
   * @param file - File data (Blob, File, ArrayBuffer, or string)
   * @param options - Upload options
   */
  readonly upload: (
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer | string,
    options?: UploadOptions,
  ) => Effect.Effect<StorageFile, SupabaseStorageError | SupabaseBucketNotFoundError>;

  /**
   * Download a file from storage
   *
   * @param bucket - Bucket name
   * @param path - File path within the bucket
   * @param options - Download options (transforms)
   */
  readonly download: (
    bucket: string,
    path: string,
    options?: DownloadOptions,
  ) => Effect.Effect<Blob, SupabaseStorageError | SupabaseFileNotFoundError>;

  /**
   * Delete a file from storage
   *
   * @param bucket - Bucket name
   * @param paths - File paths to delete
   */
  readonly remove: (bucket: string, paths: string[]) => Effect.Effect<void, SupabaseStorageError>;

  /**
   * List files in a bucket
   *
   * @param bucket - Bucket name
   * @param path - Optional path prefix
   * @param options - List options
   */
  readonly list: (
    bucket: string,
    path?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: "asc" | "desc" };
    },
  ) => Effect.Effect<StorageFile[], SupabaseStorageError | SupabaseBucketNotFoundError>;

  /**
   * Move a file to a new location
   *
   * @param bucket - Bucket name
   * @param fromPath - Current file path
   * @param toPath - New file path
   */
  readonly move: (
    bucket: string,
    fromPath: string,
    toPath: string,
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseFileNotFoundError>;

  /**
   * Copy a file to a new location
   *
   * @param bucket - Bucket name
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   */
  readonly copy: (
    bucket: string,
    fromPath: string,
    toPath: string,
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseFileNotFoundError>;

  /**
   * Create a signed URL for temporary access
   *
   * @param bucket - Bucket name
   * @param path - File path
   * @param options - Signed URL options
   */
  readonly createSignedUrl: (
    bucket: string,
    path: string,
    options: SignedUrlOptions,
  ) => Effect.Effect<string, SupabaseStorageError | SupabaseFileNotFoundError>;

  /**
   * Get public URL for a file
   *
   * @param bucket - Bucket name (must be public)
   * @param path - File path
   */
  readonly getPublicUrl: (bucket: string, path: string) => Effect.Effect<string, never>;

  /**
   * List all buckets
   */
  readonly listBuckets: () => Effect.Effect<StorageBucket[], SupabaseStorageError>;

  /**
   * Get bucket details
   *
   * @param name - Bucket name
   */
  readonly getBucket: (
    name: string,
  ) => Effect.Effect<Option.Option<StorageBucket>, SupabaseStorageError>;

  /**
   * Create a new bucket
   *
   * @param name - Bucket name
   * @param options - Bucket options
   */
  readonly createBucket: (
    name: string,
    options?: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] },
  ) => Effect.Effect<StorageBucket, SupabaseStorageError>;

  /**
   * Delete a bucket (must be empty)
   *
   * @param name - Bucket name
   */
  readonly deleteBucket: (
    name: string,
  ) => Effect.Effect<void, SupabaseStorageError | SupabaseBucketNotFoundError>;
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
  private static createService(client: SupabaseSDKClient): SupabaseStorageServiceInterface {
    return {
      upload: (bucket, path, file, options) =>
        Effect.gen(function* () {
          const uploadOptions = options
            ? {
                ...(options.cacheControl && { cacheControl: options.cacheControl }),
                ...(options.contentType && { contentType: options.contentType }),
                ...(options.upsert !== undefined && { upsert: options.upsert }),
              }
            : undefined;

          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).upload(path, file, uploadOptions),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Upload failed",
                operation: "upload",
                bucket,
                path,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Bucket not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: `Bucket not found: ${bucket}`,
                  bucket,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Upload failed",
                operation: "upload",
                bucket,
                path,
                cause: error,
              }),
            );
          }

          return { name: data.path } as StorageFile;
        }).pipe(Effect.withSpan("SupabaseStorage.upload")),

      download: (bucket, path, options) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              options?.transform
                ? client.storage.from(bucket).download(path, { transform: options.transform })
                : client.storage.from(bucket).download(path),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Download failed",
                operation: "download",
                bucket,
                path,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: `File not found: ${path}`,
                  bucket,
                  path,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Download failed",
                operation: "download",
                bucket,
                path,
                cause: error,
              }),
            );
          }

          return data;
        }).pipe(Effect.withSpan("SupabaseStorage.download")),

      remove: (bucket, paths) =>
        Effect.gen(function* () {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).remove(paths),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Delete failed",
                operation: "delete",
                bucket,
                cause: error,
              }),
          });

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Delete failed",
                operation: "delete",
                bucket,
                cause: error,
              }),
            );
          }
        }).pipe(Effect.withSpan("SupabaseStorage.remove")),

      list: (bucket, path, options) =>
        Effect.gen(function* () {
          const listOptions = options
            ? {
                ...(options.limit !== undefined && { limit: options.limit }),
                ...(options.offset !== undefined && { offset: options.offset }),
                ...(options.sortBy && { sortBy: options.sortBy }),
              }
            : undefined;

          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).list(path, listOptions),
            catch: (error) =>
              new SupabaseStorageError({
                message: "List failed",
                operation: "list",
                bucket,
                ...(path && { path }),
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Bucket not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: `Bucket not found: ${bucket}`,
                  bucket,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "List failed",
                operation: "list",
                bucket,
                ...(path && { path }),
                cause: error,
              }),
            );
          }

          return data as StorageFile[];
        }).pipe(Effect.withSpan("SupabaseStorage.list")),

      move: (bucket, fromPath, toPath) =>
        Effect.gen(function* () {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).move(fromPath, toPath),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Move failed",
                operation: "move",
                bucket,
                path: fromPath,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: `File not found: ${fromPath}`,
                  bucket,
                  path: fromPath,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Move failed",
                operation: "move",
                bucket,
                path: fromPath,
                cause: error,
              }),
            );
          }
        }).pipe(Effect.withSpan("SupabaseStorage.move")),

      copy: (bucket, fromPath, toPath) =>
        Effect.gen(function* () {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.from(bucket).copy(fromPath, toPath),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Copy failed",
                operation: "copy",
                bucket,
                path: fromPath,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: `File not found: ${fromPath}`,
                  bucket,
                  path: fromPath,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Copy failed",
                operation: "copy",
                bucket,
                path: fromPath,
                cause: error,
              }),
            );
          }
        }).pipe(Effect.withSpan("SupabaseStorage.copy")),

      createSignedUrl: (bucket, path, options) =>
        Effect.gen(function* () {
          const signedUrlOptions = {
            ...(options.download !== undefined && { download: options.download }),
            ...(options.transform && { transform: options.transform }),
          };

          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              client.storage
                .from(bucket)
                .createSignedUrl(path, options.expiresIn, signedUrlOptions),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Create signed URL failed",
                operation: "list", // Using list as a proxy for read operations
                bucket,
                path,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("Object not found")) {
              return yield* Effect.fail(
                new SupabaseFileNotFoundError({
                  message: `File not found: ${path}`,
                  bucket,
                  path,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Create signed URL failed",
                operation: "list",
                bucket,
                path,
                cause: error,
              }),
            );
          }

          return data.signedUrl;
        }).pipe(Effect.withSpan("SupabaseStorage.createSignedUrl")),

      getPublicUrl: (bucket, path) =>
        Effect.sync(() => {
          const { data } = client.storage.from(bucket).getPublicUrl(path);
          return data.publicUrl;
        }).pipe(Effect.withSpan("SupabaseStorage.getPublicUrl")),

      listBuckets: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.listBuckets(),
            catch: (error) =>
              new SupabaseStorageError({
                message: "List buckets failed",
                operation: "list",
                cause: error,
              }),
          });

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "List buckets failed",
                operation: "list",
                cause: error,
              }),
            );
          }

          return data as StorageBucket[];
        }).pipe(Effect.withSpan("SupabaseStorage.listBuckets")),

      getBucket: (name) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.getBucket(name),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Get bucket failed",
                operation: "list",
                bucket: name,
                cause: error,
              }),
          });

          if (error) {
            // Bucket not found is not an error, just return None
            if (error.message?.includes("not found")) {
              return Option.none();
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Get bucket failed",
                operation: "list",
                bucket: name,
                cause: error,
              }),
            );
          }

          return Option.some(data as StorageBucket);
        }).pipe(Effect.withSpan("SupabaseStorage.getBucket")),

      createBucket: (name, options) =>
        Effect.gen(function* () {
          // Supabase SDK requires 'public' to always be set
          const bucketOptions = {
            public: options?.public ?? false,
            ...(options?.fileSizeLimit !== undefined && { fileSizeLimit: options.fileSizeLimit }),
            ...(options?.allowedMimeTypes && { allowedMimeTypes: options.allowedMimeTypes }),
          };

          const { data, error } = yield* Effect.tryPromise({
            try: () => client.storage.createBucket(name, bucketOptions),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Create bucket failed",
                operation: "createBucket",
                bucket: name,
                cause: error,
              }),
          });

          if (error) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Create bucket failed",
                operation: "createBucket",
                bucket: name,
                cause: error,
              }),
            );
          }

          return { id: data.name, name: data.name } as StorageBucket;
        }).pipe(Effect.withSpan("SupabaseStorage.createBucket")),

      deleteBucket: (name) =>
        Effect.gen(function* () {
          const { error } = yield* Effect.tryPromise({
            try: () => client.storage.deleteBucket(name),
            catch: (error) =>
              new SupabaseStorageError({
                message: "Delete bucket failed",
                operation: "deleteBucket",
                bucket: name,
                cause: error,
              }),
          });

          if (error) {
            if (error.message?.includes("not found")) {
              return yield* Effect.fail(
                new SupabaseBucketNotFoundError({
                  message: `Bucket not found: ${name}`,
                  bucket: name,
                  cause: error,
                }),
              );
            }
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: error.message || "Delete bucket failed",
                operation: "deleteBucket",
                bucket: name,
                cause: error,
              }),
            );
          }
        }).pipe(Effect.withSpan("SupabaseStorage.deleteBucket")),
    };
  }

  /**
   * Live layer - requires SupabaseClient
   */
  static readonly Live = Layer.effect(
    SupabaseStorage,
    Effect.gen(function* () {
      const supabaseClient = yield* SupabaseClient;
      const client = yield* supabaseClient.getClient();
      return SupabaseStorage.createService(client);
    }),
  );

  /**
   * Test layer with in-memory storage
   */
  static readonly Test = Layer.sync(SupabaseStorage, () => {
    // In-memory storage for testing
    const buckets = new Map<string, { public: boolean; files: Map<string, Blob> }>();
    buckets.set("test-bucket", { public: false, files: new Map() });

    return {
      upload: (bucket, path, file) =>
        Effect.gen(function* () {
          const bucketData = buckets.get(bucket);
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: `Bucket not found: ${bucket}`,
                bucket,
              }),
            );
          }
          const blob = file instanceof Blob ? file : new Blob([file]);
          bucketData.files.set(path, blob);
          return { name: path } as StorageFile;
        }),

      download: (bucket, path) =>
        Effect.gen(function* () {
          const bucketData = buckets.get(bucket);
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: `Bucket not found: ${bucket}`,
                operation: "download",
                bucket,
                path,
              }),
            );
          }
          const file = bucketData.files.get(path);
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: `File not found: ${path}`,
                bucket,
                path,
              }),
            );
          }
          return file;
        }),

      remove: (bucket, paths) =>
        Effect.sync(() => {
          const bucketData = buckets.get(bucket);
          if (bucketData) {
            for (const path of paths) {
              bucketData.files.delete(path);
            }
          }
        }),

      list: (bucket, path) =>
        Effect.gen(function* () {
          const bucketData = buckets.get(bucket);
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: `Bucket not found: ${bucket}`,
                bucket,
              }),
            );
          }
          const files: StorageFile[] = [];
          for (const [name] of bucketData.files) {
            if (!path || name.startsWith(path)) {
              files.push({ name });
            }
          }
          return files;
        }),

      move: (bucket, fromPath, toPath) =>
        Effect.gen(function* () {
          const bucketData = buckets.get(bucket);
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: `Bucket not found: ${bucket}`,
                operation: "move",
                bucket,
                path: fromPath,
              }),
            );
          }
          const file = bucketData.files.get(fromPath);
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: `File not found: ${fromPath}`,
                bucket,
                path: fromPath,
              }),
            );
          }
          bucketData.files.delete(fromPath);
          bucketData.files.set(toPath, file);
        }),

      copy: (bucket, fromPath, toPath) =>
        Effect.gen(function* () {
          const bucketData = buckets.get(bucket);
          if (!bucketData) {
            return yield* Effect.fail(
              new SupabaseStorageError({
                message: `Bucket not found: ${bucket}`,
                operation: "copy",
                bucket,
                path: fromPath,
              }),
            );
          }
          const file = bucketData.files.get(fromPath);
          if (!file) {
            return yield* Effect.fail(
              new SupabaseFileNotFoundError({
                message: `File not found: ${fromPath}`,
                bucket,
                path: fromPath,
              }),
            );
          }
          bucketData.files.set(toPath, file);
        }),

      createSignedUrl: (bucket, path) =>
        Effect.succeed(`https://test.supabase.co/storage/v1/object/sign/${bucket}/${path}`),

      getPublicUrl: (bucket, path) =>
        Effect.succeed(`https://test.supabase.co/storage/v1/object/public/${bucket}/${path}`),

      listBuckets: () =>
        Effect.succeed(
          Array.from(buckets.keys()).map((name) => ({
            id: name,
            name,
            public: buckets.get(name)?.public ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        ),

      getBucket: (name) =>
        Effect.succeed(
          buckets.has(name)
            ? Option.some({
                id: name,
                name,
                public: buckets.get(name)?.public ?? false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            : Option.none(),
        ),

      createBucket: (name, options) =>
        Effect.sync(() => {
          buckets.set(name, { public: options?.public ?? false, files: new Map() });
          return {
            id: name,
            name,
            public: options?.public ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }),

      deleteBucket: (name) =>
        Effect.gen(function* () {
          if (!buckets.has(name)) {
            return yield* Effect.fail(
              new SupabaseBucketNotFoundError({
                message: `Bucket not found: ${name}`,
                bucket: name,
              }),
            );
          }
          buckets.delete(name);
        }),
    };
  });

  /**
   * Dev layer with debug logging
   */
  static readonly Dev = Layer.effect(
    SupabaseStorage,
    Effect.gen(function* () {
      yield* Effect.logDebug("[SupabaseStorage] Initializing dev storage service...");

      // Use test layer as base with logging
      const testService = (yield* Layer.build(SupabaseStorage.Test)).pipe(
        Context.get(SupabaseStorage),
      );

      return {
        upload: (bucket, path, file, options) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] upload", { bucket, path, options });
            return yield* testService.upload(bucket, path, file, options);
          }),

        download: (bucket, path, options) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] download", { bucket, path, options });
            return yield* testService.download(bucket, path, options);
          }),

        remove: (bucket, paths) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] remove", { bucket, paths });
            return yield* testService.remove(bucket, paths);
          }),

        list: (bucket, path, options) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] list", { bucket, path, options });
            return yield* testService.list(bucket, path, options);
          }),

        move: (bucket, fromPath, toPath) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] move", { bucket, fromPath, toPath });
            return yield* testService.move(bucket, fromPath, toPath);
          }),

        copy: (bucket, fromPath, toPath) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] copy", { bucket, fromPath, toPath });
            return yield* testService.copy(bucket, fromPath, toPath);
          }),

        createSignedUrl: (bucket, path, options) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] createSignedUrl", { bucket, path, options });
            return yield* testService.createSignedUrl(bucket, path, options);
          }),

        getPublicUrl: (bucket, path) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] getPublicUrl", { bucket, path });
            return yield* testService.getPublicUrl(bucket, path);
          }),

        listBuckets: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] listBuckets");
            return yield* testService.listBuckets();
          }),

        getBucket: (name) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] getBucket", { name });
            return yield* testService.getBucket(name);
          }),

        createBucket: (name, options) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] createBucket", { name, options });
            return yield* testService.createBucket(name, options);
          }),

        deleteBucket: (name) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[SupabaseStorage] deleteBucket", { name });
            return yield* testService.deleteBucket(name);
          }),
      };
    }),
  );
}
