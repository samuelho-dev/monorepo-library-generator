/**
 * Infrastructure Service Template
 *
 * Generates the service definition using Effect 3.0+ Context.Tag pattern.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"
import {
  hasProviderMapping,
  getProviderClassName,
  getProviderPackageName
} from "../../../utils/infra-provider-mapping"

/**
 * Generate service file for infrastructure service
 */
export function generateServiceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeClientServer } = options

  // Check if this infrastructure has a provider mapping
  const hasProvider = hasProviderMapping(fileName)
  const providerClassName = hasProvider
    ? getProviderClassName(fileName)
    : undefined
  const providerPackage = hasProvider
    ? getProviderPackageName(fileName, "@custom-repo")
    : undefined

  // Check if this is a database infrastructure
  const isDatabaseInfra = fileName === "database"

  // File header
  builder.addFileHeader({
    title: `${className} Service`,
    description:
      `Infrastructure service using Effect 3.0+ Context.Tag pattern.\n\nProvides CRUD operations with dependency injection and resource management.\nCustomize resource initialization, dependencies, and error handling as needed.`,
    module: `@custom-repo/infra-${fileName}/service`,
    see: [
      "EFFECT_PATTERNS.md for service patterns and examples"
    ]
  })

  // Imports
  builder.addImports([
    { from: "node:crypto", imports: ["randomUUID"] },
    { from: "effect", imports: ["Effect", "Layer", "Option", "Context"] },
    {
      from: "./errors",
      imports: [
        `${className}InternalError`
      ]
    },
    { from: "./errors", imports: [`${className}Error`], isTypeOnly: true }
  ])

  // Add provider import if mapping exists
  if (hasProvider && providerClassName && providerPackage) {
    builder.addImport(providerPackage, providerClassName)
  }

  // Add Kysely type imports and KyselyService for database infrastructure
  if (isDatabaseInfra) {
    builder.addImports([
      { from: "kysely", imports: ["Kysely"], isTypeOnly: true },
      { from: "@custom-repo/types-database", imports: ["Database"], isTypeOnly: true },
      { from: "../providers/kysely-provider", imports: ["KyselyService"] }
    ])
  }

  // Section: Service Context.Tag Definition
  builder.addSectionComment(
    "Service Context.Tag Definition with Inline Interface (Effect 3.0+)"
  )

  // Service class with Context.Tag
  builder.addRaw(`/**
 * ${className} Service
 *
 * Infrastructure service with Context.Tag pattern and static layers (Live, Test, Dev).
 * Provides CRUD operations, pagination, and health monitoring.
 */
export class ${className}Service extends Context.Tag(
  "@custom-repo/infra-${fileName}/${className}Service"
)<
  ${className}Service,
  {
    /**
     * Get item by ID
     *
     * @param id - Identifier for the item to retrieve
     * @returns Effect that succeeds with Option (None if not found)
     *
     * @example
     * \`\`\`typescript
     * const result = yield* service.get("id-123");
     * if (Option.isSome(result)) {
     *   console.log("Found:", result.value);
     * }
     * \`\`\`
     */
    readonly get: (
      id: string
    ) => Effect.Effect<
      Option.Option<unknown>,
      ${className}Error,
      never
    >;

    /**
     * Find items by criteria with pagination support
     *
     * @param criteria - Query criteria object
     * @param skip - Number of items to skip (pagination)
     * @param limit - Maximum items to return
     * @returns Effect that succeeds with array of items
     *
     * @example
     * \`\`\`typescript
     * const items = yield* service.findByCriteria({ status: "active" }, 0, 10);
     * \`\`\`
     */
    readonly findByCriteria: (
      criteria: Record<string, unknown>,
      skip?: number,
      limit?: number
    ) => Effect.Effect<readonly unknown[], ${className}Error, never>;

    /**
     * Create new item
     *
     * @param input - Item data to create
     * @returns Effect that succeeds with created item
     *
     * @example
     * \`\`\`typescript
     * const newItem = yield* service.create({ name: "example" });
     * \`\`\`
     */
    readonly create: (
      input: Record<string, unknown>
    ) => Effect.Effect<unknown, ${className}Error, never>;

    /**
     * Update existing item
     *
     * @param id - Item identifier
     * @param input - Updated data
     * @returns Effect that succeeds with updated item
     *
     * @example
     * \`\`\`typescript
     * const updated = yield* service.update("id-123", { name: "new name" });
     * \`\`\`
     */
    readonly update: (
      id: string,
      input: Record<string, unknown>
    ) => Effect.Effect<unknown, ${className}Error, never>;

    /**
     * Delete item by ID
     *
     * @param id - Item identifier to delete
     * @returns Effect that succeeds when deleted
     *
     * @example
     * \`\`\`typescript
     * yield* service.delete("id-123");
     * \`\`\`
     */
    readonly delete: (id: string) => Effect.Effect<void, ${className}Error, never>;

    /**
     * Health check for monitoring and readiness probes
     *
     * @returns Effect that succeeds with health status
     *
     * @example
     * \`\`\`typescript
     * const isHealthy = yield* service.healthCheck();
     * \`\`\`
     */
    readonly healthCheck: () => Effect.Effect<boolean, never>;${
      isDatabaseInfra
        ? `

    /**
     * Execute a raw Kysely query
     *
     * Provides direct access to the Kysely query builder for complex queries
     * that cannot be expressed through the standard CRUD operations.
     *
     * @param fn - Function that receives a Kysely instance and returns a Promise
     * @returns Effect that succeeds with query result
     *
     * @example
     * \`\`\`typescript
     * const users = yield* service.query((db) =>
     *   db.selectFrom("users")
     *     .where("status", "=", "active")
     *     .selectAll()
     *     .execute()
     * );
     * \`\`\`
     */
    readonly query: <A>(
      fn: (db: Kysely<Database>) => Promise<A>
    ) => Effect.Effect<A, ${className}Error, never>;

    /**
     * Execute an effect within a database transaction
     *
     * Creates a transaction scope where all database operations are atomic.
     * If the effect fails or is interrupted, the transaction is automatically rolled back.
     * On success, the transaction is committed.
     *
     * The provided effect receives a transaction-scoped ${className}Service where all
     * operations execute within the transaction context.
     *
     * @param fn - Effect to execute within the transaction scope
     * @returns Effect that succeeds with the result of the transaction
     *
     * @example
     * \`\`\`typescript
     * const result = yield* service.transaction(
     *   Effect.gen(function* () {
     *     const txService = yield* ${className}Service;
     *     const user = yield* txService.create({ name: "Alice" });
     *     const profile = yield* txService.create({ userId: user.id });
     *     return { user, profile };
     *   })
     * );
     * \`\`\`
     */
    readonly transaction: <A, E>(
      fn: Effect.Effect<A, E, ${className}Service>
    ) => Effect.Effect<A, ${className}Error | E, never>;`
        : ""
    }
  }
>() {`)

  // Static Live Layer
  builder.addRaw(`  // ${"=".repeat(74)}
  // Static Live Layer (Effect 3.0+ Pattern)
  // ${"=".repeat(74)}

  /**
   * Live Layer - Production implementation
   *
   * Uses Layer.scoped for automatic resource cleanup.
   * Customize dependency injection and resource initialization in the implementation.
   */
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      // 1. Inject Dependencies
      // Uncomment and customize based on your service needs:
      // const config = yield* ${className}Config;
      // const logger = yield* LoggingService;
      ${hasProvider && providerClassName ? `const provider = yield* ${providerClassName};` : `// const provider = yield* ProviderService; // Replace with actual provider`}
${isDatabaseInfra ? `
      // Inject Kysely service for type-safe query builder access
      const kysely = yield* KyselyService<Database>();` : ""}

      // 2. Acquire Resources with Effect.acquireRelease
      // Example: Connection pool that needs cleanup
${hasProvider && providerClassName ? `      // When using a provider, resource acquisition is handled by the provider
      // Uncomment below if you need additional custom resources
      // const resource = yield* Effect.acquireRelease(
      //   Effect.gen(function* () {
      //     // Acquire phase: Initialize resource
      //     // yield* logger.info("${className} service initializing");
      //
      //     // Replace with actual resource initialization:
      //     // const pool = yield* Effect.tryPromise({
      //     //   try: () => createConnectionPool(config),
      //     //   catch: (error) => new ${className}InitializationError({
      //     //     message: "Failed to create connection pool",
      //     //     cause: error
      //     //   })
      //     // });
      //
      //     // For demonstration, return a mock resource
      //     return {
      //       isConnected: true,
      //       query: async (id: string) => ({ id, data: "example" }),
      //       close: async () => { /* cleanup */ }
      //     };
      //   }),
      //   (resource) =>
      //     // Release phase: Cleanup resource
      //     Effect.tryPromise({
      //       try: () => resource.close(),
      //       catch: () => new Error("Failed to close resource")
      //     }).pipe(
      //       Effect.catchAll(() => Effect.void) // Ignore cleanup errors
      //     )
      // );` : `      const resource = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          // Acquire phase: Initialize resource
          // yield* logger.info("${className} service initializing");

          // Replace with actual resource initialization:
          // const pool = yield* Effect.tryPromise({
          //   try: () => createConnectionPool(config),
          //   catch: (error) => new ${className}InitializationError({
          //     message: "Failed to create connection pool",
          //     cause: error
          //   })
          // });

          // For demonstration, return a mock resource
          return {
            isConnected: true,
            query: async (id: string) => ({ id, data: "example" }),
            close: async () => { /* cleanup */ }
          };
        }),
        (resource) =>
          // Release phase: Cleanup resource
          Effect.tryPromise({
            try: () => resource.close(),
            catch: () => new Error("Failed to close resource")
          }).pipe(
            Effect.catchAll(() => Effect.void) // Ignore cleanup errors
          )
      );`}

      // ${"=".repeat(74)}
      // OPTIONAL: Background Job Queue with Queue
      // ${"=".repeat(74)}
      //
      // Use Queue for async task processing, job queuing, and work distribution:
      //
      // import { Queue } from "effect";
      //
      // // Create bounded queue with backpressure (max 1000 pending jobs)
      // const jobQueue = yield* Queue.bounded<{ type: string; payload: unknown }>(1000);
      //
      // // Start background processor fiber
      // yield* Effect.forkScoped(
      //   Effect.gen(function* () {
      //     while (true) {
      //       // Take batch of jobs from queue
      //       const jobs = yield* Queue.takeUpTo(jobQueue, 10);
      //
      //       // Process jobs with controlled concurrency
      //       yield* Effect.all(
      //         jobs.map(job => processJob(job)),
      //         { concurrency: 5 }
      //       );
      //     }
      //   })
      // );
      //
      // // Enqueue jobs from service methods:
      // // yield* Queue.offer(jobQueue, { type: "send_email", payload: emailData });
      //
      // Benefits:
      // - Automatic backpressure when queue is full
      // - Controlled concurrency for job processing
      // - Fire-and-forget async operations
      // - Graceful shutdown via forkScoped
      //
      // Queue Strategies:
      // - Queue.bounded(n) - Suspends offers when full (backpressure)
      // - Queue.dropping(n) - Discards new items when full
      // - Queue.sliding(n) - Removes oldest items for new ones
      // - Queue.unbounded() - No capacity limit (use with caution)
      //
      // See EFFECT_PATTERNS.md "Queue - Producer/Consumer Patterns" for comprehensive examples.
      //
      // ${"=".repeat(74)}

      // ${"=".repeat(74)}
      // OPTIONAL: Event Broadcasting with PubSub
      // ${"=".repeat(74)}
      //
      // Use PubSub for event streaming, notifications, and message broadcasting:
      //
      // import { PubSub, Queue, Scope } from "effect";
      //
      // // Create PubSub with sliding strategy (handles slow consumers)
      // const eventBus = yield* PubSub.bounded<{
      //   type: string;
      //   payload: unknown;
      //   timestamp: Date;
      // }>(1000);
      //
      // // Service methods can publish events:
      // // yield* PubSub.publish(eventBus, {
      // //   type: "${className}Created",
      // //   payload: createdItem,
      // //   timestamp: new Date()
      // // });
      //
      // // Consumers subscribe to receive events:
      // export const subscribe = (
      //   handler: (event: unknown) => Effect.Effect<void, never>
      // ) =>
      //   Effect.gen(function* () {
      //     const subscription = yield* PubSub.subscribe(eventBus);
      //
      //     // Process events from subscription queue
      //     yield* Queue.take(subscription).pipe(
      //       Effect.flatMap(handler),
      //       Effect.forever,
      //       Effect.forkScoped  // Run in background fiber
      //     );
      //   });
      //
      // Benefits:
      // - Multiple subscribers receive all events
      // - Decouples event producers from consumers
      // - Built-in backpressure strategies
      // - Type-safe event distribution
      //
      // Use Cases:
      // - Real-time notifications (WebSocket broadcasting)
      // - Distributed logging (fan-out to multiple sinks)
      // - Event-driven cache invalidation
      // - Cross-service event streaming
      //
      // IMPORTANT: Subscribe BEFORE publishing to guarantee event receipt
      //
      // PubSub Strategies:
      // - PubSub.bounded(n) - Suspends publishers when full
      // - PubSub.dropping(n) - Discards new messages when full
      // - PubSub.sliding(n) - Removes oldest for new ones
      // - PubSub.unbounded() - No capacity limit
      //
      // See EFFECT_PATTERNS.md "PubSub - Event Broadcasting" for comprehensive examples.
      //
      // ${"=".repeat(74)}

      // ${"=".repeat(74)}
      // OPTIONAL: Startup Coordination with Latch
      // ${"=".repeat(74)}
      //
      // Use Latch to block operations until prerequisites complete:
      //
      // import { Effect } from "effect";
      //
      // // Create closed latch (blocks operations)
      // const migrationLatch = yield* Effect.makeLatch(false);
      //
      // // Run migrations in background, open latch when done
      // yield* Effect.forkScoped(
      //   Effect.gen(function* () {
      //     // yield* runDatabaseMigrations();
      //     yield* migrationLatch.open();  // Unblock waiting operations
      //   })
      // );
      //
      // // Service methods wait for latch before executing:
      // // yield* migrationLatch.await();  // Blocks until migrations complete
      // // ...proceed with operation
      //
      // Benefits:
      // - Prevents operations before system is ready
      // - One-time synchronization gate
      // - Automatic fiber coordination
      // - Zero configuration needed
      //
      // Use Cases:
      // - Block requests until database migrations finish
      // - Wait for configuration loading
      // - Coordinate service initialization
      // - Ensure cache warmup before serving traffic
      //
      // See EFFECT_PATTERNS.md "Latch - Startup Coordination" for comprehensive examples.
      //
      // ${"=".repeat(74)}

      // ${"=".repeat(74)}
      // OPTIONAL: Fiber Coordination with Deferred
      // ${"=".repeat(74)}
      //
      // Use Deferred for value passing between fibers with coordination:
      //
      // import { Deferred, Effect } from "effect";
      //
      // // Create deferred for async result
      // const initResult = yield* Deferred.make<ResourceHandle, ${className}Error>();
      //
      // // Background fiber initializes and resolves deferred
      // yield* Effect.forkScoped(
      //   Effect.gen(function* () {
      //     const handle = yield* initializeResource();
      //     yield* Deferred.succeed(initResult, handle);
      //   }).pipe(
      //     Effect.catchAll((error) =>
      //       Deferred.fail(initResult, error)
      //     )
      //   )
      // );
      //
      // // Service methods wait for and use the result:
      // get: (id: string) =>
      //   Effect.gen(function* () {
      //     const handle = yield* Deferred.await(initResult);  // Waits & unwraps
      //     // ...use handle for operation
      //   }),
      //
      // Benefits:
      // - Type-safe value passing between fibers
      // - Automatic error propagation (can fail)
      // - One-time resolution (like Promise)
      // - Waiting fibers automatically suspended
      //
      // Use Cases:
      // - Lazy resource initialization (initialize on first use)
      // - Cache warmup with result passing
      // - Configuration loading with validation
      // - Work handoff between producer/consumer fibers
      //
      // Deferred API:
      // - Deferred.make<A, E>() - Create new deferred
      // - Deferred.succeed(d, value) - Resolve with success
      // - Deferred.fail(d, error) - Resolve with failure
      // - Deferred.await(d) - Wait for resolution
      // - Deferred.poll(d) - Non-blocking status check
      //
      // Deferred vs Latch vs Queue:
      // - Deferred: One-time value (Promise-like), can fail
      // - Latch: One-time gate (no value), always succeeds
      // - Queue: Multiple values (stream-like), backpressure
      //
      // See EFFECT_PATTERNS.md "Deferred - Fiber Coordination" for comprehensive examples.
      //
      // ${"=".repeat(74)}

      // ${"=".repeat(74)}
      // Advanced Pattern: Exit-Aware Finalizers
      // ${"=".repeat(74)}
      //
      // Conditional cleanup based on operation outcome using Scope.addFinalizer + Exit.match
      //
      // Use Cases:
      // - Database transactions: commit on success, rollback on failure
      // - Message queues: ack on success, nack on failure
      // - Distributed locks: release with outcome metadata
      // - File uploads: persist on success, cleanup temp files on failure
      //
      // import { Exit, Scope } from "effect";
      //
      // Database Transaction Pattern:
      // const transactionalResource = yield* Effect.acquireRelease(
      //   Effect.gen(function* () {
      //     const connection = yield* Effect.tryPromise({
      //       try: () => pool.connect(),
      //       catch: (error) => new ${className}ConnectionError({ cause: error })
      //     });
      //     yield* Effect.sync(() => connection.beginTransaction());
      //
      //     yield* Scope.addFinalizer((exit) =>
      //       Exit.match(exit, {
      //         onFailure: () =>
      //           Effect.gen(function* () {
      //             yield* Effect.tryPromise(() => connection.rollback()).pipe(
      //               Effect.catchAll(() => Effect.void)
      //             );
      //             yield* Effect.sync(() => connection.release());
      //           }),
      //         onSuccess: () =>
      //           Effect.gen(function* () {
      //             yield* Effect.tryPromise(() => connection.commit()).pipe(
      //               Effect.tapError(() =>
      //                 Effect.tryPromise(() => connection.rollback()).pipe(
      //                   Effect.catchAll(() => Effect.void)
      //                 )
      //               )
      //             );
      //             yield* Effect.sync(() => connection.release());
      //           })
      //       })
      //     );
      //     return connection;
      //   }),
      //   (connection) =>
      //     Effect.sync(() => connection.isConnected && connection.release()).pipe(
      //       Effect.catchAll(() => Effect.void)
      //     )
      // );
      //
      // Message Queue Pattern:
      // yield* Scope.addFinalizer((exit) =>
      //   Exit.isSuccess(exit)
      //     ? Effect.tryPromise(() => message.ack())
      //     : Effect.tryPromise(() => message.nack())
      // );
      //
      // See EFFECT_PATTERNS.md "Exit-Aware Finalizers" for full examples and patterns.
      //
      // ${"=".repeat(74)}

      // 3. Return Service Implementation
      // ✅ Direct object return (Effect 3.0+), no .of() needed
      // Operations are instrumented with Effect.withSpan for distributed tracing
      return {
        get: (id: string) =>
          Effect.gen(function* () {
            // yield* logger.debug(\`Getting item: \${id}\`);

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.get(id).pipe(
              Effect.map(Option.some),
              Effect.catchTag("${providerClassName}NotFoundError", () =>
                Effect.succeed(Option.none())
              )
            );`
                : `const result = yield* Effect.tryPromise({
              try: () => resource.query(id),
              catch: (error) => new ${className}InternalError({
                message: \`Failed to get item \${id}\`,
                cause: error
              })
            });
            return Option.fromNullable(result);`
            }
          }).pipe(Effect.withSpan("${className}.get")),

        findByCriteria: (criteria, skip = 0, limit = 10) =>
          Effect.gen(function* () {
            // yield* logger.debug("Finding items by criteria", { criteria, skip, limit });

            const result = yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual query logic
                return [{ id: "1", ...criteria }, { id: "2", ...criteria }]
                  .slice(skip, skip + limit);
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to find items by criteria",
                cause: error
              })
            });
            return result;
          }).pipe(Effect.withSpan("${className}.findByCriteria")),

        create: (input) =>
          Effect.gen(function* () {
            // yield* logger.info("Creating item", { input });

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.create(input);`
                : `const result = yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual creation logic
                return { id: randomUUID(), ...input, createdAt: new Date() };
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to create item",
                cause: error
              })
            });
            return result;`
            }
          }).pipe(Effect.withSpan("${className}.create")),

        update: (id, input) =>
          Effect.gen(function* () {
            // yield* logger.info(\`Updating item: \${id}\`, { input });

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.update(id, input);`
                : `// Note: Cannot use yield* inside async callback
            // If you need to check existence first, do it outside Effect.tryPromise
            const result = yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual update logic
                // For existence check, use SDK-level validation or separate Effect
                return { id, ...input, updatedAt: new Date() };
              },
              catch: (error) => new ${className}InternalError({
                message: \`Item \${id} not found or update failed\`,
                cause: error
              })
            });
            return result;`
            }
          }).pipe(Effect.withSpan("${className}.update")),

        delete: (id) =>
          Effect.gen(function* () {
            // yield* logger.info(\`Deleting item: \${id}\`);

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            yield* provider.delete(id);`
                : `// Note: Cannot use yield* inside async callback
            // If you need to check existence first, do it outside Effect.tryPromise
            yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual deletion logic
                // For existence check, use SDK-level validation or separate Effect
                // Perform deletion
              },
              catch: (error) => new ${className}InternalError({
                message: \`Failed to delete item \${id}\`,
                cause: error
              })
            });`
            }
          }).pipe(Effect.withSpan("${className}.delete")),

        healthCheck: () =>
          Effect.gen(function* () {
            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.healthCheck();`
                : `// Check resource health
            const isHealthy = resource.isConnected;

            // Optionally: Perform actual health check query
            // const result = yield* Effect.tryPromise({
            //   try: () => resource.query("health"),
            //   catch: () => false as const
            // }).pipe(Effect.catchAll(() => Effect.succeed(false as const)));

            return isHealthy;`
            }
          }).pipe(Effect.withSpan("${className}.healthCheck"))${
            isDatabaseInfra
              ? `,

        query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
          kysely.query(fn).pipe(Effect.withSpan("${className}.query")),

        transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
          Effect.gen(function* () {
            // Execute transaction using Kysely's transaction support
            return yield* kysely.query((db) =>
              db.transaction().execute(async (trx) => {
                // Create a transaction-scoped Kysely service
                const txKyselyService = KyselyService<Database>();
                const txKyselyLayer = Layer.succeed(txKyselyService, {
                  query: <T>(queryFn: (db: Kysely<Database>) => Promise<T>) =>
                    Effect.tryPromise({
                      try: () => queryFn(trx as unknown as Kysely<Database>),
                      catch: (error) =>
                        new ${className}InternalError({
                          message: \`Transaction query failed: \${String(error)}\`,
                          cause: error,
                        }),
                    }),
                  transaction: () =>
                    Effect.fail(
                      new ${className}InternalError({
                        message: "Nested transactions not supported",
                        cause: new Error("Cannot start a transaction within a transaction"),
                      })
                    ),
                });

                // Provide the transaction-scoped Kysely service and run fn
                return await Effect.runPromise(
                  fn.pipe(Effect.provide(txKyselyLayer))
                );
              })
            );
          }).pipe(Effect.withSpan("${className}.transaction"))`
              : ""
          }
      };
    })
  );

  // ${"=".repeat(74)}
  // Static Test Layer
  // ${"=".repeat(74)}

  /**
   * Test Layer - In-memory implementation
   *
   * Synchronous mock operations for unit and integration tests.
   * No external dependencies required.
   */
  static readonly Test = Layer.succeed(this, {
    get: (id: string) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST get id=\${id}\`);
        return Option.none();
      }),
    findByCriteria: (criteria: Record<string, unknown>, skip?: number, limit?: number) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST findByCriteria\`, { criteria, skip, limit });
        return [];
      }),
    create: (input: Record<string, unknown>) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST create\`, input);
        return { id: "test-id", ...input };
      }),
    update: (id: string, input: Record<string, unknown>) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST update id=\${id}\`, input);
        return { id, ...input };
      }),
    delete: (id: string) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST delete id=\${id}\`);
      }),
    healthCheck: () =>
      Effect.gen(function* () {
        yield* Effect.logDebug(\`[${className}] TEST healthCheck\`);
        return true;
      })${
      isDatabaseInfra
        ? `,
    query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
      Effect.gen(function* () {
        // Mock Kysely instance for testing
        const mockDb = {} as Kysely<Database>;
        return yield* Effect.tryPromise({
          try: () => fn(mockDb),
          catch: (error) => new ${className}InternalError({
            message: "Test query execution failed",
            cause: error
          })
        });
      }),
    transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
      Effect.gen(function* () {
        // For testing, just execute the effect with the test service
        return yield* fn.pipe(
          Effect.provideService(${className}Service, ${className}Service.Test.pipe(
            Layer.build,
            Effect.scoped,
            Effect.flatMap(() => ${className}Service),
            Effect.runSync
          ))
        );
      })`
        : ""
    }
  });

  // ${"=".repeat(74)}
  // Static Dev Layer
  // ${"=".repeat(74)}

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   * Use this layer during local development to see detailed operation logs.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      yield* Effect.logInfo(\`[${className}Service] [DEV] Initializing development layer\`);

      // Get actual implementation from Live layer
      const liveService = yield* ${className}Service.Live.pipe(
        Layer.build,
        Effect.map((ctx) => Context.get(ctx, ${className}Service))
      );

      // Wrap all operations with verbose logging
      return {
        get: (id: string) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] get called with id:\`, id);
            const result = yield* liveService.get(id);
            yield* Effect.logDebug(\`[${className}Service] [DEV] get result:\`, result);
            return result;
          }),

        findByCriteria: (criteria, skip, limit) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] findByCriteria called:\`, { criteria, skip, limit });
            const result = yield* liveService.findByCriteria(criteria, skip, limit);
            yield* Effect.logDebug(\`[${className}Service] [DEV] findByCriteria returned \${result.length} items\`);
            return result;
          }),

        create: (input) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] create called with:\`, input);
            const result = yield* liveService.create(input);
            yield* Effect.logDebug(\`[${className}Service] [DEV] create result:\`, result);
            return result;
          }),

        update: (id, input) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] update called:\`, { id, input });
            const result = yield* liveService.update(id, input);
            yield* Effect.logDebug(\`[${className}Service] [DEV] update result:\`, result);
            return result;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] delete called with id:\`, id);
            yield* liveService.delete(id);
            yield* Effect.logDebug(\`[${className}Service] [DEV] delete completed\`);
          }),

        healthCheck: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] healthCheck called\`);
            const result = yield* liveService.healthCheck();
            yield* Effect.logDebug(\`[${className}Service] [DEV] healthCheck result:\`, result);
            return result;
          })${
            isDatabaseInfra
              ? `,

        query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] query called\`);
            const result = yield* liveService.query(fn);
            yield* Effect.logDebug(\`[${className}Service] [DEV] query result:\`, result);
            return result;
          }),

        transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] transaction started\`);
            const result = yield* liveService.transaction(fn);
            yield* Effect.logDebug(\`[${className}Service] [DEV] transaction completed\`);
            return result;
          })`
              : ""
          }
      };
    })
  );${
    includeClientServer
      ? `

  // ${"=".repeat(74)}
  // Platform-Specific Layers (Client/Server)
  // ${"=".repeat(74)}

  /**
   * Client Live Layer
   *
   * Browser-safe implementation defined in client.ts
   * This property is assigned at module load time.
   */
  static ClientLive: Layer.Layer<${className}Service, never, never>;

  /**
   * Server Live Layer
   *
   * Node.js implementation defined in server.ts
   * This property is assigned at module load time.
   */
  static ServerLive: Layer.Layer<${className}Service, never, never>;`
      : ""
  }
}`)

  return builder.toString()
}
