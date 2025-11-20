/**
 * Normalization Utilities
 *
 * Shared utilities for normalizing generator options across all library types.
 * Eliminates code duplication in normalizeOptions functions.
 *
 * @module monorepo-library-generator/normalization-utils
 */

import type { Tree } from '@nx/devkit';
import {
  joinPathFragments,
  names,
  offsetFromRoot as computeOffsetFromRoot,
} from '@nx/devkit';
import type { LibraryType } from './shared/types';

/**
 * Input for base normalization
 */
export interface NormalizeOptionsInput {
  readonly name: string;
  readonly directory?: string;
  readonly description?: string;
  readonly libraryType: LibraryType;
  readonly additionalTags?: Array<string>;
}

/**
 * Base normalized options common to all generators
 */
export interface NormalizedBaseOptions {
  // Required by BaseTemplateSubstitutions
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
}

/**
 * Get default directory for library type
 */
function getDefaultDirectory(libraryType: LibraryType): string {
  const directories: Record<LibraryType, string> = {
    contract: 'libs/contract',
    'data-access': 'libs/data-access',
    feature: 'libs/feature',
    provider: 'libs/provider',
    infra: 'libs/infra',
    util: 'libs/util',
  };
  return directories[libraryType];
}

/**
 * Convert kebab-case fileName to Title Case domain name
 */
function createDomainName(fileName: string): string {
  return fileName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build standard Nx tags for library
 */
function buildTags(
  libraryType: LibraryType,
  fileName: string,
  additionalTags?: Array<string>,
): string {
  const baseTags = [`type:${libraryType}`, `scope:${fileName}`];

  if (additionalTags) {
    for (const tag of additionalTags) {
      baseTags.push(tag);
    }
  }

  return baseTags.join(',');
}

/**
 * Normalize generator options with common logic
 *
 * Eliminates duplication of path computation, naming variants, and tag generation
 * across all generator normalizeOptions functions.
 *
 * @param tree - Nx virtual file system tree
 * @param input - Normalized input options
 * @returns Base normalized options common to all generators
 *
 * @example
 * ```typescript
 * function normalizeOptions(
 *   tree: Tree,
 *   schema: ContractGeneratorSchema
 * ): NormalizedContractOptions {
 *   const baseOptions = normalizeBaseOptions(tree, {
 *     name: schema.name,
 *     directory: schema.directory,
 *     description: schema.description,
 *     libraryType: 'contract',
 *     additionalTags: ['platform:universal'],
 *   });
 *
 *   return {
 *     ...baseOptions,
 *     // Contract-specific fields
 *     dependencies: computeDependencies(tree, schema.dependencies || [], baseOptions.projectRoot),
 *   };
 * }
 * ```
 */
export function normalizeBaseOptions(
  tree: Tree,
  input: NormalizeOptionsInput,
): NormalizedBaseOptions {
  // Use Nx names utility to get all naming variants
  const nameVariants = names(input.name);
  const fileName = nameVariants.fileName; // kebab-case

  // Get directory (use default if not provided)
  const directory = input.directory || getDefaultDirectory(input.libraryType);

  // Compute paths
  const projectRoot = joinPathFragments(directory, fileName);
  const sourceRoot = joinPathFragments(projectRoot, 'src');
  const distRoot = joinPathFragments('dist', directory, fileName);

  // Compute project identifiers
  const projectName = `${input.libraryType}-${fileName}`;
  const packageName = `@custom-repo/${projectName}`;

  // Compute domain name (Title Case from fileName)
  const domainName = input.description || createDomainName(fileName);

  // Build tags
  const tags = buildTags(input.libraryType, fileName, input.additionalTags);

  return {
    // Required by BaseTemplateSubstitutions
    tmpl: '' as const,
    name: input.name,
    offsetFromRoot: computeOffsetFromRoot(projectRoot),
    tags,

    // Naming variants
    className: nameVariants.className, // PascalCase
    propertyName: nameVariants.propertyName, // camelCase
    fileName, // kebab-case
    constantName: nameVariants.constantName, // SCREAMING_SNAKE_CASE
    domainName,

    // Project identifiers
    projectName,
    packageName,

    // Paths
    projectRoot,
    sourceRoot,
    distRoot,

    // Metadata
    description: input.description || domainName,
  };
}
