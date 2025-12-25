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
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/provider-generator-core
 */

import { Effect } from "effect"
import type { PlatformType } from "../../utils/build"
import { type FileSystemAdapter, injectEnvVars } from "../../utils/filesystem"
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates"
import type { Platform, ProviderTemplateOptions } from "../../utils/types"
import {
  generateErrorsFile,
  generateIndexFile,
  generateServiceSpecFile,
  generateTypesFile,
  generateValidationFile
} from "../provider/templates/index"
import {
  generateKyselyErrorsFile,
  generateKyselyIndexFile,
  generateKyselyInterfaceFile,
  generateKyselyProviderServiceFile
} from "../provider/templates/kysely"
import {
  generateRedisCacheServiceFile,
  generateRedisErrorsFile,
  generateRedisIndexFile,
  generateRedisPubSubServiceFile,
  generateRedisQueueServiceFile,
  generateRedisServiceFile,
  generateRedisSpecFile,
  generateRedisTypesFile,
  generateRedisTypesOnlyFile
} from "../provider/templates/redis/index"
import { generateProviderServiceFile } from "../provider/templates/service/index"
import {
  generateSupabaseAuthServiceFile,
  generateSupabaseClientServiceFile,
  generateSupabaseErrorsFile,
  generateSupabaseIndexFile,
  generateSupabaseSpecFile,
  generateSupabaseStorageServiceFile,
  generateSupabaseTypesFile
} from "../provider/templates/supabase/index"

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
export function generateProviderCore(adapter: FileSystemAdapter, options: ProviderCoreOptions) {
  return Effect.gen(function*() {
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

    // Detect if this is a special provider with dedicated templates
    const isKyselyProvider = options.name === "kysely" || options.externalService === "Kysely"
    const isSupabaseProvider = options.name === "supabase" || options.externalService === "Supabase"
    const isRedisProvider = options.name === "redis" || options.externalService === "Redis"

    // Generate barrel exports - special providers use specialized templates
    yield* adapter.writeFile(
      `${options.sourceRoot}/index.ts`,
      isKyselyProvider
        ? generateKyselyIndexFile(templateOptions)
        : isSupabaseProvider
        ? generateSupabaseIndexFile(templateOptions)
        : isRedisProvider
        ? generateRedisIndexFile(templateOptions)
        : generateIndexFile(templateOptions)
    )
    filesGenerated.push(`${options.sourceRoot}/index.ts`)

    // Generate types.ts for type-only exports (zero runtime overhead)
    // Redis uses flat lib/ structure, so it needs a specialized template
    const workspaceRoot = adapter.getWorkspaceRoot()
    if (isRedisProvider) {
      const redisTypesOnlyContent = generateRedisTypesOnlyFile(templateOptions)
      yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, redisTypesOnlyContent)
    } else {
      const typesOnlyOptions: TypesOnlyExportOptions = {
        libraryType: "provider",
        className: options.className,
        fileName: options.fileName,
        packageName: options.packageName,
        platform: options.platform === "node"
          ? "server"
          : options.platform === "browser"
          ? "client"
          : "universal"
      }
      const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
      yield* adapter.writeFile(`${workspaceRoot}/${options.sourceRoot}/types.ts`, typesOnlyContent)
    }
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

This provider wraps the \`${options.cliCommand || "cli-command"}\` command-line tool using Effect's Command API.

## Architecture

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types (CommandError, NotFoundError)
- **lib/types.ts**: CLI-specific types (CommandResult, Config)
- **lib/validation.ts**: Input validation helpers

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { CommandResult, ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className};
  const result = yield* service.execute(["--help"])
  const version = yield* service.version;
})
\`\`\`

### Customization Guide

1. **Configure CLI Command** (\`lib/service.ts\`):
   - Command path is configurable via ${templateOptions.className}Config
   - Add custom command methods beyond execute() and version()
   - Configure timeout and environment variables

2. **Error Handling** (\`lib/errors.ts\`):
   - CommandError: Command execution failures
   - NotFoundError: CLI tool not installed
   - Add domain-specific error types as needed

3. **Testing** (\`lib/service.ts\`):
   - Static Test layer uses Layer.succeed with mock implementations
   - Static Auto layer auto-selects Test/Dev/Live based on NODE_ENV
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

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto) and CRUD operations
- **lib/errors.ts**: Data.TaggedError-based error types (HttpError, NetworkError, RateLimitError)
- **lib/types.ts**: HTTP-specific types (ResourceSchema, Config with baseUrl)
- **lib/validation.ts**: Input validation with Effect Schema

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className};
  const resources = yield* service.list({ page: 1, limit: 10 })
  const resource = yield* service.get("resource-id")
})
\`\`\`

### Customization Guide

1. **Configure HTTP Client** (\`lib/service.ts\`):
   - Base URL configured via ${templateOptions.className}Config
   - Authentication via ${options.authType || "bearer"} token
   - Retry policies and timeouts configurable

2. **Define Resource Schema** (\`lib/types.ts\`):
   - Update ResourceSchema to match your API response
   - Use Effect Schema for validation and type safety

3. **API Methods** (\`lib/service.ts\`):
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

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto) and query/mutation operations
- **lib/errors.ts**: Data.TaggedError-based error types (GraphQLError, HttpError)
- **lib/types.ts**: GraphQL-specific types (ResourceSchema, Config with baseUrl)
- **lib/validation.ts**: Input validation with Effect Schema

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className}

  // GraphQL query
  const data = yield* service.query<QueryResult>(\`
    query GetResources {
      resources { id name }
    }
  \`)

  // GraphQL mutation
  const result = yield* service.mutation<MutationResult>(\`
    mutation CreateResource($input: ResourceInput!) {
      createResource(input: $input) { id name }
    }
  \`, { input: { name: "New Resource" } })
})
\`\`\`

### Customization Guide

1. **Configure GraphQL Client** (\`lib/service.ts\`):
   - GraphQL endpoint configured via ${templateOptions.className}Config
   - Authentication via ${options.authType || "bearer"} token
   - Retry policies and timeouts configurable

2. **Define Schema Types** (\`lib/types.ts\`):
   - Update ResourceSchema to match your GraphQL schema
   - Use Effect Schema for response validation

3. **GraphQL Operations** (\`lib/service.ts\`):
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

This is an AI-optimized reference for ${templateOptions.externalService}, a provider library following Effect-based service patterns.

## Architecture

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Service types and configurations
- **lib/validation.ts**: Input validation helpers

## Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { Resource, ${templateOptions.className}Config } from '${templateOptions.packageName}/types'// Service import
import { ${templateOptions.className} } from '${templateOptions.packageName}'Effect.gen(function*() {
  const service = yield* ${templateOptions.className};
  const result = yield* service.list({ page: 1, limit: 10 })
  // ...
})
\`\`\`

### Customization Guide

1. **Configure External Service** (\`lib/service.ts\`):
   - Initialize ${templateOptions.externalService} SDK client in Live layer
   - Configure authentication and connection settings
   - Add health check implementation

2. **Implement Operations** (\`lib/service.ts\`):
   - list(): Query multiple resources
   - get(): Query single resource by ID
   - create(): Create new resource
   - update(): Update existing resource
   - delete(): Remove resource

3. **Configure Layers** (\`lib/service.ts\` static members):
   - Live: Production layer with real SDK
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

\`\`\`typescript
import { ${templateOptions.className} } from '${templateOptions.packageName}';
import type { Resource } from '${templateOptions.packageName}/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* ${templateOptions.className};
  const items = yield* service.list({ page: 1, limit: 10 })
  return items;
})

// With layers
const result = program.pipe(
  Effect.provide(${templateOptions.className}.Live)  // Production
  // or Effect.provide(${templateOptions.className}.Test)   // Testing
  // or Effect.provide(${templateOptions.className}.Auto)   // NODE_ENV-based
)
\`\`\`

## SDK Integration Guide

### Baseline Implementation

The generated library includes a **working baseline implementation** using in-memory storage.
This allows you to:
- Use the service immediately without SDK setup
- Test Effect patterns and layer composition
- Verify integration points before adding external dependencies

### Replacing with Real SDK

Follow these steps to integrate with the actual ${templateOptions.externalService} SDK:

#### 1. Install SDK Package

\`\`\`bash
pnpm add ${templateOptions.externalService.toLowerCase()}-sdk
# Or the actual package name for ${templateOptions.externalService}
\`\`\`

#### 2. Update Live Layer (\`lib/service.ts\`)

Replace the in-memory store with SDK initialization in the static Live layer:

\`\`\`typescript
static readonly Live = Layer.effect(
  ${templateOptions.className},
  Effect.gen(function*() {
    const config: ${templateOptions.className}Config = {
      apiKey: env.${templateOptions.constantName}_API_KEY,
      timeout: env.${templateOptions.constantName}_TIMEOUT || 20000,
    }

    // Initialize SDK client
    const client = new ${templateOptions.externalService}SDK(config)

    return {
      config,
      healthCheck: Effect.succeed({ status: "healthy" as const })
        .pipe(Effect.withSpan("${templateOptions.className}.healthCheck")),

      // Replace store.list with SDK call
      list: (params) =>
        Effect.tryPromise({
          try: () => client.list({
            page: params?.page ?? 1,
            limit: params?.limit ?? 10
          }),
          catch: (error) => new ${templateOptions.className}InternalError({
            message: "Failed to list items",
            cause: error
          })
        }).pipe(
          Effect.timeoutFail({
            duration: \`\${config.timeout} millis\`,
            onTimeout: () => new ${templateOptions.className}TimeoutError({
              message: "list operation timed out",
              timeoutMs: config.timeout,
              operation: "list"
            })
          }),
          Effect.withSpan("${templateOptions.className}.list")
        ),

      // Repeat for get, create, update, delete operations
      // ... (follow same pattern with Effect.tryPromise + timeoutFail)
    }
  }),
)
\`\`\`

#### 3. Add Resource Cleanup (If Needed)

If your SDK requires cleanup (connections, pools, etc.), switch to \`Layer.scoped\`:

\`\`\`typescript
static readonly Live = Layer.scoped(
  ${templateOptions.className},
  Effect.gen(function*() {
    const config: ${templateOptions.className}Config = {
      apiKey: env.${templateOptions.constantName}_API_KEY,
      timeout: env.${templateOptions.constantName}_TIMEOUT || 20000,
    }

    // Initialize SDK with cleanup
    const client = yield* Effect.acquireRelease(
      Effect.tryPromise(() => ${templateOptions.externalService}SDK.connect(config)),
      (client) => Effect.sync(() => client.close())
    )

    return {
      // ... service implementation
    }
  }),
)
\`\`\`

#### 4. Update Dev Layer (Optional)

Add debug logging to Dev layer for development:

\`\`\`typescript
list: (params) =>
  Effect.tryPromise({
    try: () => client.list(params),
    catch: (error) => new ${templateOptions.className}InternalError({
      message: "Failed to list items",
      cause: error
    })
  }).pipe(
    Effect.tap(() => Effect.logDebug("[${templateOptions.className}] list called", params)),
    Effect.timeoutFail({ /* ... */ }),
    Effect.withSpan("${templateOptions.className}.list")
  ),
\`\`\`

### Integration Checklist

- [ ] Install SDK package
- [ ] Update Live layer with SDK initialization
- [ ] Replace in-memory operations with SDK calls
- [ ] Add timeout wrappers (\`Effect.timeoutFail\`)
- [ ] Add error handling (\`Effect.tryPromise\` with typed errors)
- [ ] Keep distributed tracing (\`Effect.withSpan\`)
- [ ] Add cleanup if SDK requires it (\`Layer.scoped\` + \`Effect.addFinalizer\`)
- [ ] Update Dev layer with debug logging
- [ ] Test with real SDK credentials
- [ ] Remove in-memory store helper (or keep for testing)

### Testing Strategy

1. **Keep Test layer unchanged** - it should remain a pure mock
2. **Use Dev layer for local testing** with real SDK
3. **Use Live layer in production**
4. **Use Auto layer for environment-aware selection** (NODE_ENV)

The baseline implementation remains useful for unit tests and demonstrations.
`
    }

    yield* adapter.writeFile(
      `${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`,
      claudeDoc
    )
    filesGenerated.push(`${templateOptions.projectRoot}/CLAUDE.md`)

    // Generate service support files directly in lib/ directory (flat structure)
    // This follows the standardized structure: lib/{service.ts, errors.ts, types.ts, etc}
    yield* adapter.writeFile(
      `${sourceLibPath}/errors.ts`,
      isKyselyProvider
        ? generateKyselyErrorsFile(templateOptions)
        : isSupabaseProvider
        ? generateSupabaseErrorsFile(templateOptions)
        : isRedisProvider
        ? generateRedisErrorsFile(templateOptions)
        : generateErrorsFile(templateOptions)
    )
    filesGenerated.push(`${sourceLibPath}/errors.ts`)

    // Kysely needs interface.ts for the service interface type
    if (isKyselyProvider) {
      yield* adapter.writeFile(
        `${sourceLibPath}/interface.ts`,
        generateKyselyInterfaceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/interface.ts`)
    }

    yield* adapter.writeFile(
      `${sourceLibPath}/types.ts`,
      isSupabaseProvider
        ? generateSupabaseTypesFile(templateOptions)
        : isRedisProvider
        ? generateRedisTypesFile(templateOptions)
        : generateTypesFile(templateOptions)
    )
    filesGenerated.push(`${sourceLibPath}/types.ts`)

    // Supabase and Redis don't need validation.ts (use Effect Schema in types.ts)
    if (!(isSupabaseProvider || isRedisProvider)) {
      yield* adapter.writeFile(
        `${sourceLibPath}/validation.ts`,
        generateValidationFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/validation.ts`)
    }

    // Supabase has multiple service files (client, auth, storage)
    if (isSupabaseProvider) {
      yield* adapter.writeFile(
        `${sourceLibPath}/client.ts`,
        generateSupabaseClientServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/client.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/auth.ts`,
        generateSupabaseAuthServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/auth.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/storage.ts`,
        generateSupabaseStorageServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/storage.ts`)
    } else if (isRedisProvider) {
      // Redis has multiple service files (service, cache, pubsub, queue)
      yield* adapter.writeFile(
        `${sourceLibPath}/redis.ts`,
        generateRedisServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/redis.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/cache.ts`,
        generateRedisCacheServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/cache.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/pubsub.ts`,
        generateRedisPubSubServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/pubsub.ts`)

      yield* adapter.writeFile(
        `${sourceLibPath}/queue.ts`,
        generateRedisQueueServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/queue.ts`)
    } else {
      // Generate service definition at lib/service.ts (Context.Tag with static layers)
      // Import resolves: "./lib/service" → lib/service.ts (file takes precedence over directory)
      yield* adapter.writeFile(
        `${sourceLibPath}/service.ts`,
        isKyselyProvider
          ? generateKyselyProviderServiceFile(templateOptions)
          : generateProviderServiceFile(templateOptions)
      )
      filesGenerated.push(`${sourceLibPath}/service.ts`)
    }

    // Note: SDK operation templates (CRUD) were removed in favor of
    // Effect-based service patterns with Context.Tag and Layer composition.
    // The service.ts file now contains the full service interface.
    // For SDK providers, operations are defined directly in the service template.

    // All providers now use static layers defined on the service class
    // No separate layers.ts file is generated - layers are accessed via:
    //   - ${className}.Live
    //   - ${className}.Test
    //   - ${className}.Dev
    //   - ${className}.Auto

    yield* adapter.writeFile(
      `${sourceLibPath}/service.spec.ts`,
      isSupabaseProvider
        ? generateSupabaseSpecFile(templateOptions)
        : isRedisProvider
        ? generateRedisSpecFile()
        : generateServiceSpecFile(templateOptions)
    )
    filesGenerated.push(`${sourceLibPath}/service.spec.ts`)

    // Platform-specific export files removed - rely on automatic tree-shaking
    // All exports are now handled through the main index.ts

    // Inject environment variables for this provider (except for built-in providers)
    // Built-in providers (kysely, supabase, redis) are handled by init command
    const builtInProviders = ["kysely", "supabase", "redis"]
    if (!builtInProviders.includes(options.name)) {
      yield* injectEnvVars(adapter, [
        { name: `${options.constantName}_API_KEY`, type: "redacted", context: "server" },
        { name: `${options.constantName}_TIMEOUT`, type: "number", context: "server" }
      ])
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
