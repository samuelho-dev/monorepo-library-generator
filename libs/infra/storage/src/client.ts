/**
 * Storage Infrastructure - Client exports
 *
 * Browser-safe surface. Renderer / web client bundles MUST import
 * from `@samuelho-dev/infra-storage/client` — NOT from the root
 * `@samuelho-dev/infra-storage`, which exposes the StorageService
 * Effect Tag and transitively pulls server-only modules (supabase
 * server SDK, full env validator with node:fs).
 *
 * @module @samuelho-dev/infra-storage/client
 */
export * from './lib/client/hooks/use-storage-upload'

// Pure utilities (file-size + MIME validation, filename helpers,
// public URL builder). No env dependency beyond NEXT_PUBLIC_SUPABASE_URL
// which `validation.ts` reads via `@samuelho-dev/env/client`.
export {
  generateUniqueFilename,
  generateUuidFilename,
  getBasename,
  getFileExtension,
  getPublicUrl,
  matchesMimePattern,
  sanitizeFilename,
  validateFileSize,
  validateFileSizeBytes,
  validateMimeType,
  validateMimeTypeString
} from './lib/validation'
