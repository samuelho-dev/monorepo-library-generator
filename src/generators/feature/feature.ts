/**
 * Feature Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates feature generator core with Nx workspace.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to feature-generator-core.ts for domain-specific
 *    files (service, layers, types, etc.)
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
import { generateFeatureCore } from "../core/feature"
import type { FeatureGeneratorSchema } from "./schema"

/**
 * Feature Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  // Validate required options
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  // Compute platform-specific configuration
  const includeClientServer = schema.includeClientServer
  const includeRPC = schema.includeRPC ?? false
  const includeCQRS = schema.includeCQRS ?? false
  const includeEdge = schema.includeEdge ?? false
  const platformConfig = computePlatformConfiguration(
    {
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(includeEdge && { includeEdge })
    },
    {
      defaultPlatform: "universal",
      libraryType: "feature"
    }
  )
  const { includeClientServer: shouldIncludeClientServer, includeEdge: shouldIncludeEdge, platform } = platformConfig

  // Build tags using shared tag utility
  const defaultTags = [
    "type:feature",
    `scope:${schema.scope || schema.name}`,
    `platform:${platform}`
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "feature",
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
      libraryType: "feature",
      platform,
      offsetFromRoot: metadata.offsetFromRoot,
      tags,
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(includeEdge && { includeEdgeExports: includeEdge }),
      ...(includeRPC && { includeRPC })
    })
  )

  // Register project with Nx (if project configuration was returned)
  if (infraResult.requiresNxRegistration && infraResult.projectConfig) {
    addProjectConfiguration(tree, metadata.projectName, infraResult.projectConfig)
  }

  // Phase 2: Generate domain-specific files via core generator
  const coreOptions: Parameters<typeof generateFeatureCore>[1] = {
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
    ...(schema.scope !== undefined && { scope: schema.scope }),
    ...(includeClientServer !== undefined && { includeClientServer }),
    includeRPC,
    includeCQRS,
    includeEdge
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateFeatureCore(adapter, coreOptions)
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
✅ Feature library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}${dotfilesMessage}

🎯 Configuration:
   - Platform: ${platform}
   - Scope: ${schema.scope || schema.name}
   - ✅ Server exports generated
${shouldIncludeClientServer ? "   - ✅ Client exports generated" : "   - No client exports"}
${includeRPC ? "   - ✅ RPC router enabled" : "   - No RPC router"}
${includeCQRS ? "   - ✅ CQRS structure enabled" : "   - No CQRS structure"}
${shouldIncludeEdge ? "   - ✅ Edge runtime support enabled" : "   - No edge runtime support"}

🎯 Next Steps:
1. Customize service implementation (see TODO comments):
   - ${result.sourceRoot}/lib/server/service.ts - Implement business logic
   - ${result.sourceRoot}/lib/server/errors.ts  - Add domain-specific errors
${includeRPC ? `   - ${result.sourceRoot}/lib/rpc/handlers.ts   - Implement RPC handlers\n` : ""}
${shouldIncludeClientServer ? `   - ${result.sourceRoot}/lib/client/hooks      - Add React hooks\n` : ""}

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for feature patterns
   - See ${result.projectRoot}/README.md for usage examples
    `)
  }
}
