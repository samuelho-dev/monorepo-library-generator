/**
 * Contract Library Generator (Nx Wrapper)
 *
 * Thin wrapper around the shared contract generator core.
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
import { generateContractCore, type GeneratorResult } from "../core/contract-generator-core"
import type { ContractGeneratorSchema } from "./schema"

/**
 * Contract generator for Nx workspaces
 *
 * Generates a contract library following Effect-based architecture patterns.
 * Creates entities, errors, events, and ports for a domain.
 *
 * @param tree - Nx Tree API for virtual file system
 * @param schema - Generator options from user
 * @returns Callback function for post-generation console output
 */
export default async function contractGenerator(
  tree: Tree,
  schema: ContractGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Contract name is required and cannot be empty")
  }

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "contract",
    ["platform:universal"]
  )

  // Parse tags from metadata (already includes defaults)
  const tags = metadata.tags.split(",").map(t => t.trim())

  // 1. Generate base library files using centralized utility
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "contract",
    platform: "universal",
    description: metadata.description,
    tags
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)

  // Parse entities if provided (comma-separated string)
  let entities: ReadonlyArray<string> | undefined
  if (schema.entities) {
    if (typeof schema.entities === "string") {
      // Split on comma and trim whitespace
      entities = schema.entities.split(",").map((e) => e.trim()).filter((e) => e.length > 0)
    } else {
      entities = schema.entities
    }
  }

  const coreOptions: Parameters<typeof generateContractCore>[1] = {
    name: schema.name,
    ...(schema.description && { description: schema.description }),
    ...(schema.tags && { tags: schema.tags }),
    ...(schema.directory && { directory: schema.directory }),
    ...(entities && { entities }),
    includeCQRS: schema.includeCQRS ?? false,
    includeRPC: schema.includeRPC ?? false,
    workspaceRoot: tree.root
  }

  // 3. Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateContractCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, FileSystemErrors, never>
  )

  // 5. Format files
  await formatFiles(tree)

  // 6. Return post-generation instructions
  return () => {
    const entityCount = entities?.length ?? 1
    const entityList = entities?.join(", ") ?? metadata.className

    console.log(`
✅ Contract library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}
🎯 Entities: ${entityCount} (${entityList})

⚡ Bundle Optimization Features:
   ✓ Separate entity files for tree-shaking
   ✓ Granular package.json exports
   ✓ Type-only imports (zero runtime overhead)

   Import examples:
   - Granular:  import { Product } from '${result.packageName}/entities/product'
   - Barrel:    import { Product } from '${result.packageName}/entities'
   - Type-only: import type { Product } from '${result.packageName}/types'

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your domain.

🎯 Next Steps:
1. Customize domain files (see TODO comments in each file):
   - ${result.sourceRoot}/lib/entities/* - Add your domain fields to each entity
   - ${result.sourceRoot}/lib/errors.ts  - Add domain-specific errors
   - ${result.sourceRoot}/lib/events.ts  - Add custom events
   - ${result.sourceRoot}/lib/ports.ts   - Add repository/service methods

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See ${result.projectRoot}/README.md for customization examples
    `)
  }
}

// Forward-facing architecture: No wrapper function needed
// computeLibraryMetadata() is called directly above
