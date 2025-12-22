/**
 * Metadata Types
 *
 * Shared types for library metadata across all interfaces
 *
 * @module monorepo-library-generator/infrastructure/metadata/types
 */

/**
 * Library type - identifies which kind of library is being generated
 */
export type LibraryType = 'contract' | 'data-access' | 'feature' | 'provider' | 'infra' | 'util';

/**
 * Universal library metadata
 *
 * Contains all derived information needed for library generation:
 * - Naming variants (PascalCase, camelCase, kebab-case, etc.)
 * - Paths (projectRoot, sourceRoot, etc.)
 * - Tags, package names, and other metadata
 *
 * This consolidates:
 * - Nx's LibraryMetadata (from library-metadata.ts)
 * - CLI's computeCliMetadata return type
 * - MCP's inline metadata computation
 */
export interface LibraryMetadata {
  // Required by Nx template substitutions
  readonly tmpl: '';
  readonly name: string;
  readonly offsetFromRoot: string;
  readonly tags: string;

  // Naming variants
  readonly className: string; // PascalCase
  readonly propertyName: string; // camelCase
  readonly fileName: string; // kebab-case
  readonly constantName: string; // SCREAMING_SNAKE_CASE
  readonly domainName: string; // Title Case

  // Project identifiers
  readonly projectName: string; // {type}-{name}
  readonly packageName: string; // @custom-repo/{projectName}

  // Paths
  readonly projectRoot: string;
  readonly sourceRoot: string;
  readonly distRoot: string;

  // Metadata
  readonly description: string;
  readonly libraryType: LibraryType;
}

/**
 * Input for computing library metadata
 */
export interface MetadataInput {
  readonly name: string;
  readonly libraryType: LibraryType;
  readonly directory?: string;
  readonly description?: string;
  readonly additionalTags?: ReadonlyArray<string>;
}
