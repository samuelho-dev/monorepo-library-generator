/**
 * Provider Generator Core
 *
 * Generates domain-specific files for provider libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates service implementation for external service integration
 * - Creates types, validation, and error definitions
 * - Generates layer compositions for different environments
 * - Creates platform-specific exports (client, server, edge)
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/provider-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { computePlatformConfiguration, type PlatformType } from "../../utils/platforms"
import type { Platform, ProviderTemplateOptions } from "../../utils/shared/types"
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates/types-only-exports.template"
import {
  generateClientFile,
  generateEdgeFile,
  generateErrorsFile,
  generateIndexFile,
  generateLayersFile,
  generateServerFile,
  generateServiceSpecFile,
  generateTypesFile,
  generateValidationFile
} from "../provider/templates/index"
import {
  generateProviderCreateOperationFile,
  generateProviderDeleteOperationFile,
  generateProviderOperationsIndexFile,
  generateProviderQueryOperationFile,
  generateProviderServiceIndexFile,
  generateProviderServiceInterfaceFile,
  generateProviderUpdateOperationFile
} from "../provider/templates/service/index"

/**
 * Provider Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property externalService - Name of external service being integrated
 * @property platform - Target platform (node, browser, edge, universal)
 */
export interface ProviderCoreOptions {
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
  readonly externalService: string
  readonly platform: PlatformType
  readonly providerType?: "sdk" | "cli" | "http" | "graphql"
  readonly cliCommand?: string
  readonly baseUrl?: string
  readonly authType?: "bearer" | "apikey" | "oauth" | "basic" | "none"
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
 * Generate Provider Library Domain Files
 *
 * Generates only domain-specific files for provider libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with file system errors
 */
export function generateProviderCore(
  adapter: FileSystemAdapter,
  options: ProviderCoreOptions
) {
  return Effect.gen(function*() {
    // Compute platform configuration
    const platformConfig = computePlatformConfiguration(
      {
        platform: options.platform
      },
      {
        defaultPlatform: "node",
        libraryType: "provider"
      }
    )

    const { includeEdge } = platformConfig

    // Map PlatformType to Platform for template options (internal mapping)
    const platformMapping: Record<PlatformType, Platform> = {
      node: "server",
      browser: "client",
      edge: "edge",
      universal: "universal"
    }

    // Assemble template options from pre-computed metadata
    const templateOptions: ProviderTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "provider",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description,
      tags: options.tags.split(","),
      externalService: options.externalService,
      platforms: [platformMapping[options.platform]],
      providerType: options.providerType || "sdk",
      ...(options.cliCommand && { cliCommand: options.cliCommand }),
      ...(options.baseUrl && { baseUrl: options.baseUrl }),
      ...(options.authType && { authType: options.authType })
    }

    // Generate all domain files
    const filesGenerated: Array<string> = []
    const sourceLibPath = `${options.sourceRoot}/lib`

    // Generate barrel exports
    yield* adapter.writeFile(`${options.sourceRoot}/index.ts`, generateIndexFile(templateOptions))
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Generate types.ts for type-only exports (zero runtime overhead)
    const typesOnlyOptions: TypesOnlyExportOptions = {
      libraryType: "provider",
      className: options.className,
      fileName: options.fileName,
      packageName: options.packageName,
      platform: options.platform === "node" ? "server" : options.platform === "browser" ? "client" : "universal"
    }
    const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
    const workspaceRoot = adapter.getWorkspaceRoot()
    yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent)
    filesGenerated.push(`${options.sourceRoot}/types.ts`)

    // Generate CLAUDE.md with bundle optimization guidance
    const providerType = options.providerType || "sdk"

    // Generate provider-type-specific documentation
    let claudeDoc = ""

    if (providerType === "cli") {
      claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.externalService}, a CLI wrapper provider library following Effect-based service patterns.

## Provider Type: CLI Wrapper

This provider wraps the \`${options.cliCommand || 'cli-command'}\` command-line tool using Effect's Command API.

## Architecture

### Structure

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/interface.ts**: CLI wrapper service with Command API
- **lib/errors.ts**: Data.TaggedError-based error types (CommandError, NotFoundError)
- **lib/types.ts**: CLI-specific types (CommandResult, Config)
- **lib/validation.ts**: Input validation helpers
- **lib/layers.ts**: Layer compositions (Live, Test, Dev)

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { CommandResult, ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const service = yield* ${templateOptions.className};
  const result = yield* service.execute(["--help"]);
  const version = yield* service.version;
});
\`\`\`

### Customization Guide

1. **Configure CLI Command** (\`lib/service/interface.ts\`):
   - Command path is configurable via ${templateOptions.className}Config
   - Add custom command methods beyond execute() and version()
   - Configure timeout and environment variables

2. **Error Handling** (\`lib/errors.ts\`):
   - CommandError: Command execution failures
   - NotFoundError: CLI tool not installed
   - Add domain-specific error types as needed

3. **Testing** (\`lib/layers.ts\`):
   - Test layer uses Layer.succeed with mock implementations
   - No actual CLI execution in tests
`
    } else if (providerType === "http") {
      claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.externalService}, an HTTP/REST API provider library following Effect-based service patterns.

## Provider Type: HTTP/REST API

This provider integrates with ${templateOptions.externalService} HTTP API using Effect's HttpClient.

## Architecture

### Structure

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/interface.ts**: HTTP service with CRUD operations
- **lib/errors.ts**: Data.TaggedError-based error types (HttpError, NetworkError, RateLimitError)
- **lib/types.ts**: HTTP-specific types (ResourceSchema, Config with baseUrl)
- **lib/validation.ts**: Input validation with Effect Schema
- **lib/layers.ts**: Layer compositions (Live, Test, Dev)

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const service = yield* ${templateOptions.className};
  const resources = yield* service.list({ page: 1, limit: 10 });
  const resource = yield* service.get("resource-id");
});
\`\`\`

### Customization Guide

1. **Configure HTTP Client** (\`lib/service/interface.ts\`):
   - Base URL configured via ${templateOptions.className}Config
   - Authentication via ${options.authType || 'bearer'} token
   - Retry policies and timeouts configurable

2. **Define Resource Schema** (\`lib/types.ts\`):
   - Update ResourceSchema to match your API response
   - Use Effect Schema for validation and type safety

3. **API Methods** (\`lib/service/interface.ts\`):
   - Implement: get(), post(), put(), delete(), list()
   - Add custom endpoints as needed
   - Health check endpoint for monitoring

4. **Error Handling** (\`lib/errors.ts\`):
   - HttpError: HTTP status code errors (4xx, 5xx)
   - NetworkError: Connection failures
   - RateLimitError: Rate limiting with retry-after
`
    } else if (providerType === "graphql") {
      claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.externalService}, a GraphQL API provider library following Effect-based service patterns.

