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

import { Effect } from 'effect'
import { computePlatformConfiguration, type PlatformType } from '../../utils/build'
import type { FileSystemAdapter } from '../../utils/filesystem'
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from '../../utils/templates'
import type { FeatureTemplateOptions } from '../../utils/types'
import {
  generateAtomsFile,
  generateAtomsIndexFile,
  // CQRS templates
  generateCommandsBaseFile,
  generateCommandsIndexFile,
  generateCqrsIndexFile,
  generateErrorsFile,
  // Events templates (PubSub integration)
  generateEventsPublisherFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateIndexFile,
  // Jobs templates (Queue integration)
  generateJobsQueueFile,
  generateLayersFile,
  generateOperationsExecutorFile,
  generateOperationsIndexFile,
  generateProjectionsBuilderFile,
  generateProjectionsIndexFile,
  generateQueriesBaseFile,
  generateQueriesIndexFile,
  generateRpcBarrelFile,
  generateRpcErrorsFile,
  // RPC templates (Contract-First architecture)
  generateRpcHandlersFile,
  generateRpcRouterFile,
  generateSchemasFile,
  generateServiceSpecFile,
  // Sub-module CQRS bus
  generateSubModuleCqrsBusFile,
  generateTypesFile
} from '../feature/templates/index'
import {
  generateFeatureServiceFile,
  generateFeatureServiceIndexFile
} from '../feature/templates/service/index'
import { generateSubModules } from './sub-modules'

