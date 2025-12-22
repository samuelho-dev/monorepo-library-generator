/**
 * Storage Infrastructure Types Template
 *
 * Generates type definitions for storage infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/storage/types
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate storage types.ts file
 */
export function generateStorageTypesFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { packageName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: 'Storage Infrastructure Types',
    description: `Type definitions for storage infrastructure.

Re-exports types from provider-supabase and adds storage-specific types.`,
    module: `${packageName}/types`,
  });
  builder.addBlankLine();

  // Imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);
  builder.addBlankLine();

  // Re-export from provider-supabase
  builder.addSectionComment('Re-exports from Provider');
  builder.addBlankLine();

  builder.addRaw(`// Re-export storage types from provider-supabase
export type {
  StorageBucket,
  StorageFile,
  UploadOptions,
  DownloadOptions,
  SignedUrlOptions,
} from "${scope}/provider-supabase";

export {
  StorageBucketSchema,
  StorageFileSchema,
} from "${scope}/provider-supabase";`);
  builder.addBlankLine();

  // Storage config types
  builder.addSectionComment('Storage Configuration');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Storage service configuration
 */
export interface StorageConfig {
  /**
   * Default bucket for operations
   */
  readonly defaultBucket?: string;

  /**
   * Maximum file size in bytes
   */
  readonly maxFileSize?: number;

  /**
   * Allowed MIME types
   */
  readonly allowedMimeTypes?: readonly string[];

  /**
   * Default signed URL expiration in seconds
   */
  readonly signedUrlExpiresIn?: number;
}

/**
 * Storage config schema
 */
export const StorageConfigSchema = Schema.Struct({
  defaultBucket: Schema.optional(Schema.String),
  maxFileSize: Schema.optional(Schema.Number),
  allowedMimeTypes: Schema.optional(Schema.Array(Schema.String)),
  signedUrlExpiresIn: Schema.optional(Schema.Number),
});`);
  builder.addBlankLine();

  // Upload result types
  builder.addSectionComment('Operation Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Upload result
 */
export interface UploadResult {
  readonly path: string;
  readonly bucket: string;
  readonly publicUrl?: string;
  readonly signedUrl?: string;
}

/**
 * Upload result schema
 */
export const UploadResultSchema = Schema.Struct({
  path: Schema.String,
  bucket: Schema.String,
  publicUrl: Schema.optional(Schema.String),
  signedUrl: Schema.optional(Schema.String),
});

/**
 * List files options
 */
export interface ListFilesOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly prefix?: string;
  readonly sortBy?: {
    readonly column: 'name' | 'created_at' | 'updated_at';
    readonly order: 'asc' | 'desc';
  };
}

/**
 * Storage file info (subset of provider StorageFile)
 */
export interface StorageFileInfo {
  readonly name: string;
  readonly id?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/**
 * List files result
 */
export interface ListFilesResult {
  readonly files: readonly StorageFileInfo[];
  readonly hasMore: boolean;
  readonly nextOffset?: number;
}`);

  return builder.toString();
}
