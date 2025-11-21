/**
 * Provider Generator
 *
 * Generates a provider library following Effect-based architecture patterns
 * with standardized structure, configuration, and build setup.
 *
 * Uses centralized library generation utilities for consistency.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles, installPackagesTask, names } from "@nx/devkit"
import { Effect } from "effect"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { normalizeBaseOptions } from "../../utils/normalization-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateProviderCore, type GeneratorResult } from "../core/provider-generator-core"
import type { NormalizedProviderOptions, ProviderGeneratorSchema } from "./schema"

/**
 * Normalize and validate generator options
 */
function normalizeOptions(
  tree: Tree,
  options: ProviderGeneratorSchema
): NormalizedProviderOptions {
  // Validate required fields
  if (!options.name || options.name.trim() === "") {
    throw new Error("Provider name is required")
  }
  if (!options.externalService || options.externalService.trim() === "") {
    throw new Error("External service name is required")
  }

  // Platform determination
  const platform = options.platform || "node"
  const includeClientServer = platform === "universal" ? true : (options.includeClientServer ?? false)

  // Use shared normalization (without additional tags, we'll build tags manually)
  const baseOptions = normalizeBaseOptions(tree, {
    name: options.name,
    ...(options.directory !== undefined && { directory: options.directory }),
    description: options.description ?? `${names(options.name).className} provider for ${options.externalService}`,
    libraryType: "provider"
  })

  // Provider-specific naming: use "Service" suffix instead of "Provider"
  const projectClassName = `${baseOptions.className}Service`
  const projectConstantName = `${baseOptions.constantName}_SERVICE`

  // Provider-specific tags: always use "scope:provider" instead of "scope:${fileName}"
  const serviceTag = `service:${names(options.externalService).fileName}`
  const defaultTags = [
    "type:provider",
    "scope:provider", // Providers always use "provider" scope
    `platform:${platform}`,
    serviceTag
  ]
  const parsedTags = options.tags ? [...defaultTags, ...options.tags.split(",").map((t) => t.trim())] : defaultTags

  return {
    ...baseOptions,
    externalService: options.externalService,
    platform,
    includeClientServer,
    projectClassName,
    projectConstantName,
    parsedTags
  }
}


/**
 * Main provider generator function
 *
 * Simplified to use centralized library generation utilities.
 * This ensures consistency across all library types.
 */
export default async function providerGenerator(
  tree: Tree,
  options: ProviderGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options)

  // Generate ALL library files using centralized utility
  const libraryOptions: LibraryGeneratorOptions = {
    name: normalizedOptions.name,
    projectName: normalizedOptions.projectName,
    projectRoot: normalizedOptions.projectRoot,
    offsetFromRoot: normalizedOptions.offsetFromRoot,
    libraryType: "provider",
    platform: normalizedOptions.platform,
    description: normalizedOptions.description,
    tags: normalizedOptions.parsedTags,
    includeClientServer: normalizedOptions.includeClientServer,
    includeEdgeExports: normalizedOptions.platform === "edge",
    templateData: {
      externalService: normalizedOptions.externalService,
      projectClassName: normalizedOptions.projectClassName,
      projectConstantName: normalizedOptions.projectConstantName
    }
  }

  await generateLibraryFiles(tree, libraryOptions)

  // Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions = {
    name: normalizedOptions.name,
    className: normalizedOptions.className,
    propertyName: normalizedOptions.propertyName,
    fileName: normalizedOptions.fileName,
    constantName: normalizedOptions.constantName,
    projectName: normalizedOptions.projectName,
    projectRoot: normalizedOptions.projectRoot,
    sourceRoot: normalizedOptions.sourceRoot,
    packageName: normalizedOptions.packageName,
    description: normalizedOptions.description,
    tags: normalizedOptions.parsedTags.join(","), // Convert array to comma-separated string for core
    offsetFromRoot: normalizedOptions.offsetFromRoot,
    externalService: normalizedOptions.externalService,
    platform: normalizedOptions.platform
  }

  // Use shared core via Effect
  await Effect.runPromise(
    generateProviderCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // Format files and install packages
  await formatFiles(tree)
  return () => {
    installPackagesTask(tree)
  }
}
