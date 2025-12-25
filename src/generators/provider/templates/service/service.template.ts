/**
 * Provider Service Template
 *
 * Generates service/service.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/provider/service/service-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate service/service.ts file
 *
 * Creates Context.Tag interface with static layers using dynamic imports
 */
export function generateProviderServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, cliCommand, externalService, fileName, providerType = "sdk" } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className} provider service.

External Service: ${externalService}

${
      providerType === "sdk"
        ? `Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create'
  - Full service: import { ${className} } from './service'`
        : `Provider Type: ${providerType}`
    }`,
    module: `${scope}/provider-${fileName}/service`
  })
  builder.addBlankLine()

  // Add imports based on provider type
  const effectImports = ["Context", "Effect", "Layer"]
  if (providerType === "cli") {
    effectImports.push("Command")
  }

  builder.addImports([{ from: "effect", imports: [...effectImports, "Redacted"] }])
  builder.addBlankLine()

  // Add platform imports for HTTP/GraphQL
  if (providerType === "http" || providerType === "graphql") {
    builder.addImports([
      {
        from: "@effect/platform",
        imports: ["HttpClient", "HttpClientRequest", "HttpClientResponse"]
      }
    ])
    if (providerType === "http") {
      builder.addImports([{ from: "@effect/platform", imports: ["HttpBody"] }])
    }
    builder.addImports([{ from: "effect", imports: ["Schedule"] }])
    builder.addBlankLine()
  }

  // Import shared types and errors - conditional based on provider type
  const typeImports = [`${className}Config`]
  if (providerType === "cli") {
    typeImports.push("CommandResult")
  } else {
    typeImports.push("Resource", "ListParams", "PaginatedResult", "HealthCheckResult")
  }

  // Import from lib/ (flat structure - all files at same level as service.ts)
  builder.addImports([
    {
      from: "./types",
      imports: typeImports,
      isTypeOnly: true
    },
    {
      from: "./errors",
      imports: [`${className}ServiceError`],
      isTypeOnly: true
    }
  ])

  // Import NotFoundError as value for Test layer usage
  builder.addImports([
    {
      from: "./errors",
      imports: [`${className}NotFoundError`]
    }
  ])

  // Environment configuration
  builder.addImports([{ from: `${scope}/env`, imports: ["env"] }])

  // HTTP/GraphQL providers need ResourceSchema as a value import (not type-only)
  // for HttpClientResponse.schemaBodyJson() validation
  if (providerType === "http" || providerType === "graphql") {
    builder.addImports([
      {
        from: "./types",
        imports: ["ResourceSchema"]
      }
    ])
  }
  builder.addBlankLine()

  // Service interface - conditional based on provider type
  builder.addSectionComment("Service Interface")
  builder.addBlankLine()

  if (providerType === "cli") {
    // CLI Provider Interface
    builder.addRaw(`/**
 * ${className} Service Interface
 *
 * CLI Provider: Wraps ${cliCommand || externalService} command execution
 *
 * Operations:
 * - Command execution with stdout/stderr capture
 * - Version detection
 */
export interface ${className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: ${className}Config;

  /**
   * Execute command with arguments
   */
  readonly execute: (
    args: readonly string[]
  ) => Effect.Effect<CommandResult, ${className}ServiceError>;

  /**
   * Get command version
   */
  readonly version;
}`)
  } else if (providerType === "http") {
    // HTTP Provider Interface
    builder.addRaw(`/**
 * ${className} Service Interface
 *
 * HTTP Provider: REST API client for ${externalService}
 *
 * Operations:
 * - HTTP verbs (GET, POST, PUT, DELETE)
 * - Pagination support
 * - Schema validation
 * - Retry logic with exponential backoff
 */
export interface ${className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: ${className}Config;

  /**
   * Health check - verifies API connectivity
   */
  readonly healthCheck;

  /**
   * GET request
   */
  readonly get: (path: string);

  /**
   * POST request
   */
  readonly post: (path: string, body: unknown);

  /**
   * PUT request
   */
  readonly put: (path: string, body: unknown);

  /**
   * DELETE request
   */
  readonly delete: (path: string);

