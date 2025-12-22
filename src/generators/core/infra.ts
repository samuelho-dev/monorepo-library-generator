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

import { Effect } from 'effect';
import type { FileSystemAdapter } from '../../utils/filesystem';
import { detectInfraConcern, usesEffectPrimitives } from '../../utils/infra-provider-mapping';
import { computePlatformConfiguration, type PlatformType } from '../../utils/build';
import type { InfraTemplateOptions } from '../../utils/types';
import {
  generateTypesOnlyFile,
  type TypesOnlyExportOptions,
} from '../../utils/templates';
import { generateDatabaseServiceFile } from '../infra/templates/database-service.template';
import {
  generateClientLayersFile,
  generateConfigFile,
  generateEdgeLayersFile,
  generateErrorsFile,
  generateIndexFile,
  generateInfraServiceSpecFile,
  generateMemoryProviderFile,
  generateServerLayersFile,
  generateServiceFile,
  generateUseHookFile,
} from '../infra/templates/index';
import {
  generateCacheInterfaceFile,
  generateCacheRedisLayerFile,
  generateLoggingInterfaceFile,
  generateLoggingOtelLayerFile,
  generateMetricsInterfaceFile,
  generateMetricsOtelLayerFile,
  generatePrimitiveErrorsFile,
  generatePrimitiveIndexFile,
  generatePubSubInterfaceFile,
  generatePubSubRedisLayerFile,
  generateQueueInterfaceFile,
  generateQueueRedisLayerFile,
} from '../infra/templates/primitives';
import {
  generateRpcClientFile,
  generateRpcCoreFile,
  generateRpcErrorsFile,
  generateRpcMiddlewareFile,
  generateRpcRouterFile,
  generateRpcTransportFile,
} from '../infra/templates/rpc';
import { generateProviderConsolidation } from './provider-consolidation';

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
 * @property includeEdge - Generate edge runtime support
 */
export interface InfraCoreOptions {
  readonly name: string;
  readonly className: string;
  readonly propertyName: string;
  readonly fileName: string;
  readonly constantName: string;
  readonly projectName: string;
  readonly projectRoot: string;
  readonly sourceRoot: string;
  readonly packageName: string;
  readonly description: string;
  readonly tags: string;
  readonly offsetFromRoot: string;
  readonly workspaceRoot?: string;
  readonly platform?: PlatformType;
  readonly includeClientServer?: boolean;
  readonly includeEdge?: boolean;
  readonly consolidatesProviders?: boolean;
  readonly providers?: string;
}

/**
 * Generator Result
 *
 * Metadata returned after successful generation.
 */
