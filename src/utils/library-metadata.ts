/**
 * Library Metadata Computation
 *
 * Computes all metadata for library generation (names, paths, tags).
 * Single source of truth for all derived library values.
 * Forward-facing architecture - no backwards compatibility.
 *
 * @module monorepo-library-generator/library-metadata
 */

import type { Tree } from "@nx/devkit"
import { joinPathFragments, offsetFromRoot as computeOffsetFromRoot } from "@nx/devkit"
import { Effect } from "effect"
import { createNamingVariants } from "./naming"
import type { LibraryType } from "./shared/types"
import { createTreeAdapter } from "./tree-adapter"
import { detectWorkspaceConfig } from "./workspace-detection"

/**
 * Input for computing library metadata
 */
export interface LibraryMetadataInput {
  readonly name: string
  readonly directory?: string
  readonly description?: string
  readonly libraryType: LibraryType
  readonly additionalTags?: Array<string>
}

/**
 * Complete library metadata (all computed values)
 *
 * Contains all derived information about a library:
 * - Naming variants (PascalCase, camelCase, kebab-case, etc.)
 * - Paths (projectRoot, sourceRoot, etc.)
 * - Tags, package names, and other metadata
 */
export interface LibraryMetadata {
  // Required by BaseTemplateSubstitutions
  readonly tmpl: ""
  readonly name: string
  readonly offsetFromRoot: string
  readonly tags: string

  // Naming variants
  readonly className: string // PascalCase
  readonly propertyName: string // camelCase
  readonly fileName: string // kebab-case
  readonly constantName: string // SCREAMING_SNAKE_CASE
  readonly domainName: string // Title Case

  // Project identifiers
  readonly projectName: string // {type}-{name}
  readonly packageName: string // @custom-repo/{projectName}

  // Paths
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly distRoot: string

  // Metadata
  readonly description: string
}

/**
 * Get default directory for library type
 */
function getDefaultDirectory(libraryType: LibraryType, librariesRoot: string) {
  const directories: Record<LibraryType, string> = {
    contract: `${librariesRoot}/contract`,
    "data-access": `${librariesRoot}/data-access`,
    feature: `${librariesRoot}/feature`,
    provider: `${librariesRoot}/provider`,
    infra: `${librariesRoot}/infra`,
    util: `${librariesRoot}/util`
  }
  return directories[libraryType]
}

/**
 * Convert kebab-case fileName to Title Case domain name
 */
function createDomainName(fileName: string) {
  return fileName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Build standard Nx tags for library
 */
function buildTags(
  libraryType: LibraryType,
  fileName: string,
  additionalTags?: Array<string>
) {
  const baseTags = [`type:${libraryType}`, `scope:${fileName}`]

  if (additionalTags) {
    for (const tag of additionalTags) {
      baseTags.push(tag)
    }
  }

  return baseTags.join(",")
}

/**
 * Compute library metadata
 *
 * Single function that computes ALL library metadata:
 * - Detects workspace configuration
 * - Computes naming variants (className, propertyName, fileName, constantName)
 * - Computes paths (projectRoot, sourceRoot, distRoot)
 * - Builds tags with defaults
 * - Computes package names
 *
 * Forward-facing architecture: No backwards compatibility.
 * Replaces the old normalizeOptions() + standardizeGeneratorOptions() pattern.
 *
 * @param tree - Nx virtual file system tree
 * @param schema - Generator schema with name, directory, description, tags
 * @param libraryType - Type of library being generated
 * @param additionalTags - Optional additional tags to merge with defaults
 * @returns Complete library metadata ready for generateLibraryFiles and core generators
 *
 * @example
 * ```typescript
 * // In generator wrapper (direct call, no intermediary)
 * const metadata = computeLibraryMetadata(
 *   tree,
 *   schema,
 *   "contract",
 *   ["platform:universal"]
 * )
 *
 * // Pass to generateLibraryFiles
 * await generateLibraryFiles(tree, {
 *   name: metadata.name,
 *   projectName: metadata.projectName,
 *   projectRoot: metadata.projectRoot,
 *   // ... other metadata
 * })
 * ```
 */
export function computeLibraryMetadata(
  tree: Tree,
  schema: {
    readonly name: string
    readonly directory?: string
    readonly description?: string
    readonly tags?: string
  },
  libraryType: LibraryType,
  additionalTags?: ReadonlyArray<string>
) {
  // Detect workspace configuration
  const adapter = createTreeAdapter(tree)

  const workspaceConfig = Effect.runSync(
    detectWorkspaceConfig(adapter).pipe(Effect.orDie)
  )

  // Parse schema tags if provided
  const schemaTags = schema.tags
    ? schema.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    : []

  // Combine schema tags with additional tags
  const allAdditionalTags = additionalTags
    ? [...schemaTags, ...additionalTags]
    : schemaTags
  // Use Nx names utility to get all naming variants
  const nameVariants = createNamingVariants(schema.name)
  const fileName = nameVariants.fileName // kebab-case

  // Get directory (use default if not provided)
  const directory = schema.directory || getDefaultDirectory(libraryType, workspaceConfig.librariesRoot)

  // Compute paths
  const projectRoot = joinPathFragments(directory, fileName)
  const sourceRoot = joinPathFragments(projectRoot, "src")
  const distRoot = joinPathFragments("dist", directory, fileName)

  // Compute project identifiers
  const projectName = `${libraryType}-${fileName}`
  const packageName = `${workspaceConfig.scope}/${projectName}`

  // Compute domain name (Title Case from fileName)
  const domainName = schema.description || createDomainName(fileName)

  // Build tags
  const tags = buildTags(libraryType, fileName, allAdditionalTags.length > 0 ? allAdditionalTags : undefined)

  return {
    // Required by BaseTemplateSubstitutions
    tmpl: "" as const,
    name: schema.name,
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
    description: schema.description || domainName
  }
}

// Forward-facing architecture: No backwards compatibility wrappers
// Removed: standardizeGeneratorOptions() and buildGeneratorOptions()
// Use computeLibraryMetadata() directly
