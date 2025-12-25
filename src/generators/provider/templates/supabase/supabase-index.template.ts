/**
 * Supabase Provider Index Template
 *
 * Generates the main barrel export for the Supabase provider library.
 *
 * @module monorepo-library-generator/provider/templates/supabase/index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Supabase provider index.ts file
 */
export function generateSupabaseIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Supabase Provider Library",
    description: `Supabase SDK provider with Effect integration.

This library wraps the @supabase/supabase-js SDK in Effect types for:
- Type-safe authentication (SupabaseAuth)
- File storage operations (SupabaseStorage)
- Core client management (SupabaseClient)

Effect 3.0+ Pattern:
  - Services extend Context.Tag
  - Access layers via static members: Service.Test, Service.Live

Usage:
  import { SupabaseAuth, SupabaseStorage } from '${packageName}';

  const authLayer = SupabaseAuth.Test;
  const storageLayer = SupabaseStorage.Test;`
  })
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Error Types")
  builder.addBlankLine()

  builder.addRaw(`export {
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
} from "./lib/errors"
export type { SupabaseProviderError } from "./lib/errors"`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment("Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
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
} from "./lib/types"

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
} from "./lib/types"`)
  builder.addBlankLine()

  // Service exports
  builder.addSectionComment("Services")
  builder.addBlankLine()

  builder.addComment("SupabaseClient - Core client for SDK initialization")
  builder.addComment("")
  builder.addComment("Effect 3.0+ Pattern: Context.Tag with static layer members")
  builder.addComment("  - SupabaseClient.Live (lazy env loading)")
  builder.addComment("  - SupabaseClient.Test (mock client)")
  builder.addComment("  - SupabaseClient.Dev (debug logging)")
  builder.addComment("  - SupabaseClient.make(config) (custom configuration)")
  builder.addBlankLine()

  builder.addRaw(
    `export { SupabaseClient, type SupabaseClientServiceInterface } from "./lib/client"`
  )
  builder.addBlankLine()

  builder.addComment("SupabaseAuth - Authentication operations")
  builder.addComment("")
  builder.addComment(
    "Provides: signInWithPassword, signUp, signOut, verifyToken, getSession, getUser"
  )
  builder.addComment("Used by: infra-auth for auth middleware")
  builder.addBlankLine()

  builder.addRaw(
    `export { SupabaseAuth, type SupabaseAuthServiceInterface } from "./lib/auth"`
  )
  builder.addBlankLine()

  builder.addComment("SupabaseStorage - File storage operations")
  builder.addComment("")
  builder.addComment("Provides: upload, download, remove, list, createSignedUrl, getPublicUrl")
  builder.addComment("Used by: infra-storage for file operations")
  builder.addBlankLine()

  builder.addRaw(
    `export { SupabaseStorage, type SupabaseStorageServiceInterface } from "./lib/storage"`
  )
  builder.addBlankLine()

  // Usage example
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Usage Examples")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("import { Effect, Layer } from 'effect';")
  builder.addComment(
    `import { SupabaseAuth, SupabaseClient, SupabaseStorage } from '${packageName}';`
  )
  builder.addComment("")
  builder.addComment("// Authentication example")
  builder.addComment("const authProgram = Effect.gen(function* () {")
  builder.addComment("  const auth = yield* SupabaseAuth;")
  builder.addComment("  const result = yield* auth.signInWithPassword({")
  builder.addComment("    email: 'user@example.com',")
  builder.addComment("    password: 'password123',")
  builder.addComment("  });")
  builder.addComment("  return result.user;")
  builder.addComment("});")
  builder.addComment("")
  builder.addComment("// Storage example")
  builder.addComment("const storageProgram = Effect.gen(function* () {")
  builder.addComment("  const storage = yield* SupabaseStorage;")
  builder.addComment("  const files = yield* storage.list('my-bucket');")
  builder.addComment("  return files;")
  builder.addComment("});")
  builder.addComment("")
  builder.addComment("// Layer composition")
  builder.addComment("const MainLayer = Layer.mergeAll(")
  builder.addComment("  SupabaseClient.Live,")
  builder.addComment("  SupabaseAuth.Live,")
  builder.addComment("  SupabaseStorage.Live,")
  builder.addComment(");")
  builder.addComment("")
  builder.addComment("// For testing")
  builder.addComment("const TestLayer = Layer.mergeAll(")
  builder.addComment("  SupabaseClient.Test,")
  builder.addComment("  SupabaseAuth.Test,")
  builder.addComment("  SupabaseStorage.Test,")
  builder.addComment(");")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
