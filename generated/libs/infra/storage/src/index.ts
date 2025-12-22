/**
 * Storage Infrastructure Library
 *
 * File storage infrastructure with validation and bucket management.

This library:
- Consumes SupabaseStorage from provider-supabase
- Provides StorageService for file operations
- Handles file size and type validation

Usage:
  import { StorageService } from '@myorg/infra-storage';
 *
 */

// ============================================================================
// Errors
// ============================================================================

export type { StorageInfraError } from "./lib/service/errors";
export {
  BucketNotFoundError,
  DownloadFailedError,
  FileNotFoundError,
  FileSizeExceededError,
  InvalidFileTypeError,
  StorageError,
  UploadFailedError,
} from "./lib/service/errors";

// ============================================================================
// Types
// ============================================================================

// Re-export from provider for convenience
export type {
  DownloadOptions,
  SignedUrlOptions,
  StorageBucket,
  StorageFile,
  UploadOptions,
} from "@myorg/provider-supabase";
export type {
  ListFilesOptions,
  ListFilesResult,
  StorageConfig,
  UploadResult,
} from "./lib/service/types";
export {
  StorageConfigSchema,
  UploadResultSchema,
} from "./lib/service/types";

// ============================================================================
// Service
// ============================================================================

export { StorageService, type StorageServiceInterface } from "./lib/service/service";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Examples

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// import { Effect } from 'effect';

// import { StorageService } from '@myorg/infra-storage';

//

// const program = Effect.gen(function* () {

//   const storage = yield* StorageService;

//

//   // Upload a file

//   const result = yield* storage.upload(

//     "my-bucket",

//     "images/photo.jpg",

//     fileBlob,

//     { contentType: "image/jpeg" }

//   );

//

//   // Get signed URL

//   const url = yield* storage.createSignedUrl(

//     "my-bucket",

//     "images/photo.jpg",

//     { expiresIn: 3600 }

//   );

//

//   return url;

// });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