  /**
   * List resources with pagination
   */
  readonly list: (params?: ListParams);
}`)
  } else if (providerType === "graphql") {
    // GraphQL Provider Interface
    builder.addRaw(`/**
 * ${className} Service Interface
 *
 * GraphQL Provider: GraphQL client for ${externalService}
 *
 * Operations:
 * - GraphQL queries
 * - GraphQL mutations
 * - Type-safe operations
 */
export interface ${className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: ${className}Config;

  /**
   * Health check - verifies GraphQL endpoint connectivity
   */
  readonly healthCheck;

  /**
   * Execute GraphQL query
   */
  readonly query: <T>(
    query: string,
    variables?: Record<string, unknown>
  );

  /**
   * Execute GraphQL mutation
   */
  readonly mutation: <T>(
    mutation: string,
    variables?: Record<string, unknown>
  );
}`)
  } else {
    // SDK Provider Interface (original)
    builder.addRaw(`/**
 * ${className} Service Interface
 *
 * Provider: External service adapter for ${externalService}
 *
 * Operations:
 * - Health check and configuration
 * - CRUD operations for external service resources
 * - Pagination support for list operations
 * - Retry logic with exponential backoff
 */
export interface ${className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: ${className}Config;

  /**
   * Health check - verifies service connectivity
   */
  readonly healthCheck: Effect.Effect<
    HealthCheckResult,
    ${className}ServiceError
  >;

  /**
   * List resources with pagination support
   */
  readonly list: (
    params?: ListParams
  ) => Effect.Effect<PaginatedResult<Resource>, ${className}ServiceError>;

