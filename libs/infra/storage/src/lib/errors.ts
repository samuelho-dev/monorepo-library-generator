import { Data } from "effect"

/**
 * Storage Infrastructure Errors
 *
 * Data.TaggedError-based error types for storage operations.

All errors extend Data.TaggedError for structural equality and pattern matching.
 *
 * @module @samuelho-dev/infra-storage/errors
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base storage error
 */
export class StorageError extends Data.TaggedError("StorageError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * File not found error
 */
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly message: string
  readonly bucket: string
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Bucket not found error
 */
export class BucketNotFoundError extends Data.TaggedError("BucketNotFoundError")<{
  readonly message: string
  readonly bucket: string
  readonly cause?: unknown
}> {}

/**
 * Upload failed error
 */
export class UploadFailedError extends Data.TaggedError("UploadFailedError")<{
  readonly message: string
  readonly bucket: string
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Download failed error
 */
export class DownloadFailedError extends Data.TaggedError("DownloadFailedError")<{
  readonly message: string
  readonly bucket: string
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * File size exceeded error
 */
export class FileSizeExceededError extends Data.TaggedError("FileSizeExceededError")<{
  readonly message: string
  readonly maxSize: number
  readonly actualSize: number
  readonly cause?: unknown
}> {}

/**
 * Invalid file type error
 */
export class InvalidFileTypeError extends Data.TaggedError("InvalidFileTypeError")<{
  readonly message: string
  readonly allowedTypes: ReadonlyArray<string>
  readonly actualType: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Error Union Type
// ============================================================================

/**
 * Union of all storage errors
 */
export type StorageServiceError =
  | StorageError
  | FileNotFoundError
  | BucketNotFoundError
  | UploadFailedError
  | DownloadFailedError
  | FileSizeExceededError
  | InvalidFileTypeError

/**
 * Alias for index exports - union of all storage infrastructure errors
 */
export type StorageInfraError = StorageServiceError
