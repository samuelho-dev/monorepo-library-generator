/**
 * Feature Library Generator
 *
 * Generates feature libraries following Effect-based architecture patterns.
 * Creates services, RPC routers, state management, and business logic orchestration.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { generateLibraryFiles } from "../../utils/library-generator-utils"
import { normalizeBaseOptions, type NormalizedBaseOptions } from "../../utils/normalization-utils"
import type { FeatureTemplateOptions } from "../../utils/shared/types"
import type { FeatureGeneratorSchema } from "./schema"
import {
  generateAtomsFile,
  generateAtomsIndexFile,
  generateErrorsFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateLayersFile,
  generateMiddlewareFile,
  generateRpcErrorsFile,
  generateRpcFile,
  generateRpcHandlersFile,
  generateSchemasFile,
  generateServiceFile,
  generateServiceSpecFile,
  generateTypesFile
} from "./templates/index"

/**
 * Normalized options with computed values
 */
type NormalizedFeatureOptions = NormalizedBaseOptions

/**
 * Main generator function
 */
export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  // Validate required options
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  const options = normalizeOptions(tree, schema)

  // Feature flags
  const includeClientServer = schema.includeClientServer // Keep undefined to allow platform defaults
  const includeRPC = schema.includeRPC ?? false
  const includeCQRS = schema.includeCQRS ?? false
  const includeEdge = schema.includeEdge ?? false

  // CORRECTED: Platform is explicit from schema, with universal as default for features
  // (Features can work in both server and browser contexts)
  const platform = schema.platform || "universal"

  // CORRECTED: Entry point logic follows OR-based pattern from library-generator-utils.ts
  const shouldGenerateServer = includeClientServer ||
    platform === "node" ||
    platform === "universal"

  const shouldGenerateClient = includeClientServer ||
    platform === "browser" ||
    platform === "universal"

  // Build tags with corrected scope logic
  let tags = [
    "type:feature",
    `scope:${schema.scope || schema.name}`
  ]

  // Add platform tag for all platforms
  if (platform) {
    tags.push(`platform:${platform}`)
  }

  // Add any additional user tags
  if (schema.tags) {
    tags = tags.concat(schema.tags.split(",").map((t) => t.trim()))
  }

  // 1. Generate base library files using centralized utility
  const libraryOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: "feature" as const,
    platform,
    description: options.description,
    tags,
    ...(includeClientServer !== undefined && { includeClientServer }),
    includeEdgeExports: includeEdge,
    includeRPC
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using code-based templates
  const templateOptions: FeatureTemplateOptions = {
    // Naming variants
    name: options.name,
    className: options.className,
    propertyName: options.propertyName,
    fileName: options.fileName,
    constantName: options.constantName,

    // Library metadata
    libraryType: "feature",
    packageName: options.packageName,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    sourceRoot: options.sourceRoot,
    offsetFromRoot: options.offsetFromRoot,
    description: options.description,
    tags,

    // Feature flags
    includeClient: shouldGenerateClient,
    includeServer: shouldGenerateServer,
    includeRPC,
    includeCQRS,
    includeEdge
  }

  const sourceLibPath = `${options.sourceRoot}/lib`
  const sharedPath = `${sourceLibPath}/shared`
  const serverPath = `${sourceLibPath}/server`
  const rpcPath = `${sourceLibPath}/rpc`
  const clientPath = `${sourceLibPath}/client`
  const edgePath = `${sourceLibPath}/edge`

  // Always generate shared layer
  tree.write(`${sharedPath}/errors.ts`, generateErrorsFile(templateOptions))
  tree.write(`${sharedPath}/types.ts`, generateTypesFile(templateOptions))
  tree.write(`${sharedPath}/schemas.ts`, generateSchemasFile(templateOptions))

  // Generate server layer (conditional)
  if (shouldGenerateServer) {
    tree.write(`${serverPath}/service.ts`, generateServiceFile(templateOptions))
    tree.write(`${serverPath}/layers.ts`, generateLayersFile(templateOptions))
    tree.write(`${serverPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))

    // Create CQRS directory placeholders (conditional)
    if (includeCQRS) {
      tree.write(`${serverPath}/commands/.gitkeep`, "")
      tree.write(`${serverPath}/queries/.gitkeep`, "")
      tree.write(`${serverPath}/operations/.gitkeep`, "")
      tree.write(`${serverPath}/projections/.gitkeep`, "")
    }
  }

  // Generate RPC layer (conditional)
  if (includeRPC) {
    tree.write(`${rpcPath}/rpc.ts`, generateRpcFile(templateOptions))
    tree.write(`${rpcPath}/handlers.ts`, generateRpcHandlersFile(templateOptions))
    tree.write(`${rpcPath}/errors.ts`, generateRpcErrorsFile(templateOptions))
  }

  // Generate client layer (conditional)
  if (shouldGenerateClient) {
    tree.write(`${clientPath}/hooks/use-${options.fileName}.ts`, generateHooksFile(templateOptions))
    tree.write(`${clientPath}/hooks/index.ts`, generateHooksIndexFile(templateOptions))
    tree.write(`${clientPath}/atoms/${options.fileName}-atoms.ts`, generateAtomsFile(templateOptions))
    tree.write(`${clientPath}/atoms/index.ts`, generateAtomsIndexFile(templateOptions))
    tree.write(`${clientPath}/components/.gitkeep`, "")
  }

  // Generate edge layer (conditional)
  if (includeEdge) {
    tree.write(`${edgePath}/middleware.ts`, generateMiddlewareFile(templateOptions))
  }

  // 3. Format files
  await formatFiles(tree)

  // 5. Return post-generation instructions
  return () => {
    console.log(`
✅ Feature library created: ${options.packageName}

📁 Location: ${options.projectRoot}
📦 Package: ${options.packageName}

🎯 Configuration:
   - Platform: ${platform}
   - Scope: ${schema.scope || schema.name}
${shouldGenerateServer ? "   - ✅ Server exports generated" : "   - No server exports"}
${shouldGenerateClient ? "   - ✅ Client exports generated" : "   - No client exports"}
${includeRPC ? "   - ✅ RPC router enabled" : "   - No RPC router"}
${includeCQRS ? "   - ✅ CQRS structure enabled" : "   - No CQRS structure"}
${includeEdge ? "   - ✅ Edge runtime support enabled" : "   - No edge runtime support"}

🎯 Next Steps:
1. Customize service implementation (see TODO comments):
   - ${options.sourceRoot}/lib/server/service.ts - Implement business logic
   - ${options.sourceRoot}/lib/server/errors.ts  - Add domain-specific errors
${includeRPC ? `   - ${options.sourceRoot}/lib/rpc/handlers.ts   - Implement RPC handlers\n` : ""}
${includeClientServer ? `   - ${options.sourceRoot}/lib/client/hooks      - Add React hooks\n` : ""}

2. Build and test:
   - pnpm exec nx build ${options.projectName} --batch
   - pnpm exec nx test ${options.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for feature patterns
   - See ${options.projectRoot}/README.md for usage examples
    `)
  }
}

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: FeatureGeneratorSchema
): NormalizedFeatureOptions {
  // Use shared normalization utility for common fields
  return normalizeBaseOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && { description: schema.description }),
    libraryType: "feature",
    additionalTags: ["platform:universal"] // Features default to universal
  })
}
