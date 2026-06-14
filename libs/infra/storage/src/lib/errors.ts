import { Schema } from 'effect'

/**
 * Storage Infrastructure Errors
 *
 * Schema.TaggedError-based error types for storage operations.

All errors extend Schema.TaggedError for structural equality and pattern matching.
 *
 * @module @samuelho-dev/infra-storage/errors
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base storage error
 */
export class StorageError extends Schema.TaggedErrorClass<StorageError>()('StorageError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {}

/**
 * File not found error
 */
export class FileNotFoundError extends Schema.TaggedErrorClass<FileNotFoundError>()(
  'FileNotFoundError',
  {
    message: Schema.String,
    bucket: Schema.String,
    path: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Bucket not found error
 */
export class BucketNotFoundError extends Schema.TaggedErrorClass<BucketNotFoundError>()(
  'BucketNotFoundError',
  {
    message: Schema.String,
    bucket: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Upload failed error
 */
export class UploadFailedError extends Schema.TaggedErrorClass<UploadFailedError>()(
  'UploadFailedError',
  {
    message: Schema.String,
    bucket: Schema.String,
    path: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * File size exceeded error
 */
export class FileSizeExceededError extends Schema.TaggedErrorClass<FileSizeExceededError>()(
  'FileSizeExceededError',
  {
    message: Schema.String,
    maxSize: Schema.Number,
    actualSize: Schema.Number,
    cause: Schema.optional(Schema.Defect)
  }
) {}

/**
 * Invalid file type error
 */
export class InvalidFileTypeError extends Schema.TaggedErrorClass<InvalidFileTypeError>()(
  'InvalidFileTypeError',
  {
    message: Schema.String,
    allowedTypes: Schema.Array(Schema.String),
    actualType: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

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
  | FileSizeExceededError
  | InvalidFileTypeError

/**
 * Alias for index exports - union of all storage infrastructure errors
 */
export type StorageInfraError = StorageServiceError