## Provider Type: GraphQL API

This provider integrates with ${templateOptions.externalService} GraphQL API using Effect's HttpClient.

## Architecture

### Structure

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/interface.ts**: GraphQL service with query/mutation operations
- **lib/errors.ts**: Data.TaggedError-based error types (GraphQLError, HttpError)
- **lib/types.ts**: GraphQL-specific types (ResourceSchema, Config with baseUrl)
- **lib/validation.ts**: Input validation with Effect Schema
- **lib/layers.ts**: Layer compositions (Live, Test, Dev)

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const service = yield* ${templateOptions.className};

  // GraphQL query
  const data = yield* service.query<QueryResult>(\`
    query GetResources {
      resources { id name }
    }
  \`);

  // GraphQL mutation
  const result = yield* service.mutation<MutationResult>(\`
    mutation CreateResource($input: ResourceInput!) {
      createResource(input: $input) { id name }
    }
  \`, { input: { name: "New Resource" } });
});
\`\`\`

### Customization Guide

1. **Configure GraphQL Client** (\`lib/service/interface.ts\`):
   - GraphQL endpoint configured via ${templateOptions.className}Config
   - Authentication via ${options.authType || 'bearer'} token
   - Retry policies and timeouts configurable

2. **Define Schema Types** (\`lib/types.ts\`):
   - Update ResourceSchema to match your GraphQL schema
   - Use Effect Schema for response validation

3. **GraphQL Operations** (\`lib/service/interface.ts\`):
   - query(): Execute GraphQL queries
   - mutation(): Execute GraphQL mutations
   - Add typed helper methods for common operations

4. **Error Handling** (\`lib/errors.ts\`):
   - GraphQLError: GraphQL operation errors with error array
   - HttpError: HTTP-level errors (network, status codes)
   - ValidationError: Schema validation failures
`
    } else {
      // SDK provider (default)
      claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## Quick Reference

This is an AI-optimized reference for ${templateOptions.externalService}, a provider library following Effect-based service patterns with granular bundle optimization.

## Architecture

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/**: Granular service implementation
  - \`interface.ts\`: Context.Tag with static layers
  - \`operations/create.ts\`: Create operations (~3-4 KB)
  - \`operations/query.ts\`: Query operations (~4-5 KB)
  - \`operations/update.ts\`: Update operations (~3 KB)
  - \`operations/delete.ts\`: Delete operations (~2-3 KB)
  - \`index.ts\`: Service barrel export

- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Service types and configurations
- **lib/validation.ts**: Input validation helpers
- **lib/layers.ts**: Layer compositions (Live, Test, Dev)

## Import Patterns (Most to Least Optimized)

\`\`\`typescript
// 1. Granular operation import (smallest bundle ~3-5 KB)
import { createOperations } from '${templateOptions.packageName}/service/operations/create';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types';

// 3. Operation category (~8-10 KB)
import { createOperations, queryOperations } from '${templateOptions.packageName}/service/operations';

// 4. Full service (~12-15 KB)
import { ${templateOptions.className} } from '${templateOptions.packageName}/service';

// 5. Package barrel (largest ~18-20 KB)
import { ${templateOptions.className} } from '${templateOptions.packageName}';
\`\`\`

### Customization Guide

1. **Configure External Service** (\`lib/service/interface.ts\`):
   - Initialize ${templateOptions.externalService} SDK client in Live layer
   - Configure authentication and connection settings
   - Add health check implementation

2. **Implement Operations**:
   - \`lib/service/operations/create.ts\`: Implement create with SDK
   - \`lib/service/operations/query.ts\`: Implement list/get with SDK
   - \`lib/service/operations/update.ts\`: Implement update with SDK
   - \`lib/service/operations/delete.ts\`: Implement delete with SDK
   - Each operation can be implemented independently

3. **Configure Layers** (\`lib/layers.ts\`):
   - Wire up SDK client dependencies
   - Configure retry policies and timeouts
   - Customize Test layer for testing

### Usage Example

\`\`\`typescript
// Granular import for optimal bundle size
import { createOperations } from '${templateOptions.packageName}/service/operations/create';
import type { Resource } from '${templateOptions.packageName}/types';

// Use directly without full service
const program = Effect.gen(function* () {
  const created = yield* createOperations.create({
    // ...resource data
  } as Omit<Resource, "id" | "createdAt" | "updatedAt">);
  return created;
});

// Traditional approach (still works)
import { ${templateOptions.className} } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const service = yield* ${templateOptions.className};
  const result = yield* service.list({ page: 1, limit: 10 });
  // ...
});
\`\`\`

### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Operations are lazy-loaded via dynamic imports
- Each operation can be imported independently for optimal tree-shaking
- Service interface uses minimal overhead (~2 KB vs ~18 KB for full barrel)
`
    }

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)
    filesGenerated.push(`${templateOptions.projectRoot}/CLAUDE.md`)

    // Generate all provider-specific files
    yield* adapter.writeFile(`${sourceLibPath}/errors.ts`, generateErrorsFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/errors.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/types.ts`, generateTypesFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/types.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/validation.ts`, generateValidationFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/validation.ts`)

    // Generate service directory structure for granular imports
    const servicePath = `${sourceLibPath}/service`
    yield* adapter.makeDirectory(servicePath)

    // Generate service interface (lightweight Context.Tag with static layers)
    yield* adapter.writeFile(`${servicePath}/interface.ts`, generateProviderServiceInterfaceFile(templateOptions))
    filesGenerated.push(`${servicePath}/interface.ts`)

    // Conditional: Only generate operations for SDK providers
    // CLI/HTTP/GraphQL providers have operations defined in interface.ts
    const providerType = options.providerType || "sdk"
    if (providerType === "sdk") {
      const operationsPath = `${servicePath}/operations`
      yield* adapter.makeDirectory(operationsPath)

      // Generate operation files (split for optimal tree-shaking)
      yield* adapter.writeFile(`${operationsPath}/create.ts`, generateProviderCreateOperationFile(templateOptions))
      filesGenerated.push(`${operationsPath}/create.ts`)

      yield* adapter.writeFile(`${operationsPath}/query.ts`, generateProviderQueryOperationFile(templateOptions))
      filesGenerated.push(`${operationsPath}/query.ts`)

      yield* adapter.writeFile(`${operationsPath}/update.ts`, generateProviderUpdateOperationFile(templateOptions))
      filesGenerated.push(`${operationsPath}/update.ts`)

      yield* adapter.writeFile(`${operationsPath}/delete.ts`, generateProviderDeleteOperationFile(templateOptions))
      filesGenerated.push(`${operationsPath}/delete.ts`)

      // Generate operations barrel export
      yield* adapter.writeFile(`${operationsPath}/index.ts`, generateProviderOperationsIndexFile(templateOptions))
      filesGenerated.push(`${operationsPath}/index.ts`)
    }

    // Generate service barrel export
    yield* adapter.writeFile(`${servicePath}/index.ts`, generateProviderServiceIndexFile(templateOptions))
    filesGenerated.push(`${servicePath}/index.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/layers.ts`, generateLayersFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/layers.ts`)

    yield* adapter.writeFile(`${sourceLibPath}/service.spec.ts`, generateServiceSpecFile(templateOptions))
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`)

    // Generate platform-specific export files
    // Always generate server.ts and client.ts since they're declared in package.json exports
    // This ensures imports don't fail even if the platform is node-only

    const serverContent = generateServerFile(templateOptions)
    yield* adapter.writeFile(`${options.sourceRoot}/server.ts`, serverContent)
    filesGenerated.push(`${options.sourceRoot}/server.ts`)

    const clientContent = generateClientFile(templateOptions)
    yield* adapter.writeFile(`${options.sourceRoot}/client.ts`, clientContent)
    filesGenerated.push(`${options.sourceRoot}/client.ts`)

    // Edge exports (conditional)
    if (includeEdge || options.platform === "edge") {
      const edgeContent = generateEdgeFile(templateOptions)
      yield* adapter.writeFile(`${options.sourceRoot}/edge.ts`, edgeContent)
      filesGenerated.push(`${options.sourceRoot}/edge.ts`)
    }

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      packageName: options.packageName,
      filesGenerated
    }
  })
}
