/**
 * Infrastructure Generator Core
 *
 * Generates domain-specific files for infrastructure libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates service interface and configuration files
 * - Creates provider implementations (memory, live)
 * - Generates layer compositions for different environments
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/infra-generator-core
 */

import { Effect } from "effect"
import { computePlatformConfiguration, type PlatformType } from "../../utils/build"
import type { FileSystemAdapter } from "../../utils/filesystem"
import { detectInfraConcern, usesEffectPrimitives } from "../../utils/infra-provider-mapping"
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates"
import type { InfraTemplateOptions } from "../../utils/types"
import {
  generateAuthErrorsFile,
  generateAuthIndexFile,
  generateAuthServiceFile,
  generateAuthTypesFile
} from "../infra/templates/auth"
import { generateDatabaseServiceFile } from "../infra/templates/database-service.template"
import {
  generateClientLayersFile,
  generateConfigFile,
  generateErrorsFile,
  generateIndexFile,
  generateInfraServiceSpecFile,
  generateMemoryProviderFile,
  generateServerLayersFile,
  generateServiceFile,
  generateUseHookFile
} from "../infra/templates/index"
import {
  generateCacheInterfaceFile,
  generateCacheRedisLayerFile,
  generateLoggingServiceFile,
  generateMetricsServiceFile,
  generateObservabilityConfigFile,
  generateObservabilityConstantsFile,
  generateObservabilityErrorsFile,
  generateObservabilityIndexFile,
  generateObservabilityPresetsFile,
  generateObservabilitySdkFile,
  generateObservabilitySupervisorFile,
  generateOtelProviderFile,
  generatePrimitiveErrorsFile,
  generatePrimitiveIndexFile,
  generatePubSubInterfaceFile,
  generatePubSubRedisLayerFile,
  generateQueueInterfaceFile,
  generateQueueRedisLayerFile
} from "../infra/templates/primitives"
import {
  generateAuthMiddlewareFile as generateRpcAuthMiddlewareFile,
  generateMiddlewareIndexFile,
  generateRequestMetaMiddlewareFile,
  generateRouteSelectorMiddlewareFile,
  generateRpcClientFile,
  generateRpcClientHooksFile,
  generateRpcCoreFile,
  generateRpcErrorsFile,
  generateRpcIndexFile,
  generateRpcRouterFile,
  generateRpcTransportFile,
  generateServiceAuthMiddlewareFile
} from "../infra/templates/rpc"
import {
  generateStorageErrorsFile,
  generateStorageIndexFile,
  generateStorageServiceFile,
  generateStorageTypesFile
} from "../infra/templates/storage"
import { generateProviderConsolidation } from "./provider-consolidation"

/**
 * Infrastructure Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property platform - Target platform (node, browser, edge, universal)
 * @property includeClientServer - Generate client/server split exports
 */
export interface InfraCoreOptions {
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
  readonly includeClientServer?: boolean
  readonly consolidatesProviders?: boolean
  readonly providers?: string
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
 * Generate Infrastructure Library Domain Files
 *
 * Generates only domain-specific files for infrastructure libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateInfraCore(adapter: FileSystemAdapter, options: InfraCoreOptions) {
  return Effect.gen(function*() {
    // Detect infrastructure concern type early for conditional generation
    // Must be done before platform configuration to determine prewired defaults
    const concern = detectInfraConcern(options.name)
    const isPrimitiveConcern = usesEffectPrimitives(options.name)

    // Compute platform configuration
    // Prewired: Client/server is always enabled for non-primitive concerns
    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        // Non-primitive concerns always get client/server (prewired integration)
        // Primitive concerns respect the explicit option or default to false
        includeClientServer: isPrimitiveConcern
          ? options.includeClientServer
          : true
      },
      {
        defaultPlatform: "node",
        libraryType: "infra"
      }
    )

    const { includeClientServer } = platformConfig

    // Assemble template options from pre-computed metadata
    const templateOptions: InfraTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "infra",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      includeClientServer
    }

