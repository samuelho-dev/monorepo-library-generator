/**
 * Feature Generator Core
 *
 * Generates domain-specific files for feature libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates service implementation and business logic files
 * - Creates RPC routers and handlers (optional)
 * - Generates client-side hooks and state management (optional)
 * - Creates edge middleware (optional)
 * - Supports CQRS structure with placeholders
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/feature-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platforms"
import type { FeatureTemplateOptions } from "../../utils/shared/types"
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates/types-only-exports.template"
import {
  generateAtomsFile,
  generateAtomsIndexFile,
  generateErrorsFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateIndexFile,
  generateLayersFile,
  generateMiddlewareFile,
  generateRpcErrorsFile,
  generateRpcFile,
  generateRpcHandlersFile,
  generateSchemasFile,
  generateServiceSpecFile,
  generateTypesFile
} from "../feature/templates/index"
import { generateFeatureServiceFile, generateFeatureServiceIndexFile } from "../feature/templates/service/index"
import { generateSubServices } from "./sub-services"

/**
 * Feature Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property platform - Target platform (universal, node, browser, edge)
 * @property includeClientServer - Generate client-side hooks and state management
 * @property includeRPC - Generate RPC router and handlers
 * @property includeCQRS - Generate CQRS structure with placeholders
 * @property includeEdge - Generate edge middleware
 */
export interface FeatureCoreOptions {
  readonly name: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly description: string
  readonly tags: string
  readonly offsetFromRoot: string
  readonly workspaceRoot?: string
  readonly platform?: PlatformType
  readonly scope?: string
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
  readonly includeSubServices?: boolean
  readonly subServices?: string
  readonly dataAccessLibrary?: string
  readonly includeClientState?: boolean
}