/**
 * Feature Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property platform - Target platform (universal, node, browser)
 * @property includeClientServer - Generate client-side hooks and state management
 * @property includeCQRS - Generate CQRS structure with placeholders
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
  readonly includeCQRS?: boolean
  readonly includeSubModules?: boolean
  readonly subModules?: string
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
  readonly filesGenerated: string[]
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
export function generateFeatureCore(adapter: FileSystemAdapter, options: FeatureCoreOptions) {
  return Effect.gen(function* () {
    // Compute platform-specific configuration
    const includeCQRS = options.includeCQRS ?? false

    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && {
          includeClientServer: options.includeClientServer
        })
      },
      {
        defaultPlatform: 'universal',
        libraryType: 'feature'
      }
    )

    const { includeClientServer: shouldIncludeClientServer } = platformConfig

    // Parse sub-modules if provided
    const subModulesList =
      options.includeSubModules && options.subModules
        ? options.subModules
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

    // Assemble template options from pre-computed metadata
    const templateOptions: FeatureTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: 'feature',
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(','),
      includeClient: shouldIncludeClientServer,
      includeServer: true,
      includeCQRS,
      subModules: subModulesList
    }

    // Generate all domain files
    const filesGenerated: string[] = []

    // Compute directory paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const sharedPath = `${sourceLibPath}/shared`
    const serverPath = `${sourceLibPath}/server`
    const rpcPath = `${sourceLibPath}/rpc`
    const clientPath = `${sourceLibPath}/client`

    // Generate main index.ts (barrel exports)
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Generate types.ts for type-only exports (zero runtime overhead)
    const typesOnlyOptions: TypesOnlyExportOptions = {
      libraryType: 'feature',
      className: options.className,
      fileName: options.fileName,
      packageName: options.packageName,
      platform: 'server'
    }
    const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
    const workspaceRoot = adapter.getWorkspaceRoot()
    yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent)
    filesGenerated.push(`${options.sourceRoot}/types.ts`)

    // Generate CLAUDE.md with bundle optimization guidance
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.packageName}, a feature library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Domain types, configs, and results
- **lib/schemas.ts**: Schema validation
- **lib/rpc.ts**: RPC route definitions
- **lib/handlers.ts**: RPC handler implementations
${
  shouldIncludeClientServer
    ? `- **lib/client/hooks/**: React hooks
- **lib/client/atoms/**: Jotai atoms`
    : ''
}

### Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { ${templateOptions.className}Config, ${templateOptions.className}Result } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className}Service } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className}Service;
  const result = yield* service.exampleOperation()
  return result;
})
\`\`\`

### Customization Guide

1. **Define Service Interface** (\`lib/service.ts\`):
   - Add your business logic methods
   - Configure Live layer with dependencies
   - Update Test layer for testing

2. **Implement Business Logic**:
   - Service methods use Effect.gen for composition
   - Yield dependencies via Context.Tag pattern
   - Return Effect types for composability

3. **Configure Layers** (\`lib/service.ts\` static members):
   - Live: Production layer with real implementations
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

4. **Add RPC Endpoints** (\`lib/rpc.ts\` and \`lib/handlers.ts\`):
   - Define routes in rpc.ts
   - Implement handlers in handlers.ts
   - Keep handlers lightweight (delegate to service)

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}Service } from '${templateOptions.packageName}';
import type { ${templateOptions.className}Result } from '${templateOptions.packageName}/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* ${templateOptions.className}Service;
  const result = yield* service.exampleOperation()
  return result;
})

// With layers
const runnable = program.pipe(
  Effect.provide(${templateOptions.className}Service.Live)  // Production
  // or Effect.provide(${templateOptions.className}Service.Test)   // Testing
  // or Effect.provide(${templateOptions.className}Service.Auto)   // NODE_ENV-based
)
\`\`\`

### RPC Usage

\`\`\`typescript
import { ${templateOptions.fileName}Handlers } from '${templateOptions.packageName}';
import { ${templateOptions.className}Service } from '${templateOptions.packageName}'// Compose with RPC server
const rpcLayer = Layer.mergeAll(
  ${templateOptions.className}Service.Live,
  // ... other dependencies
)

const server = ${templateOptions.fileName}Handlers.pipe(
  Effect.provide(rpcLayer)
)
\`\`\`

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
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
    // All services go in lib/server/services/ directory (consolidated structure)
    const servicesPath = `${serverPath}/services`
    yield* adapter.makeDirectory(servicesPath)

    // Generate main service (lightweight Context.Tag with static layers)
    yield* adapter.writeFile(
      `${servicesPath}/service.ts`,
      generateFeatureServiceFile(templateOptions)
    )
    filesGenerated.push(`${servicesPath}/service.ts`)

    // Generate layers (layer composition for different environments)
    yield* adapter.writeFile(`${servicesPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${servicesPath}/layers.ts`)

    // Generate service spec (tests)
    yield* adapter.writeFile(
      `${servicesPath}/service.spec.ts`,
      generateServiceSpecFile(templateOptions)
    )
    filesGenerated.push(`${servicesPath}/service.spec.ts`)

    // Generate sub-modules (conditional)
    if (subModulesList && subModulesList.length > 0) {
      const subModulesResult = yield* generateSubModules(adapter, {
        projectRoot: options.projectRoot,
        sourceRoot: options.sourceRoot,
        packageName: options.packageName,
        parentName: options.name,
        parentClassName: options.className,
        parentFileName: options.fileName,
        subModules: subModulesList
      })

      // Track generated sub-module files (3 files per module - no index.ts barrel)
      for (const moduleName of subModulesList) {
        filesGenerated.push(`${servicesPath}/${moduleName}/service.ts`)
        filesGenerated.push(`${servicesPath}/${moduleName}/layer.ts`)
        filesGenerated.push(`${servicesPath}/${moduleName}/handlers.ts`)
      }

      // Log parent integration guidance
      yield* Effect.logDebug('Sub-modules generated with parent integration code', {
        imports: subModulesResult.parentIntegration.imports,
        layerProvides: subModulesResult.parentIntegration.layerProvides
      })
    }

    // Generate services barrel export (always, includes main + sub-modules)
    yield* adapter.writeFile(
      `${servicesPath}/index.ts`,
      generateFeatureServiceIndexFile(templateOptions)
    )
    filesGenerated.push(`${servicesPath}/index.ts`)

    // Generate CQRS base classes (conditional)
    if (includeCQRS) {
      const cqrsPath = `${serverPath}/cqrs`

      // Create CQRS subdirectories
      yield* adapter.makeDirectory(`${cqrsPath}/commands`)
      yield* adapter.makeDirectory(`${cqrsPath}/queries`)
      yield* adapter.makeDirectory(`${cqrsPath}/operations`)
      yield* adapter.makeDirectory(`${cqrsPath}/projections`)

      // Generate Commands base class and index
      yield* adapter.writeFile(
        `${cqrsPath}/commands/base.ts`,
        generateCommandsBaseFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/commands/base.ts`)

      yield* adapter.writeFile(
        `${cqrsPath}/commands/index.ts`,
        generateCommandsIndexFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/commands/index.ts`)

      // Generate Queries base class and index
      yield* adapter.writeFile(
        `${cqrsPath}/queries/base.ts`,
        generateQueriesBaseFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/queries/base.ts`)

      yield* adapter.writeFile(
        `${cqrsPath}/queries/index.ts`,
        generateQueriesIndexFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/queries/index.ts`)

      // Generate Operations executor and index
      yield* adapter.writeFile(
        `${cqrsPath}/operations/executor.ts`,
        generateOperationsExecutorFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/operations/executor.ts`)

      yield* adapter.writeFile(
        `${cqrsPath}/operations/index.ts`,
        generateOperationsIndexFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/operations/index.ts`)

      // Generate Projections builder and index
      yield* adapter.writeFile(
        `${cqrsPath}/projections/builder.ts`,
        generateProjectionsBuilderFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/projections/builder.ts`)

      yield* adapter.writeFile(
        `${cqrsPath}/projections/index.ts`,
        generateProjectionsIndexFile(templateOptions)
      )
      filesGenerated.push(`${cqrsPath}/projections/index.ts`)

      // Generate CQRS barrel export
      yield* adapter.writeFile(`${cqrsPath}/index.ts`, generateCqrsIndexFile(templateOptions))
      filesGenerated.push(`${cqrsPath}/index.ts`)

      // Generate Sub-module CQRS Bus (if sub-modules are enabled)
      if (subModulesList && subModulesList.length > 0) {
        const busContent = generateSubModuleCqrsBusFile(templateOptions)
        if (busContent) {
          yield* adapter.writeFile(`${cqrsPath}/bus.ts`, busContent)
          filesGenerated.push(`${cqrsPath}/bus.ts`)
        }
      }
    }

    // Generate RPC layer (Contract-First architecture)
    // - RPC definitions are in contract library (with RouteTag)
    // - Feature library implements handlers
    // - Middleware is from infra-rpc (applied based on RouteTag)

    // Generate handlers (implements contract RPCs)
    yield* adapter.writeFile(`${rpcPath}/handlers.ts`, generateRpcHandlersFile(templateOptions))
    filesGenerated.push(`${rpcPath}/handlers.ts`)

    // Generate router (combines handlers with middleware)
    yield* adapter.writeFile(`${rpcPath}/router.ts`, generateRpcRouterFile(templateOptions))
    filesGenerated.push(`${rpcPath}/router.ts`)

    // Generate RPC errors (feature-specific errors)
    yield* adapter.writeFile(`${rpcPath}/errors.ts`, generateRpcErrorsFile(templateOptions))
    filesGenerated.push(`${rpcPath}/errors.ts`)

    // Generate RPC barrel export (re-exports from contract + handlers + router)
    yield* adapter.writeFile(`${rpcPath}/index.ts`, generateRpcBarrelFile(templateOptions))
    filesGenerated.push(`${rpcPath}/index.ts`)

    // Generate Events layer (PubSub integration)
    const eventsPath = `${serverPath}/events`
    yield* adapter.makeDirectory(eventsPath)

    yield* adapter.writeFile(
      `${eventsPath}/publisher.ts`,
      generateEventsPublisherFile(templateOptions)
    )
    filesGenerated.push(`${eventsPath}/publisher.ts`)

    // Generate events index
    yield* adapter.writeFile(
      `${eventsPath}/index.ts`,
      `/**
 * ${templateOptions.className} Events Index
 *
 * @module ${templateOptions.packageName}/server/events
 */