    // Generate all domain files
    const filesGenerated: Array<string> = []

    // Compute directory paths
    const sourceLibPath = `${options.sourceRoot}/lib`
    const layersLibPath = `${sourceLibPath}/layers`

    const workspaceRoot = adapter.getWorkspaceRoot()

    // Generate types.ts for type-only exports (zero runtime overhead)
    // Skip for primitives as they don't have config.ts
    if (!isPrimitiveConcern) {
      const typesOnlyOptions: TypesOnlyExportOptions = {
        libraryType: "infra",
        className: options.className,
        fileName: options.fileName,
        packageName: options.packageName,
        platform: includeClientServer ? "universal" : "server"
      }
      const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
      yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent)
      filesGenerated.push(`${options.sourceRoot}/types.ts`)
    }

    // Generate CLAUDE.md with bundle optimization guidance
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation
${
      includeClientServer
        ? `- **lib/client/hooks/use-${templateOptions.fileName}.ts**: React hook`
        : ""
    }

### Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className}Service } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className}Service;
  // Use service...
})
\`\`\`

### Customization Guide

1. **Configure Service** (\`lib/config.ts\`):
   - Define configuration interface
   - Add environment-specific settings
   - Configure connection parameters

2. **Implement Providers** (\`lib/memory.ts\`, add more as needed):
   - Memory provider is included by default
   - Add additional providers as needed (PostgreSQL, Redis, etc.)
   - Each provider should implement the service interface

3. **Configure Layers** (\`lib/service.ts\` static members):
   - Live: Production layer with real implementation
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}Service } from '${templateOptions.packageName}';
import type { ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* ${templateOptions.className}Service;
  // Use service...
})

// With layers
const result = program.pipe(
  Effect.provide(${templateOptions.className}Service.Live)  // Production
  // or Effect.provide(${templateOptions.className}Service.Test)   // Testing
  // or Effect.provide(${templateOptions.className}Service.Auto)   // NODE_ENV-based
)
\`\`\`
${
      includeClientServer
        ? `
### Client Usage

\`\`\`typescript
import { use${templateOptions.className} } from '${templateOptions.packageName}/client/hooks'function MyComponent() {
  const ${templateOptions.propertyName} = use${templateOptions.className}()
  // Use service in React component
}
\`\`\`
`
        : ""
    }
### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
`

    yield* adapter.writeFile(
      `${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`,
      claudeDoc
    )
    filesGenerated.push(`${templateOptions.projectRoot}/CLAUDE.md`)

    // Generate test file for layer composition and service interface verification
    yield* adapter.writeFile(
      `${workspaceRoot}/${sourceLibPath}/service.spec.ts`,
      generateInfraServiceSpecFile(templateOptions)
    )
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`)

    // Generate service files based on concern type
    // All files go directly in lib/ (no service/ subdirectory)
    if (isPrimitiveConcern) {
      // Use specialized primitive templates for Effect-native concerns
      // All primitives get errors.ts using Schema.TaggedError pattern
      yield* adapter.writeFile(
        `${sourceLibPath}/errors.ts`,
        generatePrimitiveErrorsFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/errors.ts`)

      switch (concern) {
        case "cache":
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateCacheInterfaceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/layers.ts`,
            generateCacheRedisLayerFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/layers.ts`)
          break

        case "queue":
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateQueueInterfaceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/layers.ts`,
            generateQueueRedisLayerFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/layers.ts`)
          break

        case "pubsub":
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generatePubSubInterfaceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/layers.ts`,
            generatePubSubRedisLayerFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/layers.ts`)
          break

        case "database":
          // Database delegates to Kysely provider - uses specialized template
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateDatabaseServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          // Database doesn't need config.ts or memory.ts - delegates to Kysely provider
          break

        case "rpc": {
          // RPC infrastructure generates multiple files - all in lib/
          yield* adapter.writeFile(
            `${sourceLibPath}/core.ts`,
            generateRpcCoreFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/core.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/transport.ts`,
            generateRpcTransportFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/transport.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/client.ts`,
            generateRpcClientFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/client.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/errors.ts`,
            generateRpcErrorsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/errors.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/router.ts`,
            generateRpcRouterFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/router.ts`)

          // Generate middleware module (Contract-First architecture)
          // All middleware consolidated in lib/middleware/
          const middlewarePath = `${sourceLibPath}/middleware`
          yield* adapter.writeFile(
            `${middlewarePath}/auth.ts`,
            generateRpcAuthMiddlewareFile(templateOptions)
          )
          filesGenerated.push(`${middlewarePath}/auth.ts`)
          yield* adapter.writeFile(
            `${middlewarePath}/service-auth.ts`,
            generateServiceAuthMiddlewareFile(templateOptions)
          )
          filesGenerated.push(`${middlewarePath}/service-auth.ts`)
          yield* adapter.writeFile(
            `${middlewarePath}/request-meta.ts`,
            generateRequestMetaMiddlewareFile(templateOptions)
          )
          filesGenerated.push(`${middlewarePath}/request-meta.ts`)
          yield* adapter.writeFile(
            `${middlewarePath}/route-selector.ts`,
            generateRouteSelectorMiddlewareFile(templateOptions)
          )
          filesGenerated.push(`${middlewarePath}/route-selector.ts`)
          yield* adapter.writeFile(
            `${middlewarePath}/index.ts`,
            generateMiddlewareIndexFile(templateOptions)
          )
          filesGenerated.push(`${middlewarePath}/index.ts`)

          // Generate client hooks (React hooks for RPC operations)
          yield* adapter.writeFile(
            `${sourceLibPath}/hooks.ts`,
            generateRpcClientHooksFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/hooks.ts`)
          break
        }

        case "auth":
          // Auth infrastructure generates service and types - all in lib/
          // Middleware is consolidated in infra-rpc (AuthVerifier interface)
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateAuthServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/errors.ts`,
            generateAuthErrorsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/errors.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/types.ts`,
            generateAuthTypesFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/types.ts`)
          break

        case "storage":
          // Storage infrastructure generates service and types - all in lib/
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateStorageServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/errors.ts`,
            generateStorageErrorsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/errors.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/types.ts`,
            generateStorageTypesFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/types.ts`)
          break

        case "observability":
          // Observability infrastructure generates unified tracing, logging, and metrics
          // All files in lib/ directory
          // OtelProvider - the "Redis" equivalent for observability
          yield* adapter.writeFile(
            `${sourceLibPath}/provider.ts`,
            generateOtelProviderFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/provider.ts`)
          // SDK layer factories (used internally by OtelProvider, exported for advanced users)
          yield* adapter.writeFile(
            `${sourceLibPath}/sdk.ts`,
            generateObservabilitySdkFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/sdk.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/supervisor.ts`,
            generateObservabilitySupervisorFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/supervisor.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/config.ts`,
            generateObservabilityConfigFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/config.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/presets.ts`,
            generateObservabilityPresetsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/presets.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/errors.ts`,
            generateObservabilityErrorsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/errors.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/constants.ts`,
            generateObservabilityConstantsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/constants.ts`)
          // Logging service (Effect Logger wrapper)
          yield* adapter.writeFile(
            `${sourceLibPath}/logging.ts`,
            generateLoggingServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/logging.ts`)
          // Metrics service (Effect.Metric wrapper)
          yield* adapter.writeFile(
            `${sourceLibPath}/metrics.ts`,
            generateMetricsServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/metrics.ts`)
          break

        default:
          // Should not reach here for known primitives - all in lib/
          yield* adapter.writeFile(
            `${sourceLibPath}/errors.ts`,
            generateErrorsFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/errors.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/service.ts`,
            generateServiceFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/service.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/config.ts`,
            generateConfigFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/config.ts`)
          yield* adapter.writeFile(
            `${sourceLibPath}/memory.ts`,
            generateMemoryProviderFile(templateOptions)
          )
          filesGenerated.push(`${sourceLibPath}/memory.ts`)
      }
    } else {
      // Non-primitive concerns use generic service pattern - all in lib/
      yield* adapter.writeFile(`${sourceLibPath}/errors.ts`, generateErrorsFile(templateOptions))
      filesGenerated.push(`${sourceLibPath}/errors.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/service.ts`,
        generateServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/service.ts`)

      yield* adapter.writeFile(`${sourceLibPath}/config.ts`, generateConfigFile(templateOptions))
      filesGenerated.push(`${sourceLibPath}/config.ts`)

      // Generate providers
      yield* adapter.writeFile(
        `${sourceLibPath}/memory.ts`,
        generateMemoryProviderFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/memory.ts`)
    }

    // Generate server layers (only for non-primitive concerns)
    // Primitives (including database) have static layers defined on the service class
    // Layers go directly at lib/layers.ts (not a subdirectory)
    if (!isPrimitiveConcern) {
      yield* adapter.writeFile(
        `${sourceLibPath}/layers.ts`,
        generateServerLayersFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/layers.ts`)
    }

    // Generate client implementation files (conditional, skip for primitives)
    if (includeClientServer && !isPrimitiveConcern) {
      const clientLayersContent = generateClientLayersFile(templateOptions)
      if (clientLayersContent) {
        yield* adapter.writeFile(`${layersLibPath}/client-layers.ts`, clientLayersContent)
        filesGenerated.push(`${layersLibPath}/client-layers.ts`)
      }

      const useHookContent = generateUseHookFile(templateOptions)
      if (useHookContent) {
        const clientHooksPath = `${sourceLibPath}/client/hooks`
        yield* adapter.writeFile(`${clientHooksPath}/use-${options.fileName}.ts`, useHookContent)
        filesGenerated.push(`${clientHooksPath}/use-${options.fileName}.ts`)
      }
    }

    // Generate provider consolidation (conditional)
    if (options.consolidatesProviders && options.providers) {
      const providersList = options.providers
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)

      if (providersList.length > 0) {
        yield* generateProviderConsolidation(adapter, {
          projectRoot: options.projectRoot,
          sourceRoot: options.sourceRoot,
          packageName: options.packageName,
          providers: providersList
        })

        // Track generated consolidation files
        filesGenerated.push(`${options.sourceRoot}/index.ts`)
        filesGenerated.push(`${options.sourceRoot}/lib/layers.ts`)
        filesGenerated.push(`${options.sourceRoot}/lib/orchestrator.ts`)
      }
    } else {
      // Generate standard index file (barrel exports) when not consolidating providers
      // Use concern-specific index templates where available
      let indexContent: string
      if (concern === "auth") {
        // Auth has specialized index with handler factories (protectedHandler, publicHandler)
        indexContent = generateAuthIndexFile(templateOptions)
      } else if (concern === "rpc") {
        // RPC has specialized index with client, transport, router, middleware
        indexContent = generateRpcIndexFile(templateOptions)
      } else if (concern === "storage") {
        // Storage has specialized index with proper error exports
        indexContent = generateStorageIndexFile(templateOptions)
      } else if (concern === "observability") {
        // Observability has specialized index with SDK layers, presets, and Supervisor
        indexContent = generateObservabilityIndexFile(templateOptions)
      } else if (isPrimitiveConcern) {
        // Other primitives use generic primitive index
        indexContent = generatePrimitiveIndexFile(templateOptions)
      } else {
        // Non-primitive concerns use generic index
        indexContent = generateIndexFile(templateOptions)
      }
      yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, indexContent)
      filesGenerated.push(`${options.sourceRoot}/index.ts`)
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