  /**
   * Get resource by ID
   */
  readonly get: (
    id: string
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Create new resource
   */
  readonly create: (
    data: Omit<Resource, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Update existing resource
   */
  readonly update: (
    id: string,
    data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Delete resource
   */
  readonly delete: (
    id: string
  ) => Effect.Effect<void, ${className}ServiceError>;

  // ==========================================================================
  // TODO: Stream-Based Operations for Large-Scale API Interactions
  // ==========================================================================
  //
  // Stream provides constant-memory processing for paginated APIs and bulk operations.
  // Use Stream when:
  // - Fetching all pages from paginated API endpoints
  // - Processing large batches of API calls
  // - Streaming events from external services
  // - Need backpressure to avoid rate limits
  //
  // Example 1: Stream all pages from paginated API
  //
  // readonly streamAll: (
  //   params?: Omit<ListParams, "page">
  // ) => Stream.Stream<Resource, ${className}ServiceError, never>;
  //
  // // Implementation:
  // streamAll: (params) =>
  //   Stream.asyncScoped<Resource, ${className}ServiceError>((emit) =>
  //     Effect.gen(function* () {
  //       const client = yield* ${className}Client;
  //       let page = 1;
  //       let hasMore = true;
  //
  //       while (hasMore) {
  //         const result = yield* client.list({ ...params, page }).pipe(
  //           Effect.retry({
  //             schedule: Schedule.exponential("1 second").pipe(
  //               Schedule.compose(Schedule.recurs(3))
  //             )
  //           })
  //         );
  //
  //         for (const item of result.data) {
  //           yield* emit.single(item);
  //         }
  //
  //         hasMore = result.data.length === result.limit;
  //         page++;
  //
  //         // Rate limiting: delay between pages
  //         if (hasMore) {
  //           yield* Effect.sleep("100 millis");
  //         }
  //       }
  //     })
  //   ),
  //
  // // Usage in service layer:
  // const all = yield* provider.streamAll({ limit: 100 }).pipe(
  //   Stream.runCollect,
  //   Effect.map(Chunk.toArray)
  // );
  //
  // Benefits:
  // - Constant memory regardless of total items
  // - Built-in rate limiting between pages
  // - Automatic retry with backoff
  //
  // Example 2: Bulk create with backpressure
  //
  // readonly bulkCreate: (
  //   items: readonly Omit<Resource, "id" | "createdAt" | "updatedAt">[]
  // ) => Stream.Stream<Resource, ${className}ServiceError, never>;
  //
  // // Implementation:
  // bulkCreate: (items) =>
  //   Stream.fromIterable(items).pipe(
  //     // Process 5 at a time (concurrency control)
  //     Stream.mapEffect(
  //       (item) => this.create(item),
  //       { concurrency: 5 }
  //     ),
  //     // Add delay between batches for rate limiting
  //     Stream.tap(() => Effect.sleep("200 millis"))
  //   ),
  //
  // // Usage:
  // const created = yield* provider.bulkCreate(items).pipe(
  //   Stream.runCollect,
  //   Effect.map(Chunk.toArray)
  // );
  //
  // Benefits:
  // - Respects API rate limits
  // - Controlled concurrency
  // - Backpressure prevents overwhelming external service
  //
  // Example 3: Stream events from webhook/external source
  //
  // readonly streamEvents: () => Stream.Stream<
  //   ${className}Event,
  //   ${className}ServiceError,
  //   never
  // >;
  //
  // // Implementation with Queue:
  // streamEvents: () =>
  //   Stream.asyncScoped<${className}Event, ${className}ServiceError>((emit) =>
  //     Effect.gen(function* () {
  //       const client = yield* ${className}Client;
  //
  //       // Subscribe to webhook/SSE/websocket
  //       const subscription = yield* Effect.acquireRelease(
  //         Effect.gen(function* () {
  //           const sub = yield* client.subscribe();
  //
  //           // Emit events as they arrive
  //           sub.on("event", (event) => {
  //             emit.single(event);
  //           });
  //
  //           return sub;
  //         }),
  //         (sub) => Effect.sync(() => sub.unsubscribe())
  //       );
  //
  //       // Keep stream alive
  //       yield* Effect.never;
  //     })
  //   ),
  //
  // // Usage:
  // yield* provider.streamEvents().pipe(
  //   Stream.mapEffect((event) => processEvent(event)),
  //   Stream.runDrain
  // );
  //
  // Example 4: Batch delete with retry
  //
  // readonly bulkDelete: (
  //   ids: readonly string[]
  // ) => Stream.Stream<void, ${className}ServiceError, never>;
  //
  // // Implementation:
  // bulkDelete: (ids) =>
  //   Stream.fromIterable(ids).pipe(
  //     // Process 10 at a time
  //     Stream.grouped(10),
  //     Stream.mapEffect((batch) =>
  //       Effect.gen(function* () {
  //         yield* Effect.forEach(
  //           batch,
  //           (id) => this.delete(id).pipe(
  //             Effect.retry({
  //               schedule: Schedule.exponential("1 second").pipe(
  //                 Schedule.compose(Schedule.recurs(3))
  //               )
  //             })
  //           ),
  //           { concurrency: 10 }
  //         );
  //       })
  //     ),
  //     Stream.tap(() => Effect.sleep("500 millis")) // Rate limiting
  //   ),
  //
  // // Usage:
  // yield* provider.bulkDelete(idsToDelete).pipe(Stream.runDrain);
  //
  // See EFFECT_PATTERNS.md "Streaming & Queuing Patterns" for comprehensive examples.
  // See PROVIDER.md for provider-specific Stream integration patterns.
}`)
  }
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}
 *
 * Static layers:
 * - ${className}.Live - Production with real ${externalService} SDK
 * - ${className}.Test - In-memory for testing
 * - ${className}.Dev - Development with logging
 *
 * Bundle optimization:
 * Operations are lazy-loaded via dynamic imports for optimal tree-shaking.
 * Only the operations you use will be included in your bundle.
 */
export class ${className} extends Context.Tag("${className}")<
  ${className},
  ${className}ServiceInterface
>() {`)

  // Add conditional Live layer implementation
  if (providerType === "cli") {
    // CLI Live Layer
    builder.addRaw(`  /**
   * Live Layer - CLI command execution
   *
   * Executes ${cliCommand || externalService} commands using Effect Command
   */
  static readonly Live = Layer.effect(
    ${className},
    Effect.gen(function* () {
      const config = yield* ${className}Config

      const execute = (args: readonly string[]) =>
        Command.make("${cliCommand}", ...args).pipe(
          Command.string,
          Effect.map((output) => ({ output, exitCode: 0 })),
          Effect.mapError((error) => new ${className}Error({
            message: "Command execution failed",
            cause: error
          }))
        )

      const version = Command.make("${cliCommand}", "--version").pipe(
        Command.string,
        Effect.mapError((error) => new ${className}Error({ cause: error }))
      )

      return { config, execute, version }
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by mocking command execution or using test fixtures.
   */
  static readonly Test = this.Live;

  /**
   * Dev layer - Same as Live
   *
   * Enhanced logging comes from command output capture.
   */
  static readonly Dev = this.Live;

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Uses type-safe env library for environment access.
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}.Test;
      case "development":
        return ${className}.Dev;
      case "production":
      default:
        return ${className}.Live;
    }
  });
}`)
  } else if (providerType === "http") {
    // HTTP Live Layer
    builder.addRaw(`  /**
   * Live Layer - HTTP REST API client
   *
   * Uses HttpClient from @effect/platform for ${externalService}
   */
  static readonly Live = Layer.effect(
    ${className},
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const config = yield* ${className}Config

      const scopedClient = client.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl(config.baseUrl)),
        HttpClient.mapRequest(HttpClientRequest.bearerToken(config.apiKey)),
        HttpClient.retry(Schedule.exponential("100 millis"), { times: 3 })
      )

      const healthCheck = scopedClient.get("/health").pipe(
        Effect.flatMap(HttpClientResponse.json),
        Effect.map(() => ({ status: "healthy" as const })),
        Effect.catchAll(() => Effect.succeed({ status: "unhealthy" as const }))
      )

      const get = (path: string) =>
        scopedClient.get(path).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(ResourceSchema)),
          Effect.mapError((error) => new ${className}HttpError({
            message: "GET request failed",
            statusCode: 500,
            method: "GET",
            url: path
          }))
        )

      const post = (path: string, body: unknown) =>
        scopedClient.post(path, { body: HttpBody.json(body) }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(ResourceSchema)),
          Effect.mapError((error) => new ${className}HttpError({
            message: "POST request failed",
            statusCode: 500,
            method: "POST",
            url: path
          }))
        )

      const put = (path: string, body: unknown) =>
        scopedClient.put(path, { body: HttpBody.json(body) }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(ResourceSchema)),
          Effect.mapError((error) => new ${className}HttpError({
            message: "PUT request failed",
            statusCode: 500,
            method: "PUT",
            url: path
          }))
        )

      const del = (path: string) =>
        scopedClient.delete(path).pipe(
          Effect.asVoid,
          Effect.mapError((error) => new ${className}HttpError({
            message: "DELETE request failed",
            statusCode: 500,
            method: "DELETE",
            url: path
          }))
        )

      const list = (params?: ListParams) =>
        scopedClient.get(\`/resources?page=\${params?.page || 1}&limit=\${params?.limit || 10}\`).pipe(
          Effect.flatMap(HttpClientResponse.json),
          Effect.flatMap((data: unknown) => {
            // Schema validation for runtime type safety
            const ResponseSchema = Schema.Struct({
              items: Schema.Array(Schema.Unknown),
              total: Schema.Number
            })

            return Schema.decodeUnknown(ResponseSchema)(data).pipe(
              Effect.mapError(() => new ${className}HttpError({
                message: "Invalid API response format",
                statusCode: 500,
                method: "GET",
                url: "/resources"
              })),
              Effect.map((validated) => ({
                data: validated.items,
                page: params?.page || 1,
                limit: params?.limit || 10,
                total: validated.total
              }))
            )
          }),
          Effect.mapError(() => new ${className}HttpError({
            message: "List request failed",
            statusCode: 500,
            method: "GET",
            url: "/resources"
          }))
        )

      return { config, healthCheck, get, post, put, delete: del, list }
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by mocking HttpClient responses.
   */
  static readonly Test = this.Live;

  /**
   * Dev layer - Same as Live
   *
   * Enhanced logging via HttpClient interceptors.
   */
  static readonly Dev = this.Live;

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Uses type-safe env library for environment access.
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}.Test;
      case "development":
        return ${className}.Dev;
      case "production":
      default:
        return ${className}.Live;
    }
  });
}`)
  } else if (providerType === "graphql") {
    // GraphQL Live Layer
    builder.addRaw(`  /**
   * Live Layer - GraphQL API client
   *
   * Uses HttpClient for GraphQL operations on ${externalService}
   */
  static readonly Live = Layer.effect(
    ${className},
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const config = yield* ${className}Config

      const execute = <T>(operation: string, variables?: Record<string, unknown>) =>
        client.post(config.baseUrl, {
          body: HttpBody.json({ query: operation, variables }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": \`Bearer \${config.apiKey}\`
          }
        }).pipe(
          Effect.flatMap(HttpClientResponse.json),
          Effect.flatMap((response: unknown) => {
            // Schema validation for GraphQL responses
            const GraphQLResponseSchema = Schema.Struct({
              data: Schema.optional(Schema.Unknown),
              errors: Schema.optional(Schema.Array(Schema.Struct({
                message: Schema.String
              })))
            })

            return Schema.decodeUnknown(GraphQLResponseSchema)(response).pipe(
              Effect.mapError(() => new ${className}GraphQLError({
                message: "Invalid GraphQL response format",
                operation,
                variables
              }))
            )
          }),
          Effect.flatMap((validated) => {
            // Check for GraphQL errors
            if (validated.errors && validated.errors.length > 0) {
              return Effect.fail(new ${className}GraphQLError({
                message: "GraphQL operation failed",
                operation,
                variables,
                errors: validated.errors
              }))
            }

            // Check for data
            if (!validated.data) {
              return Effect.fail(new ${className}Error({
                message: "No data in GraphQL response"
              }))
            }

            return Effect.succeed(validated.data)
          })
        )

      const healthCheck = execute<{ status: string }>(\`{ health { status } }\`).pipe(
        Effect.map(() => ({ status: "healthy" as const })),
        Effect.catchAll(() => Effect.succeed({ status: "unhealthy" as const }))
      )

      return {
        config,
        healthCheck,
        query: execute,
        mutation: execute
      }
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by mocking GraphQL responses.
   */
  static readonly Test = this.Live;

  /**
   * Dev layer - Same as Live
   *
   * Enhanced logging for GraphQL operations.
   */
  static readonly Dev = this.Live;

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Uses type-safe env library for environment access.
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}.Test;
      case "development":
        return ${className}.Dev;
      case "production":
      default:
        return ${className}.Live;
    }
  });
}`)
  } else {
    // SDK Live Layer - Uses in-memory baseline implementation
    // Replace with real SDK calls when integrating with external service
    builder.addRaw(`  /**
   * Live Layer - Production implementation
   *
   * Currently uses in-memory baseline. Replace with ${externalService} SDK integration:
   *
   * @example
   * \`\`\`typescript
   * // 1. Install SDK: pnpm add ${externalService.toLowerCase()}-sdk
   * // 2. Replace in-memory store with SDK calls:
   * static readonly Live = Layer.effect(
   *   this,
   *   Effect.gen(function* () {
   *     const client = new ${externalService}Client(config);
   *     return {
   *       get: (id) => Effect.tryPromise({
   *         try: () => client.get(id),
   *         catch: (error) => new ${className}InternalError({ message: "Get failed", cause: error })
   *       }),
   *       // ... other methods
   *     };
   *   })
   * );
   * \`\`\`
   */
  static readonly Live = Layer.effect(
    ${className},
    Effect.gen(function* () {
      // Lazy import env - only loads when Live layer is built, not at module parse time
      // This allows tests to import service.ts without triggering env validation
      const { env } = yield* Effect.promise(() => import("${scope}/env"));

      // In-memory baseline implementation
      // TODO: Replace with ${externalService} SDK integration
      const store = new Map<string, Resource>();
      let idCounter = 0;

      // Configuration from environment variables
      const config: ${className}Config = {
        apiKey: Redacted.value(env.${options.constantName}_API_KEY) ?? "fallback_api_key",
        timeout: env.${options.constantName}_TIMEOUT ?? 20000,
      };

      return {
        config,

        healthCheck: Effect.succeed({ status: "healthy" as const }),

        list: (params) =>
          Effect.sync(() => {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? 10;
            const items = Array.from(store.values());
            const start = (page - 1) * limit;
            const end = start + limit;
            return {
              data: items.slice(start, end),
              page,
              limit,
              total: items.length,
            };
          }),

        get: (id) =>
          Effect.gen(function* () {
            const item = store.get(id);
            if (!item) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
            return item;
          }),

        create: (data) =>
          Effect.sync(() => {
            const id = \`live-\${++idCounter}\`;
            const now = new Date();
            const item: Resource = {
              id,
              ...data,
              createdAt: now,
              updatedAt: now,
            };
            store.set(id, item);
            return item;
          }),

        update: (id, data) =>
          Effect.gen(function* () {
            const item = store.get(id);
            if (!item) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
            const updated: Resource = {
              ...item,
              ...data,
              id,
              createdAt: item.createdAt,
              updatedAt: new Date(),
            };
            store.set(id, updated);
            return updated;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            const existed = store.delete(id);
            if (!existed) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
          }),
      };
    })
  );

  /**
   * Test Layer - Placeholder implementation
   *
   * Uses Layer.sync for deterministic testing with in-memory store.
   * Each Layer.fresh creates isolated state for test independence.
   *
   * Provides a fully functional baseline implementation for testing.
   * Customize via Layer.succeed(${className}, \\{ ...your mock implementations \\})
   * for specific test scenarios.
   */
  static readonly Test = Layer.sync(
    ${className},
    () => {
      // In-memory store for test isolation
      const store = new Map<string, Resource>();
      let idCounter = 0;

      return {
        // Configuration with test values
        config: { apiKey: "test-key", timeout: 1000 },

        // Health check returns success
        healthCheck: Effect.succeed({ status: "healthy" as const }),

        // List with pagination
        list: (params) =>
          Effect.sync(() => {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? 10;
            const items = Array.from(store.values());
            const start = (page - 1) * limit;
            const end = start + limit;
            return {
              data: items.slice(start, end),
              page,
              limit,
              total: items.length,
            };
          }),

        // Get by ID with proper error handling
        get: (id) =>
          Effect.gen(function* () {
            const item = store.get(id);
            if (!item) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
            return item;
          }),

        // Create with generated ID
        create: (data) =>
          Effect.sync(() => {
            const id = \`test-\${++idCounter}\`;
            const now = new Date();
            const item: Resource = {
              id,
              ...data,
              createdAt: now,
              updatedAt: now,
            };
            store.set(id, item);
            return item;
          }),

        // Update existing resource
        update: (id, data) =>
          Effect.gen(function* () {
            const item = store.get(id);
            if (!item) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
            const updated: Resource = {
              ...item,
              ...data,
              id,
              createdAt: item.createdAt,
              updatedAt: new Date(),
            };
            store.set(id, updated);
            return updated;
          }),

        // Delete with existence check
        delete: (id) =>
          Effect.gen(function* () {
            const existed = store.delete(id);
            if (!existed) {
              return yield* Effect.fail(
                new ${className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              );
            }
          }),
      };
    }
  );

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   * Uses Effect.logDebug for testable, structured logging.
   */
  static readonly Dev = Layer.effect(
    ${className},
    Effect.gen(function* () {
      yield* Effect.logDebug("[${className}] [DEV] Initializing development layer");

      // Get actual implementation from Live layer
      const liveService = yield* ${className}.Live.pipe(
        Layer.build,
        Effect.map((ctx) => Context.get(ctx, ${className}))
      );

      // Wrap all operations with logging
      return {
        config: liveService.config,

        healthCheck: Effect.gen(function* () {
          yield* Effect.logDebug("[${className}] [DEV] healthCheck called");
          const result = yield* liveService.healthCheck;
          yield* Effect.logDebug("[${className}] [DEV] healthCheck result", { result });
          return result;
        }),

        list: (params) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}] [DEV] list called", { params });
            const result = yield* liveService.list(params);
            yield* Effect.logDebug("[${className}] [DEV] list result", { count: result.data.length, total: result.total });
            return result;
          }),

        get: (id) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}] [DEV] get called", { id });
            const result = yield* liveService.get(id);
            yield* Effect.logDebug("[${className}] [DEV] get result", { result });
            return result;
          }),

        create: (data) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}] [DEV] create called", { data });
            const result = yield* liveService.create(data);
            yield* Effect.logDebug("[${className}] [DEV] create result", { result });
            return result;
          }),

        update: (id, data) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}] [DEV] update called", { id, data });
            const result = yield* liveService.update(id, data);
            yield* Effect.logDebug("[${className}] [DEV] update result", { result });
            return result;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}] [DEV] delete called", { id });
            yield* liveService.delete(id);
            yield* Effect.logDebug("[${className}] [DEV] delete completed", { id });
          })
      };
    })
  );

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on NODE_ENV:
   * - "production" → Live layer
   * - "development" → Dev layer (with logging)
   * - "test" → Test layer
   * - undefined/other → Live layer (default)
   *
   * Use this layer when you want automatic environment detection.
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}.Test;
      case "development":
        return ${className}.Dev;
      case "production":
      default:
        return ${className}.Live;
    }
  });
}`)
  }

  return builder.toString()
}
