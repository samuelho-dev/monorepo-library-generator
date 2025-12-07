/**
 * Infrastructure Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates infrastructure generator core with Nx workspace.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to infra-generator-core.ts for domain-specific
 *    files (service, providers, configuration, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with CLI generators
 * - Platform-aware exports (client/server/edge)
 */

import type { Tree } from "@nx/devkit"
import { addProjectConfiguration, formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generators"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { computePlatformConfiguration } from "../../utils/platforms"
import { addDotfilesToLibrary } from "../../utils/shared/dotfile-generation"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateInfraCore } from "../core/infra"
import type { InfraGeneratorSchema } from "./schema"

/**
 * Infrastructure Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Infra name is required and cannot be empty")
  }

  // Compute platform-specific configuration
  const platformConfig = computePlatformConfiguration(
    {
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(schema.includeClientServer !== undefined && { includeClientServer: schema.includeClientServer }),
      ...(schema.includeEdge !== undefined && { includeEdge: schema.includeEdge })
    },
    {
      defaultPlatform: "node",
      libraryType: "infra"
    }
  )
  const { includeClientServer, includeEdge, platform } = platformConfig

  // Build tags using shared tag utility
  const defaultTags = [
    "type:infra",
    "scope:shared",
    `platform:${platform}`
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "infra",
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
      libraryType: "infra",
      platform,
      offsetFromRoot: metadata.offsetFromRoot,
      tags,
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(includeEdge && { includeEdgeExports: includeEdge })
    })
  )

  // Register project with Nx (if project configuration was returned)
  if (infraResult.requiresNxRegistration && infraResult.projectConfig) {
    addProjectConfiguration(tree, metadata.projectName, infraResult.projectConfig)
  }

  // Phase 2: Generate domain-specific files via core generator
  const coreOptions: Parameters<typeof generateInfraCore>[1] = {
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

    // Feature flags
    platform,
    ...(includeClientServer !== undefined && { includeClientServer }),
    ...(includeEdge !== undefined && { includeEdge })
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateInfraCore(adapter, coreOptions)
  )

  // Phase 3: Add dotfiles for Effect.ts code quality enforcement
  const addDotfiles = schema.addDotfiles ?? true
  if (addDotfiles) {
    await Effect.runPromise(
      addDotfilesToLibrary(adapter, {
        projectRoot: metadata.projectRoot,
        includeVSCodeSettings: schema.includeVSCodeSettings ?? true,
        overwrite: schema.overwriteDotfiles ?? false
      })
    )
  }

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    const dotfilesMessage = addDotfiles
      ? "\n✨ Dotfiles: Effect.ts code quality enforcement enabled"
      : ""

    console.log(`
✅ Infrastructure library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}${dotfilesMessage}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your service.

Next steps:
1. Customize service implementation (see TODO comments):
   - ${result.sourceRoot}/lib/service/interface.ts - Define service interface
   - ${result.sourceRoot}/lib/service/errors.ts    - Add domain-specific errors
   - ${result.sourceRoot}/lib/service/config.ts    - Add configuration
   - ${result.sourceRoot}/lib/providers/memory.ts  - Implement providers

2. Review the comprehensive README:
   - ${result.projectRoot}/README.md - Customization guide & examples

3. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

4. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for infrastructure patterns
   - See ${result.projectRoot}/README.md for customization examples

Platform configuration:
${includeClientServer ? "   - ✅ Client/Server separation enabled" : "   - Server-only (no client separation)"}
${includeEdge ? "   - ✅ Edge runtime support enabled" : "   - No edge runtime support"}
    `)
  }
}
