/**
 * Data Access Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates data-access generator core with Nx workspace.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to data-access-generator-core.ts for domain-specific
 *    files (repository, queries, validation, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files)
 * - Consistent behavior with CLI generators
 * - Mode-aware generation (registers project.json with Nx)
 */

import type { Tree } from "@nx/devkit"
import { addProjectConfiguration, formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateDataAccessCore } from "../core/data-access"
import type { DataAccessGeneratorSchema } from "./schema"

/**
 * Data Access Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Data access name is required and cannot be empty")
  }

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "data-access",
    ["scope:shared", "platform:server"]
  )

  // Parse tags from metadata
  const tags = metadata.tags.split(",").map((t) => t.trim())

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
      libraryType: "data-access",
      platform: "node",
      offsetFromRoot: metadata.offsetFromRoot,
      tags
    })
  )

  // Register project with Nx (if project configuration was returned)
  if (infraResult.requiresNxRegistration && infraResult.projectConfig) {
    addProjectConfiguration(tree, metadata.projectName, infraResult.projectConfig)
  }

  // Phase 2: Generate domain-specific files via core generator
  const coreOptions: Parameters<typeof generateDataAccessCore>[1] = {
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
    tags: metadata.tags
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateDataAccessCore(adapter, coreOptions)
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    console.log(`
✅ Data Access library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}

🎯 Next Steps:
1. Customize repository implementation (see TODO comments):
   - ${result.sourceRoot}/lib/repository.ts - Implement CRUD operations
   - ${result.sourceRoot}/lib/queries.ts    - Add query builders
   - ${result.sourceRoot}/lib/shared/types.ts - Define entity types

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See ${result.projectRoot}/README.md for usage examples
    `)
  }
}
