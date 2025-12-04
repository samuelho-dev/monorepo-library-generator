/**
 * Infrastructure Library Generator
 *
 * Generates infrastructure libraries following Effect-based architecture patterns.
 * Creates services, configuration, layers, and providers for cross-cutting concerns.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { computeLibraryMetadata, type LibraryMetadata } from "../../utils/library-metadata"
import { computePlatformConfiguration } from "../../utils/platform-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateInfraCore, type GeneratorResult } from "../core/infra-generator-core"
import type { InfraGeneratorSchema } from "./schema"

/**
 * Normalized options with computed values
 */
type NormalizedInfraOptions = LibraryMetadata

/**
 * Main generator function
 */
export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(tree, schema, "infra")

  // Use shared platform configuration helper
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

  // 1. Generate base library files (project.json, package.json, tsconfig, etc.)
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "infra",
    platform,
    description: metadata.description,
    tags,
    includeClientServer,
    includeEdgeExports: includeEdge
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions = {
    name: metadata.name,
    className: metadata.className,
    propertyName: metadata.propertyName,
    fileName: metadata.fileName,
    constantName: metadata.constantName,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    sourceRoot: metadata.sourceRoot,
    packageName: metadata.packageName,
    description: metadata.description,
    tags: tags.join(","), // Convert array to comma-separated string for core
    offsetFromRoot: metadata.offsetFromRoot,
    platform,
    ...(includeClientServer !== undefined && { includeClientServer }),
    ...(includeEdge && { includeEdge })
  }

  // Use shared core via Effect
  const result = await Effect.runPromise(
    generateInfraCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // 3. Format files
  await formatFiles(tree)

  // 4. Return post-generation instructions
  return () => {
    console.log(`
✅ Infrastructure library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}

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
