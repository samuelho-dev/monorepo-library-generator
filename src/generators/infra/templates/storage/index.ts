/**
 * Storage Infrastructure Templates
 *
 * Generates core storage infrastructure files that consume provider-supabase.
 * Provides file upload, download, and bucket management.
 *
 * @module monorepo-library-generator/infra-templates/storage
 */

export { generateStorageErrorsFile } from './errors.template'
export { generateStorageServiceFile } from './service.template'
export { generateStorageIndexFile } from './storage-index.template'
export { generateStorageTypesFile } from './types.template'