export interface GeneratorResult {
  readonly projectName: string;
  readonly projectRoot: string;
  readonly sourceRoot: string;
  readonly packageName: string;
  readonly filesGenerated: Array<string>;
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
  return Effect.gen(function* () {
    // Compute platform configuration
    const platformConfig = computePlatformConfiguration(
      {
        ...(options.platform !== undefined && { platform: options.platform }),
        ...(options.includeClientServer !== undefined && {
          includeClientServer: options.includeClientServer,
        }),
        ...(options.includeEdge !== undefined && { includeEdge: options.includeEdge }),
      },
      {
        defaultPlatform: 'node',
        libraryType: 'infra',
      },
    );

    const { includeClientServer, includeEdge } = platformConfig;

    // Assemble template options from pre-computed metadata
    const templateOptions: InfraTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: 'infra',
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(','),
      includeClientServer,
      includeEdge,
    };

    // Generate all domain files
    const filesGenerated: Array<string> = [];

    // Compute directory paths
    const sourceLibPath = `${options.sourceRoot}/lib`;
    const serviceLibPath = `${sourceLibPath}/service`;
    const layersLibPath = `${sourceLibPath}/layers`;
    const providersLibPath = `${sourceLibPath}/providers`;

    // Detect infrastructure concern type early for conditional generation
    const concern = detectInfraConcern(options.name);
    const isPrimitiveConcern = usesEffectPrimitives(options.name);

    const workspaceRoot = adapter.getWorkspaceRoot();

    // Generate types.ts for type-only exports (zero runtime overhead)
    // Skip for primitives as they don't have config.ts
    if (!isPrimitiveConcern) {
      const typesOnlyOptions: TypesOnlyExportOptions = {
        libraryType: 'infra',
        className: options.className,
        fileName: options.fileName,
        packageName: options.packageName,
        platform: includeClientServer ? 'universal' : 'server',
      };
      const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions);
      yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent);
      filesGenerated.push(`${options.sourceRoot}/types.ts`);
    }

    // Generate CLAUDE.md with bundle optimization guidance
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/**: Service definition
  - \`service.ts\`: Context.Tag with service interface
  - \`config.ts\`: Service configuration types (~2 KB)
  - \`errors.ts\`: Error types (~2 KB)

- **lib/providers/**: Provider implementations
  - \`memory.ts\`: In-memory provider (~3-4 KB)
  - Additional providers can be added here

- **lib/layers/**: Layer compositions
  - \`server-layers.ts\`: Server-side layers (~3 KB)${
    includeClientServer
      ? `
  - \`client-layers.ts\`: Client-side layers (~2 KB)`
      : ''
  }${
    includeEdge
      ? `
  - \`edge-layers.ts\`: Edge runtime layers (~2 KB)`
      : ''
  }
${
  includeClientServer
    ? `
- **lib/client/hooks/**: React hooks
  - \`use-${templateOptions.fileName}.ts\`: Client-side hook (~2 KB)
`
    : ''
}
### Import Patterns (Most to Least Optimized)

\`\`\`typescript
// 1. Type-only import (zero runtime ~0.3 KB)
import type { ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// 2. Specific provider (smallest bundle ~4 KB)
import { MemoryProvider } from '${templateOptions.packageName}/providers/memory';

// 3. Service interface (~5 KB)
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/service';

// 4. Specific layer (~3-4 KB)
import { ${templateOptions.className}ServiceLive } from '${templateOptions.packageName}/layers/server-layers';
${
  includeClientServer
    ? `
// 5. Client hook (~2 KB)
import { use${templateOptions.className} } from '${templateOptions.packageName}/client/hooks';
`
    : ''
}
// 6. Platform barrel (~10-15 KB)
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/server';

// 7. Package barrel (largest ~20 KB)
import { ${templateOptions.className}Service } from '${templateOptions.packageName}';
\`\`\`

### Customization Guide

1. **Configure Service** (\`lib/service/config.ts\`):
   - Define configuration interface
   - Add environment-specific settings
   - Configure connection parameters

2. **Implement Providers** (\`lib/providers/\`):
   - Memory provider is included by default
   - Add additional providers as needed (PostgreSQL, Redis, etc.)
   - Each provider should implement the service interface

3. **Configure Layers** (\`lib/layers/\`):
   - \`server-layers.ts\`: Wire up server-side dependencies
   - \`client-layers.ts\`: Configure client-side providers (if applicable)
   - \`edge-layers.ts\`: Configure edge runtime providers (if applicable)

### Usage Example

\`\`\`typescript
// Granular import for optimal bundle size
import { MemoryProvider } from '${templateOptions.packageName}/providers/memory';
import { ${templateOptions.className}Service } from '${templateOptions.packageName}/service';
import type { ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// Use with Layer pattern
const program = Effect.gen(function* () {
  const service = yield* ${templateOptions.className}Service;
  // Use service...
});

// Provide memory provider layer
const runnable = program.pipe(
  Effect.provide(MemoryProvider)
);

// Traditional approach (still works)
import { ${templateOptions.className}ServiceLive } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const service = yield* ${templateOptions.className}Service;
  // ...
}).pipe(
  Effect.provide(${templateOptions.className}ServiceLive)
);
\`\`\`
${
  includeClientServer
    ? `
### Client Usage

\`\`\`typescript
import { use${templateOptions.className} } from '${templateOptions.packageName}/client/hooks';

function MyComponent() {
  const ${templateOptions.propertyName} = use${templateOptions.className}();
  // Use service in React component
}
\`\`\`
`
    : ''
}
### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Providers are separate files for optimal tree-shaking
- Each layer can be imported independently
- Service interface is lightweight (~2 KB vs ~20 KB for full barrel)
- Client hooks are separated for minimal client bundle size
`;

    yield* adapter.writeFile(
      `${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`,
      claudeDoc,
    );
    filesGenerated.push(`${templateOptions.projectRoot}/CLAUDE.md`);

    // Generate test file for layer composition and service interface verification
    yield* adapter.writeFile(
      `${workspaceRoot}/${sourceLibPath}/service.spec.ts`,
      generateInfraServiceSpecFile(templateOptions),
    );
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`);

    // Generate service files based on concern type
    if (isPrimitiveConcern) {
      // Use specialized primitive templates for Effect-native concerns
      // All primitives get errors.ts using Schema.TaggedError pattern
      yield* adapter.writeFile(
        `${serviceLibPath}/errors.ts`,
        generatePrimitiveErrorsFile(templateOptions),
      );
      filesGenerated.push(`${serviceLibPath}/errors.ts`);

      switch (concern) {
        case 'cache':
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateCacheInterfaceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${layersLibPath}/redis-layer.ts`,
            generateCacheRedisLayerFile(templateOptions),
          );
          filesGenerated.push(`${layersLibPath}/redis-layer.ts`);
          break;

        case 'logging':
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateLoggingInterfaceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${layersLibPath}/otel-layer.ts`,
            generateLoggingOtelLayerFile(templateOptions),
          );
          filesGenerated.push(`${layersLibPath}/otel-layer.ts`);
          break;

        case 'metrics':
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateMetricsInterfaceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${layersLibPath}/otel-layer.ts`,
            generateMetricsOtelLayerFile(templateOptions),
          );
          filesGenerated.push(`${layersLibPath}/otel-layer.ts`);
          break;

        case 'queue':
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateQueueInterfaceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${layersLibPath}/redis-layer.ts`,
            generateQueueRedisLayerFile(templateOptions),
          );
          filesGenerated.push(`${layersLibPath}/redis-layer.ts`);
          break;

        case 'pubsub':
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generatePubSubInterfaceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${layersLibPath}/redis-layer.ts`,
            generatePubSubRedisLayerFile(templateOptions),
          );
          filesGenerated.push(`${layersLibPath}/redis-layer.ts`);
          break;

        case 'database':
          // Database delegates to Kysely provider - uses specialized template
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateDatabaseServiceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          // Database doesn't need config.ts or memory.ts - delegates to Kysely provider
          break;

        case 'rpc':
          // RPC infrastructure generates multiple files
          yield* adapter.writeFile(
            `${serviceLibPath}/core.ts`,
            generateRpcCoreFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/core.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/middleware.ts`,
            generateRpcMiddlewareFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/middleware.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/transport.ts`,
            generateRpcTransportFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/transport.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/client.ts`,
            generateRpcClientFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/client.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/errors.ts`,
            generateRpcErrorsFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/errors.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/router.ts`,
            generateRpcRouterFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/router.ts`);
          break;

        default:
          // Should not reach here for known primitives
          yield* adapter.writeFile(
            `${serviceLibPath}/errors.ts`,
            generateErrorsFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/errors.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/service.ts`,
            generateServiceFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/service.ts`);
          yield* adapter.writeFile(
            `${serviceLibPath}/config.ts`,
            generateConfigFile(templateOptions),
          );
          filesGenerated.push(`${serviceLibPath}/config.ts`);
          yield* adapter.writeFile(
            `${providersLibPath}/memory.ts`,
            generateMemoryProviderFile(templateOptions),
          );
          filesGenerated.push(`${providersLibPath}/memory.ts`);
      }
    } else {
      // Non-primitive concerns use generic service pattern
      yield* adapter.writeFile(`${serviceLibPath}/errors.ts`, generateErrorsFile(templateOptions));
      filesGenerated.push(`${serviceLibPath}/errors.ts`);

      yield* adapter.writeFile(
        `${serviceLibPath}/service.ts`,
        generateServiceFile(templateOptions),
      );
      filesGenerated.push(`${serviceLibPath}/service.ts`);

      yield* adapter.writeFile(`${serviceLibPath}/config.ts`, generateConfigFile(templateOptions));
      filesGenerated.push(`${serviceLibPath}/config.ts`);

      // Generate providers
      yield* adapter.writeFile(
        `${providersLibPath}/memory.ts`,
        generateMemoryProviderFile(templateOptions),
      );
      filesGenerated.push(`${providersLibPath}/memory.ts`);
    }

    // Generate server layers (only for non-primitive concerns)
    // Primitives (including database) have static layers defined on the service class
    if (!isPrimitiveConcern) {
      yield* adapter.writeFile(
        `${layersLibPath}/server-layers.ts`,
        generateServerLayersFile(templateOptions),
      );
      filesGenerated.push(`${layersLibPath}/server-layers.ts`);
    }

    // Generate client implementation files (conditional, skip for primitives)
    if (includeClientServer && !isPrimitiveConcern) {
      const clientLayersContent = generateClientLayersFile(templateOptions);
      if (clientLayersContent) {
        yield* adapter.writeFile(`${layersLibPath}/client-layers.ts`, clientLayersContent);
        filesGenerated.push(`${layersLibPath}/client-layers.ts`);
      }

      const useHookContent = generateUseHookFile(templateOptions);
      if (useHookContent) {
        const clientHooksPath = `${sourceLibPath}/client/hooks`;
        yield* adapter.writeFile(`${clientHooksPath}/use-${options.fileName}.ts`, useHookContent);
        filesGenerated.push(`${clientHooksPath}/use-${options.fileName}.ts`);
      }
    }

    // Generate edge files (conditional, skip for primitives)
    if (includeEdge && !isPrimitiveConcern) {
      const edgeLayersContent = generateEdgeLayersFile(templateOptions);
      if (edgeLayersContent) {
        yield* adapter.writeFile(`${layersLibPath}/edge-layers.ts`, edgeLayersContent);
        filesGenerated.push(`${layersLibPath}/edge-layers.ts`);
      }
    }

    // Generate provider consolidation (conditional)
    if (options.consolidatesProviders && options.providers) {
      const providersList = options.providers
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      if (providersList.length > 0) {
        yield* generateProviderConsolidation(adapter, {
          projectRoot: options.projectRoot,
          sourceRoot: options.sourceRoot,
          packageName: options.packageName,
          providers: providersList,
        });

        // Track generated consolidation files
        filesGenerated.push(`${options.sourceRoot}/index.ts`);
        filesGenerated.push(`${options.sourceRoot}/lib/layers.ts`);
        filesGenerated.push(`${options.sourceRoot}/lib/orchestrator.ts`);
      }
    } else {
      // Generate standard index file (barrel exports) when not consolidating providers
      // Use primitive-specific index for Effect primitive concerns
      const indexContent = isPrimitiveConcern
        ? generatePrimitiveIndexFile(templateOptions)
        : generateIndexFile(templateOptions);
      yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, indexContent);
      filesGenerated.push(`${options.sourceRoot}/index.ts`);
    }

    // Platform-specific barrel exports removed - rely on automatic tree-shaking
    // All exports are now handled through the main index.ts

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated,
    };
  });
}
