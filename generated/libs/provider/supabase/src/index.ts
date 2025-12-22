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
  import { SupabaseAuth, SupabaseStorage } from '@myorg/provider-supabase';

  const authLayer = SupabaseAuth.Test;
  const storageLayer = SupabaseStorage.Test;
 *
 */

// ============================================================================
// Error Types
// ============================================================================

export type { SupabaseProviderError } from "./lib/errors";
export {
  // Auth errors
  SupabaseAuthError,
  SupabaseBucketNotFoundError,
  SupabaseConnectionError,
  // Base error
  SupabaseError,
  SupabaseFileNotFoundError,
  SupabaseInvalidCredentialsError,
  SupabaseSessionExpiredError,
  // Storage errors
  SupabaseStorageError,
  SupabaseTokenError,
} from "./lib/errors";

// ============================================================================
// Types
// ============================================================================

export type {
  // Auth types
  AuthMethod,
  AuthResult,
  AuthUser,
  DownloadOptions,
  OAuthProvider,
  SignedUrlOptions,
  SignInCredentials,
  SignUpCredentials,
  // Storage types
  StorageBucket,
  StorageFile,
  // Configuration
  SupabaseConfig,
  // Session types
  SupabaseSession,
  // User types
  SupabaseUser,
  UploadOptions,
  UserMetadata,
} from "./lib/types";

// Schema exports for runtime validation
export {
  AuthResultSchema,
  AuthUserSchema,
  StorageBucketSchema,
  StorageFileSchema,
  SupabaseConfigSchema,
  SupabaseSessionSchema,
  SupabaseUserSchema,
  UserMetadataSchema,
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

export { SupabaseClient, type SupabaseClientServiceInterface } from "./lib/service/client";

// SupabaseAuth - Authentication operations

//

// Provides: signInWithPassword, signUp, signOut, verifyToken, getSession, getUser

// Used by: infra-auth for auth middleware

export { SupabaseAuth, type SupabaseAuthServiceInterface } from "./lib/service/auth";

// SupabaseStorage - File storage operations

//

// Provides: upload, download, remove, list, createSignedUrl, getPublicUrl

// Used by: infra-storage for file operations

export { SupabaseStorage, type SupabaseStorageServiceInterface } from "./lib/service/storage";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Examples

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// import { Effect, Layer } from 'effect';

// import { SupabaseAuth, SupabaseClient, SupabaseStorage } from '@myorg/provider-supabase';

//

// // Authentication example

// const authProgram = Effect.gen(function* () {

//   const auth = yield* SupabaseAuth;

//   const result = yield* auth.signInWithPassword({

//     email: 'user@example.com',

//     password: 'password123',

//   });

//   return result.user;

// });

//

// // Storage example

// const storageProgram = Effect.gen(function* () {

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
