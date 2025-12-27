/**
 * Storage Infrastructure Errors Template
 *
 * Generates error types for storage infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/storage/errors
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"

/**
 * Generate storage errors.ts file
 */
export function generateStorageErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Storage Infrastructure Errors",
    description: `Data.TaggedError-based error types for storage operations.

All errors extend Data.TaggedError for structural equality and pattern matching.`,
    module: `${packageName}/errors`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([{ from: "effect", imports: ["Data"] }])
  builder.addBlankLine()

  // Error types
  builder.addSectionComment("Error Types")
  builder.addBlankLine()

  builder.addRaw(`/**
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
  readonly allowedTypes: readonly string[]
  readonly actualType: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Union type
  builder.addSectionComment("Error Union Type")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Union of all storage errors
 */
export type StorageServiceError = StorageError | FileNotFoundError | BucketNotFoundError | UploadFailedError | DownloadFailedError | FileSizeExceededError | InvalidFileTypeError

/**
 * Alias for index exports - union of all storage infrastructure errors
 */
export type StorageInfraError = StorageServiceError`)

  return builder.toString()
}
