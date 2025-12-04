/**
 * Provider Generator
 *
 * Generates a provider library following Effect-based architecture patterns
 * with standardized structure, configuration, and build setup.
 *
 * Uses centralized library generation utilities for consistency.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles, installPackagesTask } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createNamingVariants } from "../../utils/naming-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateProviderCore, type GeneratorResult } from "../core/provider-generator-core"
import type { ProviderGeneratorSchema } from "./schema"

/**
 * Main provider generator function
 *
 * Generates a provider library following Effect-based architecture patterns
 * with standardized structure, configuration, and build setup.
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

  // Platform determination
  const platform = schema.platform || "node"
  const includeClientServer = platform === "universal" ? true : (schema.includeClientServer ?? false)

  // Provider-specific tags: always use "scope:provider" instead of computed scope
  const serviceTag = `service:${createNamingVariants(schema.externalService).fileName}`
  const defaultTags = [
    "type:provider",
    "scope:provider", // Providers always use "provider" scope
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

  // 1. Generate base library files using centralized utility
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "provider",
    platform,
    description: metadata.description,
    tags,
    includeClientServer,
    includeEdgeExports: platform === "edge"
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateProviderCore>[1] = {
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
    tags: metadata.tags,

    // Provider-specific options
    externalService: schema.externalService,
    platform
  }

  // 3. Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateProviderCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // 4. Format files
  await formatFiles(tree)

  // 5. Return post-generation instructions
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
