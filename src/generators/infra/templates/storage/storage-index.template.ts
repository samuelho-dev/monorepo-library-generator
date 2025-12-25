/**
 * Storage Infrastructure Index Template
 *
 * Generates the barrel export for storage infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/storage/index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate storage index.ts file
 */
export function generateStorageIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: "Storage Infrastructure Library",
    description: `File storage infrastructure with validation and bucket management.

This library:
- Consumes SupabaseStorage from provider-supabase
- Provides StorageService for file operations
- Handles file size and type validation

Usage:
  import { StorageService } from '${packageName}';`
  })
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Errors")
  builder.addBlankLine()

  builder.addRaw(`export {
  StorageError,
  FileNotFoundError,
  BucketNotFoundError,
  UploadFailedError,
  DownloadFailedError,
  FileSizeExceededError,
  InvalidFileTypeError,
} from "./lib/errors"

export type { StorageInfraError } from "./lib/errors"`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment("Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  StorageConfig,
  UploadResult,
  ListFilesOptions,
  ListFilesResult,
} from "./lib/types"

export {
  StorageConfigSchema,
  UploadResultSchema,
} from "./lib/types"

// Re-export from provider for convenience
export type {
  StorageBucket,
  StorageFile,
  UploadOptions,
  DownloadOptions,
  SignedUrlOptions,
} from "${scope}/provider-supabase"`)
  builder.addBlankLine()

  // Service exports
  builder.addSectionComment("Service")
  builder.addBlankLine()

  builder.addRaw(
    `export { StorageService, type StorageServiceInterface } from "./lib/service"`
  )
  builder.addBlankLine()

  // Usage example
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Usage Examples")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("import { Effect } from 'effect';")
  builder.addComment(`import { StorageService } from '${packageName}';`)
  builder.addComment("")
  builder.addComment("const program = Effect.gen(function*() {")
  builder.addComment("  const storage = yield* StorageService;")
  builder.addComment("")
  builder.addComment("  // Upload a file")
  builder.addComment("  const result = yield* storage.upload(")
  builder.addComment("    \"my-bucket\",")
  builder.addComment("    \"images/photo.jpg\",")
  builder.addComment("    fileBlob,")
  builder.addComment("    { contentType: \"image/jpeg\" }")
  builder.addComment("  );")
  builder.addComment("")
  builder.addComment("  // Get signed URL")
  builder.addComment("  const url = yield* storage.createSignedUrl(")
  builder.addComment("    \"my-bucket\",")
  builder.addComment("    \"images/photo.jpg\",")
  builder.addComment("    { expiresIn: 3600 }")
  builder.addComment("  );")
  builder.addComment("")
  builder.addComment("  return url;")
  builder.addComment("});")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
