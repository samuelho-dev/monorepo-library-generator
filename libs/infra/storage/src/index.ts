/**
 * Storage Infrastructure Library
 *
 * File storage infrastructure with validation and bucket management.

This library:
- Consumes SupabaseStorage from provider-supabase
- Provides StorageService for file operations
- Handles file size and type validation

Usage:
  import { StorageService } from '@samuelho-dev/infra-storage';
 *
 */


// ============================================================================
// Errors
// ============================================================================


export {
  StorageError,
  FileNotFoundError,
  BucketNotFoundError,
  UploadFailedError,
  DownloadFailedError,
  FileSizeExceededError,
  InvalidFileTypeError,
} from "./lib/errors";

export type { StorageInfraError } from "./lib/errors";

// ============================================================================
// Types
// ============================================================================


export type {
  StorageConfig,
  UploadResult,
  ListFilesOptions,
  ListFilesResult,
} from "./lib/types";

export {
  StorageConfigSchema,
  UploadResultSchema,
} from "./lib/types";

// Re-export from provider for convenience
export type {
  StorageBucket,
  StorageFile,
  UploadOptions,
  DownloadOptions,
  SignedUrlOptions,
} from "@samuelho-dev/provider-supabase";

// ============================================================================
// Service
// ============================================================================


export { StorageService, type StorageServiceInterface } from "./lib/service";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Examples

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect } from 'effect';

// import { StorageService } from '@samuelho-dev/infra-storage';

// 

// const program = Effect.gen(function*() {

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
