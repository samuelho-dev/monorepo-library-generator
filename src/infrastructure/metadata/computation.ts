/**
 * Metadata Computation
 *
 * Universal metadata computation for all interfaces (MCP, CLI, Nx)
 *
 * @module monorepo-library-generator/infrastructure/metadata/computation
 */

import { offsetFromRoot as computeOffsetFromRoot } from '@nx/devkit';
import { createNamingVariants } from '../../utils/naming';
import type { WorkspaceContext } from '../workspace/types';
import type { LibraryType, MetadataInput } from './types';

/**
 * Get default directory for library type
 *
 * @param libraryType - Type of library
 * @param librariesRoot - Root directory for libraries (default: "libs")
 * @returns Directory path for this library type
 */
function getDefaultDirectory(libraryType: LibraryType, librariesRoot = 'libs') {
  const directories: Record<LibraryType, string> = {
    contract: `${librariesRoot}/contract`,
    'data-access': `${librariesRoot}/data-access`,
    feature: `${librariesRoot}/feature`,
    provider: `${librariesRoot}/provider`,
    infra: `${librariesRoot}/infra`,
    util: `${librariesRoot}/util`,
  };
  return directories[libraryType];
}

/**
 * Convert kebab-case fileName to Title Case domain name
 *
 * @param fileName - kebab-case file name
 * @returns Title Case domain name
 *
 * @example
 * ```typescript
 * createDomainName("user-profile") // => "User Profile"
 * createDomainName("api") // => "Api"
 * ```
 */
function createDomainName(fileName: string) {
  return fileName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build standard tags for library
 *
 * @param libraryType - Type of library
 * @param fileName - kebab-case file name (for scope tag)
 * @param additionalTags - Optional additional tags to include
 * @returns Comma-separated tags string
 *
 * @example
 * ```typescript
 * buildTags("contract", "user", ["platform:universal"])
 * // => "type:contract,scope:user,platform:universal"
 * ```
 */
function buildTags(
  libraryType: LibraryType,
  fileName: string,
  additionalTags?: ReadonlyArray<string>,
) {
  // Check if a custom scope tag is already provided in additionalTags
  const hasCustomScope = additionalTags?.some((tag) => tag.startsWith('scope:'));

  const baseTags = [`type:${libraryType}`];

  // Only add default scope:${fileName} if no custom scope was provided
  if (!hasCustomScope) {
    baseTags.push(`scope:${fileName}`);
  }

  if (additionalTags) {
    for (const tag of additionalTags) {
      baseTags.push(tag);
    }
  }

  return baseTags.join(',');
}

/**
 * Universal metadata computation for all interfaces
 *
 * Replaces:
 * - CLI: computeCliMetadata()
 * - Nx: computeLibraryMetadata()
 * - MCP: inline metadata computation
 *
 * Single source of truth for deriving all library metadata from name and context.
 *
 * @param input - Metadata input (name, libraryType, directory, description, tags)
 * @param context - Workspace context (root, scope, interfaceType)
 * @returns Complete library metadata ready for generation
 *
 * @example
 * ```typescript
 * // MCP handler
 * const context = yield* createWorkspaceContext(args.workspaceRoot, "mcp")
 * const metadata = computeMetadata({
 *   name: "user",
 *   libraryType: "contract",
 *   description: "User domain contracts"
 * }, context)
 *
 * // CLI command
 * const context = yield* createWorkspaceContext(undefined, "cli")
 * const metadata = computeMetadata({
 *   name: "user",
 *   libraryType: "contract"
 * }, context)
 *
 * // Nx generator
 * const context = yield* createWorkspaceContext(tree.root, "nx")
 * const metadata = computeMetadata({
 *   name: schema.name,
 *   libraryType: "contract",
 *   directory: schema.directory,
 *   additionalTags: ["platform:universal"]
 * }, context)
 * ```
 */
export function computeMetadata(input: MetadataInput, context: WorkspaceContext) {
  // Get all naming variants using Nx utility
  const nameVariants = createNamingVariants(input.name);
  const fileName = nameVariants.fileName; // kebab-case

  // Get directory (use default if not provided)
  const directory = input.directory || getDefaultDirectory(input.libraryType);

  // Compute paths
  const projectRoot = `${directory}/${fileName}`;
  const sourceRoot = `${projectRoot}/src`;
  const distRoot = `dist/${directory}/${fileName}`;

  // Compute project identifiers
  const projectName = `${input.libraryType}-${fileName}`;
  const packageName = `${context.scope}/${projectName}`;

  // Compute domain name (use description or derive from fileName)
  const domainName = input.description || createDomainName(fileName);

  // Build tags
  const tags = buildTags(input.libraryType, fileName, input.additionalTags);

  // Compute offset from root (for Nx template substitutions)
  const offsetFromRoot = computeOffsetFromRoot(projectRoot);

  return {
    // Required by Nx template substitutions
    tmpl: '' as const,
    name: input.name,
    offsetFromRoot,
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
    description: domainName,
    libraryType: input.libraryType,
  };
}

/**
 * Simplified metadata computation (for backwards compatibility)
 *
 * Convenience wrapper that creates a minimal MetadataInput
 */
export function computeSimpleMetadata(
  name: string,
  libraryType: LibraryType,
  context: WorkspaceContext,
  description?: string,
) {
  const input = {
    name,
    libraryType,
    ...(description !== undefined && { description }),
  };
  return computeMetadata(input, context);
}
