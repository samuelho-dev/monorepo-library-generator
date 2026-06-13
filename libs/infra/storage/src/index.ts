/**
 * Storage Infrastructure
 * @module @samuelho-dev/infra-storage
 */

export {
  BucketNotFoundError,
  FileNotFoundError,
  FileSizeExceededError,
  InvalidFileTypeError,
  StorageError,
  type StorageInfraError,
  type StorageServiceError,
  UploadFailedError
} from './lib/errors'
export {
  getPublicUrl,
  StorageService,
  type StorageServiceInterface
} from './lib/service'
export type {
  ListFilesOptions,
  ListFilesResult,
  StorageConfig,
  StorageFileInfo,
  UploadResult
} from './lib/types'
export { StorageConfigSchema, UploadResultSchema } from './lib/types'
