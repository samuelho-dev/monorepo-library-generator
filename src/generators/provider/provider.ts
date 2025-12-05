/**
 * Provider Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates provider generator core with Nx workspace.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to provider-generator-core.ts for domain-specific
 *    files (service wrapper, layers, types, validation, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with CLI generators
 * - External service SDK integration patterns
 */

import type { Tree } from "@nx/devkit"
import { addProjectConfiguration, formatFiles, installPackagesTask } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generators"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createNamingVariants } from "../../utils/naming"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateProviderCore } from "../core/provider"
import type { ProviderGeneratorSchema } from "./schema"

/**
 * Provider Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function providerGenerator(
  tree: Tree,
  schema: ProviderGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Provider name is required and cannot be empty")
  }
  if (!schema.externalService || schema.externalService.trim() === "") {
    throw new Error("External service name is required and cannot be empty")
  }

  // Compute platform configuration
  const platform = schema.platform || "node"
  const includeClientServer = platform === "universal" ? true : (schema.includeClientServer ?? false)

  // Build provider-specific tags (always use "scope:provider")
  const serviceTag = `service:${createNamingVariants(schema.externalService).fileName}`
  const defaultTags = [
    "type:provider",
    "scope:provider",
    `platform:${platform}`,
    serviceTag
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "provider",
    defaultTags
  )

  // Create TreeAdapter for Nx integration
  const adapter = createTreeAdapter(tree)

  // Phase 1: Generate infrastructure files using infrastructure generator
  const infraResult = await Effect.runPromise(
    generateLibraryInfrastructure(adapter, {
      projectName: metadata.projectName,
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      packageName: metadata.packageName,
      description: metadata.description,
      libraryType: "provider",
      platform,
      offsetFromRoot: metadata.offsetFromRoot,
      tags,
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(platform === "edge" && { includeEdgeExports: true })
    })
  )

  // Register project with Nx (if project configuration was returned)
  if (infraResult.requiresNxRegistration && infraResult.projectConfig) {
    addProjectConfiguration(tree, metadata.projectName, infraResult.projectConfig)
  }

  // Phase 2: Generate domain-specific files via core generator
  const coreOptions: Parameters<typeof generateProviderCore>[1] = {
    // Pre-computed metadata
    name: metadata.name,
    className: metadata.className,
    propertyName: metadata.propertyName,
    fileName: metadata.fileName,
    constantName: metadata.constantName,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    sourceRoot: metadata.sourceRoot,
    packageName: metadata.packageName,
    offsetFromRoot: metadata.offsetFromRoot,
    description: metadata.description,
    tags: metadata.tags,

    // Provider-specific options
    externalService: schema.externalService,
    platform
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateProviderCore(adapter, coreOptions)
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    console.log(`
✅ Provider library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}
🔌 External Service: ${schema.externalService}

🎯 Configuration:
   - Platform: ${platform}
${includeClientServer ? "   - ✅ Client/Server separation enabled" : "   - Server-only (no client separation)"}

🎯 Next Steps:
1. Customize provider implementation (see TODO comments):
   - ${result.sourceRoot}/lib/service.ts     - Implement service methods
   - ${result.sourceRoot}/lib/types.ts       - Define types
   - ${result.sourceRoot}/lib/validation.ts  - Add validation
   - ${result.sourceRoot}/lib/errors.ts      - Add domain-specific errors

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for provider patterns
   - See ${result.projectRoot}/README.md for usage examples
    `)
    installPackagesTask(tree)
  }
}
