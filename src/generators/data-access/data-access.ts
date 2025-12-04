/**
 * Data Access Library Generator (Nx Wrapper)
 *
 * Thin wrapper around the shared data-access generator core.
 * Uses Nx Tree API via TreeAdapter.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import type { FileSystemErrors } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateDataAccessCore, type GeneratorResult } from "../core/data-access-generator-core"
import type { DataAccessGeneratorSchema } from "./schema"

/**
 * Data access generator for Nx workspaces
 *
 * Generates a data-access library following Effect-based repository patterns.
 * Creates repositories, queries, and data layers.
 *
 * @param tree - Nx Tree API for virtual file system
 * @param schema - Generator options from user
 * @returns Callback function for post-generation console output
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

  // Parse tags from metadata (already includes defaults)
  const tags = metadata.tags.split(",").map(t => t.trim())

  // 1. Generate base library files using centralized utility
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "data-access",
    platform: "node",
    description: metadata.description,
    tags
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateDataAccessCore>[1] = {
    // Pass pre-computed metadata from wrapper
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

  // 3. Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateDataAccessCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, FileSystemErrors, never>
  )

  // 4. Format files
  await formatFiles(tree)

  // 5. Return post-generation instructions
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

// Forward-facing architecture: No wrapper function needed
// computeLibraryMetadata() is called directly above
