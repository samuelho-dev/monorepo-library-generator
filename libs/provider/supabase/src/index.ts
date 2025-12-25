/**
 * Supabase Provider Library
 *
 * Supabase SDK provider with Effect integration.

This library wraps the @supabase/supabase-js SDK in Effect types for:
- Type-safe authentication (SupabaseAuth)
- File storage operations (SupabaseStorage)
- Core client management (SupabaseClient)

Effect 3.0+ Pattern:
  - Services extend Context.Tag
  - Access layers via static members: Service.Test, Service.Live

Usage:
  import { SupabaseAuth, SupabaseStorage } from '@samuelho-dev/provider-supabase';

  const authLayer = SupabaseAuth.Test;
  const storageLayer = SupabaseStorage.Test;
 *
 */


// ============================================================================
// Error Types
// ============================================================================


export {
  // Base error
  SupabaseError,
  SupabaseConnectionError,
  // Auth errors
  SupabaseAuthError,
  SupabaseInvalidCredentialsError,
  SupabaseSessionExpiredError,
  SupabaseTokenError,
  // Storage errors
  SupabaseStorageError,
  SupabaseFileNotFoundError,
  SupabaseBucketNotFoundError,
} from "./lib/errors";
export type { SupabaseProviderError } from "./lib/errors";

// ============================================================================
// Types
// ============================================================================


export type {
  // Configuration
  SupabaseConfig,
  // User types
  SupabaseUser,
  AuthUser,
  UserMetadata,
  // Session types
  SupabaseSession,
  AuthResult,
  // Storage types
  StorageBucket,
  StorageFile,
  UploadOptions,
  DownloadOptions,
  SignedUrlOptions,
  // Auth types
  AuthMethod,
  SignInCredentials,
  SignUpCredentials,
  OAuthProvider,
} from "./lib/types";

// Schema exports for runtime validation
export {
  SupabaseConfigSchema,
  SupabaseUserSchema,
  AuthUserSchema,
  UserMetadataSchema,
  SupabaseSessionSchema,
  AuthResultSchema,
  StorageBucketSchema,
  StorageFileSchema,
} from "./lib/types";

// ============================================================================
// Services
// ============================================================================


// SupabaseClient - Core client for SDK initialization

// 

// Effect 3.0+ Pattern: Context.Tag with static layer members

//   - SupabaseClient.Live (lazy env loading)

//   - SupabaseClient.Test (mock client)

//   - SupabaseClient.Dev (debug logging)

//   - SupabaseClient.make(config) (custom configuration)


export { SupabaseClient, type SupabaseClientServiceInterface } from "./lib/client";

// SupabaseAuth - Authentication operations

// 

// Provides: signInWithPassword, signUp, signOut, verifyToken, getSession, getUser

// Used by: infra-auth for auth middleware


export { SupabaseAuth, type SupabaseAuthServiceInterface } from "./lib/auth";

// SupabaseStorage - File storage operations

// 

// Provides: upload, download, remove, list, createSignedUrl, getPublicUrl

// Used by: infra-storage for file operations


export { SupabaseStorage, type SupabaseStorageServiceInterface } from "./lib/storage";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Examples

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect, Layer } from 'effect';

// import { SupabaseAuth, SupabaseClient, SupabaseStorage } from '@samuelho-dev/provider-supabase';

// 

// // Authentication example

// const authProgram = Effect.gen(function*() {

//   const auth = yield* SupabaseAuth;

//   const result = yield* auth.signInWithPassword({

//     email: 'user@example.com',

//     password: 'password123',

//   });

//   return result.user;

// });

// 

// // Storage example

// const storageProgram = Effect.gen(function*() {

//   const storage = yield* SupabaseStorage;

//   const files = yield* storage.list('my-bucket');

//   return files;

// });

// 

// // Layer composition

// const MainLayer = Layer.mergeAll(

//   SupabaseClient.Live,

//   SupabaseAuth.Live,

//   SupabaseStorage.Live,

// );

// 

// // For testing

// const TestLayer = Layer.mergeAll(

//   SupabaseClient.Test,

//   SupabaseAuth.Test,

//   SupabaseStorage.Test,

// );

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
