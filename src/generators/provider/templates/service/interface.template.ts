/**
 * Provider Service Interface Template
 *
 * Generates service/interface.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/provider/service/interface-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder";
import type { ProviderTemplateOptions } from "../../../../utils/shared/types";

/**
 * Generate service/interface.ts file
 *
 * Creates Context.Tag interface with static layers using dynamic imports
 */
export function generateProviderServiceInterfaceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, cliCommand, externalService, fileName, providerType = "sdk" } = options;

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
  - Full service: import { ${className} } from './interface'`
    : `Provider Type: ${providerType}`
}`,
    module: `@custom-repo/provider-${fileName}/service`,
  });
  builder.addBlankLine();

  // Add imports based on provider type
  const effectImports = ["Context", "Effect", "Layer"];
  if (providerType === "cli") {
    effectImports.push("Command");
  }

  builder.addImports([{ from: "effect", imports: effectImports }]);
  builder.addBlankLine();

  // Import env for configuration
  builder.addImports([{ from: "@custom-repo/infra-env", imports: ["env"] }]);
  builder.addBlankLine();

  // Add platform imports for HTTP/GraphQL
  if (providerType === "http" || providerType === "graphql") {
    builder.addImports([
      { from: "@effect/platform", imports: ["HttpClient", "HttpClientRequest", "HttpClientResponse"] },
    ]);
    if (providerType === "http") {
      builder.addImports([{ from: "@effect/platform", imports: ["HttpBody"] }]);
    }
    builder.addImports([{ from: "effect", imports: ["Schedule"] }]);
    builder.addBlankLine();
  }

  // Import shared types and errors - conditional based on provider type
  const typeImports = [`${className}Config`];
  if (providerType === "cli") {
    typeImports.push("CommandResult");
  } else {
    typeImports.push("Resource", "ListParams", "PaginatedResult", "HealthCheckResult");
  }

  builder.addImports([
    {
      from: "../types",
      imports: typeImports,
      isTypeOnly: true,
    },
    {
      from: "../errors",
      imports: [`${className}ServiceError`],
      isTypeOnly: true,
    },
  ]);

  // HTTP/GraphQL providers need ResourceSchema as a value import (not type-only)
  // for HttpClientResponse.schemaBodyJson() validation
  if (providerType === "http" || providerType === "graphql") {
    builder.addImports([
      {
        from: "../types",
        imports: ["ResourceSchema"],
      },
    ]);
  }
  builder.addBlankLine();

  // Service interface - conditional based on provider type
  builder.addSectionComment("Service Interface");
  builder.addBlankLine();

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
  readonly version: Effect.Effect<string, ${className}ServiceError>;
}`);
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
  readonly healthCheck: Effect.Effect<HealthCheckResult, ${className}ServiceError>;

  /**
   * GET request
   */
  readonly get: (path: string) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * POST request
   */
  readonly post: (path: string, body: unknown) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * PUT request
   */
  readonly put: (path: string, body: unknown) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * DELETE request
   */
  readonly delete: (path: string) => Effect.Effect<void, ${className}ServiceError>;

  /**
   * List resources with pagination
   */
  readonly list: (params?: ListParams) => Effect.Effect<PaginatedResult<Resource>, ${className}ServiceError>;
}`);
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
  readonly healthCheck: Effect.Effect<HealthCheckResult, ${className}ServiceError>;

  /**
   * Execute GraphQL query
   */
  readonly query: <T>(
    query: string,
    variables?: Record<string, unknown>
  ) => Effect.Effect<T, ${className}ServiceError>;

  /**
   * Execute GraphQL mutation
   */
  readonly mutation: <T>(
    mutation: string,
    variables?: Record<string, unknown>
  ) => Effect.Effect<T, ${className}ServiceError>;
}`);
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
  readonly healthCheck: Effect.Effect<HealthCheckResult, ${className}ServiceError>;

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
}`);
  }
  builder.addBlankLine();

  // Context.Tag
  builder.addSectionComment("Context.Tag");
  builder.addBlankLine();

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
>() {`);

  // Add conditional Live layer implementation
  if (providerType === "cli") {
    // CLI Live Layer
    builder.addRaw(`  /**
   * Live Layer - CLI command execution
   *
   * Executes ${cliCommand || externalService} commands using Effect Command
   */
  static readonly Live = Layer.effect(
    this,
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
  )`);
  } else if (providerType === "http") {
    // HTTP Live Layer
    builder.addRaw(`  /**
   * Live Layer - HTTP REST API client
   *
   * Uses HttpClient from @effect/platform for ${externalService}
   */
  static readonly Live = Layer.effect(
    this,
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
          Effect.map((data: any) => ({
            data: data.items || [],
            page: params?.page || 1,
            limit: params?.limit || 10,
            total: data.total || 0
          })),
          Effect.mapError(() => new ${className}HttpError({
            message: "List request failed",
            statusCode: 500,
            method: "GET",
            url: "/resources"
          }))
        )

      return { config, healthCheck, get, post, put, delete: del, list }
    })
  )`);
  } else if (providerType === "graphql") {
    // GraphQL Live Layer
    builder.addRaw(`  /**
   * Live Layer - GraphQL API client
   *
   * Uses HttpClient for GraphQL operations on ${externalService}
   */
  static readonly Live = Layer.effect(
    this,
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
          Effect.flatMap((response: any) => {
            if (response.errors && response.errors.length > 0) {
              return Effect.fail(new ${className}GraphQLError({
                message: "GraphQL operation failed",
                errors: response.errors
              }))
            }
            if (!response.data) {
              return Effect.fail(new ${className}Error({
                message: "No data in GraphQL response"
              }))
            }
            return Effect.succeed(response.data as T)
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
  )`);
  } else {
    // SDK Live Layer (original implementation)
    builder.addRaw(`  /**
   * Live Layer - Production implementation
   *
   * Uses dynamic imports to load operations on-demand.
   * Each operation file is only loaded when the layer is constructed.
   *
   * TODO: Configure ${externalService} SDK client
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Initialize ${externalService} SDK client
      // Example:
      // const client = yield* Effect.promise(() =>
      //   import("${externalService}-sdk").then(m => new m.${externalService}Client(config))
      // );

      // =================================================================
      // OPTIONAL: Rate Limiting with Semaphore
      // =================================================================
      //
      // If your external service has rate limits, use Semaphore to control concurrency:
      //
      // import { Effect } from "effect";
      //
      // // Create semaphore with max concurrent requests (e.g., 5 concurrent API calls)
      // const rateLimiter = yield* Effect.makeSemaphore(5);
      //
      // // Wrap operations with semaphore.withPermits:
      // const rateLimitedGet = (id: string) =>
      //   rateLimiter.withPermits(1)(
      //     Effect.tryPromise({
      //       try: () => client.get(id),
      //       catch: (error) => new ${className}ServiceError({ cause: error })
      //     })
      //   );
      //
      // Benefits:
      // - Prevents "429 Too Many Requests" errors
      // - Protects external service from overload
      // - Automatic backpressure (suspends when permits exhausted)
      // - No manual throttling logic needed
      //
      // Use Cases:
      // - API rate limiting (max 10 requests/second → semaphore with 10 permits)
      // - Connection pooling (max 20 DB connections → semaphore with 20 permits)
      // - Resource throttling (max 3 concurrent file uploads → semaphore with 3 permits)
      //
      // See EFFECT_PATTERNS.md "Semaphore - Resource Limiting & Rate Control" for comprehensive examples.

      // =================================================================
      // OPTIONAL: Lazy Initialization with Deferred
      // =================================================================
      //
      // Use Deferred for lazy initialization and fiber coordination:
      //
      // import { Deferred, Effect } from "effect";
      //
      // // Create deferred value for cache warmup
      // const cacheReady = yield* Deferred.make<void, never>();
      //
      // // Start background warmup, signal when complete
      // yield* Effect.forkScoped(
      //   Effect.gen(function* () {
      //     // yield* warmupCache();
      //     yield* Deferred.succeed(cacheReady, void 0);
      //   })
      // );
      //
      // // Operations wait for cache before executing:
      // get: (id: string) =>
      //   Effect.gen(function* () {
      //     yield* Deferred.await(cacheReady);  // Wait for warmup
      //     // ...proceed with operation
      //   }),
      //
      // Benefits:
      // - One-time value resolution (like Promise)
      // - Type-safe fiber coordination
      // - Automatic suspension of waiting fibers
      // - No polling or busy-waiting needed
      //
      // Use Cases:
      // - Cache warmup coordination (wait for cache before serving)
      // - Lazy resource initialization (initialize on first use)
      // - Fiber handoff (pass values between fibers)
      // - Configuration loading (wait for config before operations)
      //
      // Deferred vs Latch:
      // - Deferred: Carries a value (like Promise), can fail
      // - Latch: Just a gate (no value), always succeeds
      //
      // See EFFECT_PATTERNS.md "Deferred - Fiber Coordination" for comprehensive examples.

      // Lazy load operations for optimal bundle size
      const createOps = yield* Effect.promise(() =>
        import("./operations/create").then((m) => m.createOperations)
      );
      const queryOps = yield* Effect.promise(() =>
        import("./operations/query").then((m) => m.queryOperations)
      );
      const updateOps = yield* Effect.promise(() =>
        import("./operations/update").then((m) => m.updateOperations)
      );
      const deleteOps = yield* Effect.promise(() =>
        import("./operations/delete").then((m) => m.deleteOperations)
      );

      // Configuration from environment variables
      const config: ${className}Config = {
        apiKey: env.${options.constantName}_API_KEY,
        timeout: env.${options.constantName}_TIMEOUT || 20000,
      };

      return {
        config,
        healthCheck: Effect.succeed({ status: "healthy" }),
        ...createOps,
        ...queryOps,
        ...updateOps,
        ...deleteOps
      };
    })
  );

  /**
   * Test Layer - In-memory implementation
   *
   * Uses Layer.succeed for deterministic testing.
   * No dynamic imports - all operations are plain functions for proper Layer.fresh isolation.
   *
   * IMPORTANT: This provides minimal stub implementations.
   * Customize these stubs based on your testing needs.
   */
  static readonly Test = Layer.succeed(
    this,
    {
      config: { apiKey: "test-key", timeout: 1000 } as ${className}Config,
      healthCheck: Effect.succeed({ status: "healthy" as const }),

      // Query operations
      list: () => Effect.succeed({
        data: [{ id: "test-id-1", name: "test-resource", createdAt: new Date(), updatedAt: new Date() }] as Resource[],
        page: 1,
        limit: 10,
        total: 1,
      } as PaginatedResult<Resource>),
      get: (id) => Effect.succeed({
        id,
        name: "test-resource",
        createdAt: new Date(),
        updatedAt: new Date()
      } as Resource),

      // Create operations
      create: (data) => Effect.succeed({
        id: "test-id-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource),

      // Update operations
      update: (id, data) => Effect.succeed({
        id,
        ...data,
        name: data.name || "test-resource",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource),

      // Delete operations
      delete: () => Effect.void,
    }
  );

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   * Useful for debugging external SDK integrations.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      console.log(\`[${className}] [DEV] Initializing development layer\`);

      // Get actual implementation from Live layer
      const liveService = yield* ${className}.Live.pipe(
        Layer.build,
        Effect.map(Context.unsafeGet(${className}))
      );

      // Wrap all operations with logging
      return {
        config: liveService.config,

        healthCheck: Effect.gen(function* () {
          console.log(\`[${className}] [DEV] healthCheck called\`);
          const result = yield* liveService.healthCheck;
          console.log(\`[${className}] [DEV] healthCheck result:\`, result);
          return result;
        }),

        list: (params) =>
          Effect.gen(function* () {
            console.log(\`[${className}] [DEV] list called with:\`, params);
            const result = yield* liveService.list(params);
            console.log(\`[${className}] [DEV] list result:\`, { count: result.data.length, total: result.total });
            return result;
          }),

        get: (id) =>
          Effect.gen(function* () {
            console.log(\`[${className}] [DEV] get called with id:\`, id);
            const result = yield* liveService.get(id);
            console.log(\`[${className}] [DEV] get result:\`, result);
            return result;
          }),

        create: (data) =>
          Effect.gen(function* () {
            console.log(\`[${className}] [DEV] create called with:\`, data);
            const result = yield* liveService.create(data);
            console.log(\`[${className}] [DEV] create result:\`, result);
            return result;
          }),

        update: (id, data) =>
          Effect.gen(function* () {
            console.log(\`[${className}] [DEV] update called with id:\`, id, \`data:\`, data);
            const result = yield* liveService.update(id, data);
            console.log(\`[${className}] [DEV] update result:\`, result);
            return result;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            console.log(\`[${className}] [DEV] delete called with id:\`, id);
            yield* liveService.delete(id);
            console.log(\`[${className}] [DEV] delete completed\`);
          })
      };
    })
  );
}`);
  }

  return builder.toString();
}