export {
  ${templateOptions.className}EventPublisher,
  ${templateOptions.className}EventTopics,
  create${templateOptions.className}EventSubscription,
} from "./publisher"

export type { ${templateOptions.className}EventPublisherInterface } from "./publisher"
`
    )
    filesGenerated.push(`${eventsPath}/index.ts`)

    // Generate Jobs layer (Queue integration)
    const jobsPath = `${serverPath}/jobs`
    yield* adapter.makeDirectory(jobsPath)

    yield* adapter.writeFile(`${jobsPath}/queue.ts`, generateJobsQueueFile(templateOptions))
    filesGenerated.push(`${jobsPath}/queue.ts`)

    // Generate jobs index
    yield* adapter.writeFile(
      `${jobsPath}/index.ts`,
      `/**
 * ${templateOptions.className} Jobs Index
 *
 * @module ${templateOptions.packageName}/server/jobs
 */

export {
  ${templateOptions.className}JobQueue,
  ${templateOptions.className}QueueConfig,
  Create${templateOptions.className}Job,
  Update${templateOptions.className}Job,
  Delete${templateOptions.className}Job,
  Bulk${templateOptions.className}Job,
  JobMetadata,
} from "./queue"

export type {
  ${templateOptions.className}Job,
  ${templateOptions.className}JobQueueInterface,
} from "./queue";
`
    )
    filesGenerated.push(`${jobsPath}/index.ts`)

    // Generate client layer (conditional)
    if (shouldIncludeClientServer) {
      yield* adapter.writeFile(
        `${clientPath}/hooks/use-${options.fileName}.ts`,
        generateHooksFile(templateOptions)
      )
      filesGenerated.push(`${clientPath}/hooks/use-${options.fileName}.ts`)

      yield* adapter.writeFile(
        `${clientPath}/hooks/index.ts`,
        generateHooksIndexFile(templateOptions)
      )
      filesGenerated.push(`${clientPath}/hooks/index.ts`)

      yield* adapter.writeFile(
        `${clientPath}/atoms/${options.fileName}-atoms.ts`,
        generateAtomsFile(templateOptions)
      )
      filesGenerated.push(`${clientPath}/atoms/${options.fileName}-atoms.ts`)

      yield* adapter.writeFile(
        `${clientPath}/atoms/index.ts`,
        generateAtomsIndexFile(templateOptions)
      )
      filesGenerated.push(`${clientPath}/atoms/index.ts`)

      // Note: Components directory is NOT scaffolded with .gitkeep
      // Users should create components as needed - empty directories add no value
    }

    // Note: Edge middleware removed - RPC infrastructure handles edge-compatible routing
    // Edge-specific layer implementations belong in infra-rpc, not per-feature

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
