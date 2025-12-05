/**
 * Contract Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates contract generator core with Nx workspace.
 *
 * Two-Phase Generation:
 * 1. **Infrastructure Phase**: Uses infrastructure.ts to generate
 *    all infrastructure files (package.json, tsconfig files, vitest.config.ts, etc.)
 * 2. **Domain Phase**: Delegates to contract-generator-core.ts for domain-specific
 *    files (entities, errors, ports, events, etc.)
 *
 * The infrastructure generator ensures:
 * - Complete infrastructure (7 files including CLAUDE.md)
 * - Consistent behavior with CLI generators
 * - Mode-aware generation (registers project.json with Nx)
 */

import type { Tree } from "@nx/devkit"
import { addProjectConfiguration, formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { generateLibraryInfrastructure } from "../../utils/infrastructure"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateContractCore } from "../core/contract"
import type { ContractGeneratorSchema } from "./schema"

/**
 * Contract Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
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

  // Parse tags from metadata
  const tags = metadata.tags.split(",").map((t) => t.trim())

  // Create TreeAdapter for Nx integration
  const adapter = createTreeAdapter(tree)

  // Parse entities (supports comma-separated string or array)
  let entities: ReadonlyArray<string> | undefined
  if (schema.entities) {
    if (typeof schema.entities === "string") {
      entities = schema.entities.split(",").map((e) => e.trim()).filter((e) => e.length > 0)
    } else {
      entities = schema.entities
    }
  }

  // Phase 1: Generate infrastructure files using infrastructure generator
  const infraResult = await Effect.runPromise(
    generateLibraryInfrastructure(adapter, {
      projectName: metadata.projectName,
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      packageName: metadata.packageName,
      description: metadata.description,
      libraryType: "contract",
      platform: "universal",
      offsetFromRoot: metadata.offsetFromRoot,
      tags,
      ...(schema.includeRPC !== undefined && { includeRPC: schema.includeRPC }),
      ...(entities !== undefined && { entities })
    })
  )

  // Register project with Nx (if project configuration was returned)
  if (infraResult.requiresNxRegistration && infraResult.projectConfig) {
    addProjectConfiguration(tree, metadata.projectName, infraResult.projectConfig)
  }

  // Phase 2: Generate domain-specific files via core generator
  const coreOptions: Parameters<typeof generateContractCore>[1] = {
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

    // Feature flags and entities
    includeCQRS: schema.includeCQRS ?? false,
    includeRPC: schema.includeRPC ?? false,
    ...(entities && { entities })
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateContractCore(adapter, coreOptions)
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
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