/**
 * Generator Result
 *
 * Metadata returned after successful generation.
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly filesGenerated: Array<string>
}

/**
 * Generate Feature Library Domain Files
 *
 * Generates only domain-specific files for feature libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateFeatureCore(
  adapter: FileSystemAdapter,
  options: FeatureCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform-specific configuration
    const includeRPC = options.includeRPC ?? false
    const includeCQRS = options.includeCQRS ?? false
    const includeEdge = options.includeEdge ?? false

    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && { includeClientServer: options.includeClientServer }),
        ...(includeEdge && { includeEdge })
      },
      {
        defaultPlatform: "universal",
        libraryType: "feature"
      }
    )

    const { includeClientServer: shouldIncludeClientServer, includeEdge: shouldIncludeEdge } = platformConfig

    // Assemble template options from pre-computed metadata
    const templateOptions: FeatureTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "feature",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      includeClient: shouldIncludeClientServer,
      includeServer: true,
      includeRPC,
      includeCQRS,
      includeEdge: shouldIncludeEdge
    }

    // Generate all domain files
    const filesGenerated: Array<string> = []

    // Compute directory paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const sharedPath = `${sourceLibPath}/shared`
    const serverPath = `${sourceLibPath}/server`
    const rpcPath = `${sourceLibPath}/rpc`
    const clientPath = `${sourceLibPath}/client`
    const edgePath = `${sourceLibPath}/edge`

    // Generate main index.ts (barrel exports)
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Generate types.ts for type-only exports (zero runtime overhead)
    const typesOnlyOptions: TypesOnlyExportOptions = {
      libraryType: "feature",
      className: options.className,
      fileName: options.fileName,
      packageName: options.packageName,
      platform: "server"
    }
    const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
    const workspaceRoot = adapter.getWorkspaceRoot()
    yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent)
    filesGenerated.push(`${options.sourceRoot}/types.ts`)

    // Generate CLAUDE.md with bundle optimization guidance
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.packageName}, a feature library following Effect-based service patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/shared/**: Shared types, errors, and schemas
  - \`errors.ts\`: Data.TaggedError-based error types
  - \`types.ts\`: Domain types, configs, and results
  - \`schemas.ts\`: Schema validation

- **lib/server/**: Server-side business logic
  - \`service/interface.ts\`: Context.Tag with static layers (~5 KB)
  - \`service/index.ts\`: Service barrel export
  - \`layers.ts\`: Layer compositions (Live, Test, Dev, Auto)
  - \`service.spec.ts\`: Service tests
${
      includeRPC ?
        `
- **lib/rpc/**: RPC layer
  - \`rpc.ts\`: RPC router definition
  - \`handlers.ts\`: RPC handlers (~4-8 KB)
  - \`errors.ts\`: RPC-specific errors
` :
        ""
    }${
      shouldIncludeClientServer ?
        `
- **lib/client/**: Client-side state management
  - \`hooks/\`: React hooks
  - \`atoms/\`: Jotai atoms
  - \`components/\`: UI components
` :
        ""
    }${
      shouldIncludeEdge ?
        `
- **lib/edge/**: Edge middleware
  - \`middleware.ts\`: Edge runtime middleware
` :
        ""
    }
### Import Patterns (Most to Least Optimized)

\`\`\`typescript
// 1. Service interface import (smallest bundle ~5 KB)
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/server/service';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { ${templateOptions.className}Config, ${templateOptions.className}Result } from '${templateOptions.packageName}/types';

// 3. Server barrel (~10-15 KB)
import { ${templateOptions.className}Service, ${templateOptions.className}ServiceLayers } from '${templateOptions.packageName}/server';
${
      includeRPC ?
        `
// 4. RPC handlers (~8-12 KB)
import { ${templateOptions.fileName}Handlers } from '${templateOptions.packageName}/rpc/handlers';
` :
        ""
    }
// 5. Package barrel (largest ~20-40 KB depending on features)
import { ${templateOptions.className}Service } from '${templateOptions.packageName}';
\`\`\`

### Customization Guide

1. **Define Service Interface** (\`lib/server/service/interface.ts\`):
   - Add your business logic methods
   - Configure Live layer with dependencies
   - Update Test layer for testing

2. **Implement Business Logic**:
   - Service methods use Effect.gen for composition
   - Yield dependencies via Context.Tag pattern
   - Return Effect types for composability

3. **Configure Layers** (\`lib/server/layers.ts\`):
   - Wire up service dependencies
   - Configure Live layer with actual implementations
   - Customize Test layer for testing
${
      includeRPC ?
        `
4. **Add RPC Endpoints** (\`lib/rpc/\`):
   - Define routes in \`rpc.ts\`
   - Implement handlers in \`handlers.ts\`
   - Keep handlers lightweight (delegate to service)
` :
        ""
    }
### Usage Example

\`\`\`typescript
// Granular import for optimal bundle size
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/server/service';
import type { ${templateOptions.className}Result } from '${templateOptions.packageName}/types';

// Use service in your application
const program = Effect.gen(function* () {
  const service = yield* ${templateOptions.className}Service;
  const result: ${templateOptions.className}Result = yield* service.exampleOperation();
  return result;
});

// Provide layer at application level
const runnable = program.pipe(
  Effect.provide(${templateOptions.className}Service.Live)
);
\`\`\`
${
      includeRPC ?
        `
### RPC Usage

\`\`\`typescript
import { ${templateOptions.fileName}Handlers } from '${templateOptions.packageName}/rpc/handlers';
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/server/service';

// Compose with RPC server
const rpcLayer = Layer.mergeAll(
  ${templateOptions.className}Service.Live,
  // ... other dependencies
);

const server = ${templateOptions.fileName}Handlers.pipe(
  Effect.provide(rpcLayer)
);
\`\`\`
` :
        ""
    }
### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Service interface is lightweight (~5 KB vs ~40 KB for full barrel)
- Each module can be imported independently for optimal tree-shaking
- RPC handlers are separate files for lazy loading
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)
    filesGenerated.push(`${templateOptions.projectRoot}/CLAUDE.md`)

    // Always generate shared layer
    yield* adapter.writeFile(`${sharedPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sharedPath}/errors.ts`)

    yield* adapter.writeFile(`${sharedPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sharedPath}/types.ts`)

    yield* adapter.writeFile(`${sharedPath}/schemas.ts`, generateSchemasFile(templateOptions))
    filesGenerated.push(`${sharedPath}/schemas.ts`)

    // Generate server layer (always generated for features)
    // Create server/service directory for granular service imports
    const servicePath = `${serverPath}/service`
    yield* adapter.makeDirectory(servicePath)

    // Generate service interface (lightweight Context.Tag with static layers)
    yield* adapter.writeFile(`${servicePath}/service.ts`, generateFeatureServiceFile(templateOptions))
    filesGenerated.push(`${servicePath}/service.ts`)

    // Generate service index (barrel export for service)
    yield* adapter.writeFile(`${servicePath}/index.ts`, generateFeatureServiceIndexFile(templateOptions))
    filesGenerated.push(`${servicePath}/index.ts`)

    yield* adapter.writeFile(`${serverPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${serverPath}/layers.ts`)

    yield* adapter.writeFile(`${serverPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${serverPath}/service.spec.ts`)

    // Generate sub-services (conditional)
    if (options.includeSubServices && options.subServices) {
      const subServicesList = options.subServices
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      if (subServicesList.length > 0) {
        yield* generateSubServices(adapter, {
          projectRoot: options.projectRoot,
          sourceRoot: options.sourceRoot,
          packageName: options.packageName,
          subServices: subServicesList
        })

        // Track generated sub-service files
        const servicesPath = `${serverPath}/services`
        filesGenerated.push(`${servicesPath}/index.ts`)
        subServicesList.forEach((serviceName) => {
          filesGenerated.push(`${servicesPath}/${serviceName}/index.ts`)
          filesGenerated.push(`${servicesPath}/${serviceName}/service.ts`)
          filesGenerated.push(`${servicesPath}/${serviceName}/layers.ts`)
          filesGenerated.push(`${servicesPath}/${serviceName}/errors.ts`)
          filesGenerated.push(`${servicesPath}/${serviceName}/types.ts`)
        })
      }
    }

    // Create CQRS directory placeholders (conditional)
    if (includeCQRS) {
      yield* adapter.writeFile(`${serverPath}/commands/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/commands/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/queries/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/queries/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/operations/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/operations/.gitkeep`)

      yield* adapter.writeFile(`${serverPath}/projections/.gitkeep`, "")
      filesGenerated.push(`${serverPath}/projections/.gitkeep`)
    }

    // Generate RPC layer (conditional)
    if (includeRPC) {
      yield* adapter.writeFile(`${rpcPath}/rpc.ts`, generateRpcFile(templateOptions))
      filesGenerated.push(`${rpcPath}/rpc.ts`)

      yield* adapter.writeFile(`${rpcPath}/handlers.ts`, generateRpcHandlersFile(templateOptions))
      filesGenerated.push(`${rpcPath}/handlers.ts`)

      yield* adapter.writeFile(`${rpcPath}/errors.ts`, generateRpcErrorsFile(templateOptions))
      filesGenerated.push(`${rpcPath}/errors.ts`)
    }

    // Generate client layer (conditional)
    if (shouldIncludeClientServer) {
      yield* adapter.writeFile(`${clientPath}/hooks/use-${options.fileName}.ts`, generateHooksFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/use-${options.fileName}.ts`)

      yield* adapter.writeFile(`${clientPath}/hooks/index.ts`, generateHooksIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/hooks/index.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/${options.fileName}-atoms.ts`, generateAtomsFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/${options.fileName}-atoms.ts`)

      yield* adapter.writeFile(`${clientPath}/atoms/index.ts`, generateAtomsIndexFile(templateOptions))
      filesGenerated.push(`${clientPath}/atoms/index.ts`)

      yield* adapter.writeFile(`${clientPath}/components/.gitkeep`, "")
      filesGenerated.push(`${clientPath}/components/.gitkeep`)
    }

    // Generate edge layer (conditional)
    if (shouldIncludeEdge) {
      yield* adapter.writeFile(`${edgePath}/middleware.ts`, generateMiddlewareFile(templateOptions))
      filesGenerated.push(`${edgePath}/middleware.ts`)
    }

    // Platform-specific barrel exports removed - rely on automatic tree-shaking
    // All exports are now handled through the main index.ts

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
