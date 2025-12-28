/**
 * Infrastructure Service Template
 *
 * Generates the service definition using Effect 3.0+ Context.Tag pattern.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { InfraTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'
// Provider mapping utilities - available for future integration
// import {
//   hasProviderMapping,
//   getProviderClassName,
//   getProviderPackageName
// } from "../../../utils/infra-provider-mapping"

/**
 * Generate service file for infrastructure service
 */
export function generateServiceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeClientServer } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // BASELINE: Disable provider integration for self-contained implementation
  // Provider integration can be added manually when needed
  // To enable provider mapping, uncomment the imports above and set:
  // const hasProvider = hasProviderMapping(fileName)
  const hasProvider = false // Baseline: self-contained in-memory implementation
  const providerClassName: string | undefined = undefined
  const providerPackage: string | undefined = undefined

  // Check if this is a database infrastructure
  const isDatabaseInfra = fileName === 'database'

  // File header
  builder.addFileHeader({
    title: `${className} Service`,
    description: `Infrastructure service using Effect 3.0+ Context.Tag pattern.\n\nProvides CRUD operations with dependency injection and resource management.\nCustomize resource initialization, dependencies, and error handling as needed.`,
    module: `${scope}/infra-${fileName}/service`,
    see: ['EFFECT_PATTERNS.md for service patterns and examples']
  })

  // Imports - all files in lib/ as siblings
  builder.addImports([
    { from: 'node:crypto', imports: ['randomUUID'] },
    { from: 'effect', imports: ['Effect', 'Layer', 'Option', 'Context'] },
    {
      from: './errors',
      imports: [`${className}InternalError`]
    },
    // Use ServiceError union type for interface (compatible with all error subtypes)
    { from: './errors', imports: [`${className}ServiceError`], isTypeOnly: true },
    // Environment configuration
    { from: `${scope}/env`, imports: ['env'] }
  ])

  // Add provider import if mapping exists
  if (hasProvider && providerClassName && providerPackage) {
    builder.addImport(providerPackage, providerClassName)
  }

  // Database infrastructure: Kysely integration should be added by user
  // with their specific database schema types

  // Section: Service Context.Tag Definition
  builder.addSectionComment('Service Context.Tag Definition with Inline Interface (Effect 3.0+)')

  // Service class with Context.Tag
  builder.addRaw(`/**
 * ${className} Service
 *
 * Infrastructure service with Context.Tag pattern and static layers (Live, Test, Dev).
 * Provides CRUD operations, pagination, and health monitoring.
 */
export class ${className}Service extends Context.Tag(
  "${scope}/infra-${fileName}/${className}Service"
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
     * const result = yield* service.get("id-123")
     * if (Option.isSome(result)) {
     *   console.log("Found:", result.value)
     * }
     * \`\`\`
     */
    readonly get: (id: string) => Effect.Effect<Option.Option<unknown>, ${className}ServiceError, never>

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
     * const items = yield* service.findByCriteria({ status: "active" }, 0, 10)
     * \`\`\`
     */
    readonly findByCriteria: (criteria: Record<string, unknown>, skip?: number, limit?: number) => Effect.Effect<readonly unknown[], ${className}ServiceError, never>

    /**
     * Create new item
     *
     * @param input - Item data to create
     * @returns Effect that succeeds with created item
     *
     * @example
     * \`\`\`typescript
     * const newItem = yield* service.create({ name: "example" })
     * \`\`\`
     */
    readonly create: (input: Record<string, unknown>) => Effect.Effect<unknown, ${className}ServiceError, never>

    /**
     * Update existing item
     *
     * @param id - Item identifier
     * @param input - Updated data
     * @returns Effect that succeeds with updated item
     *
     * @example
     * \`\`\`typescript
     * const updated = yield* service.update("id-123", { name: "new name" })
     * \`\`\`
     */
    readonly update: (id: string, input: Record<string, unknown>) => Effect.Effect<unknown, ${className}ServiceError, never>

    /**
     * Delete item by ID
     *
     * @param id - Item identifier to delete
     * @returns Effect that succeeds when deleted
     *
     * @example
     * \`\`\`typescript
     * yield* service.delete("id-123")
     * \`\`\`
     */
    readonly delete: (id: string) => Effect.Effect<void, ${className}ServiceError, never>

    /**
     * Health check for monitoring and readiness probes
     *
     * @returns Effect that succeeds with health status
     *
     * @example
     * \`\`\`typescript
     * const isHealthy = yield* service.healthCheck()
     * \`\`\`
     */
    readonly healthCheck: () => Effect.Effect<boolean, never>${
      isDatabaseInfra
        ? `

    // TODO: Add database-specific operations here
    // For Kysely integration, add query and transaction methods:
    //
    // readonly query: <A>(fn: (db: Kysely<Database>) => Promise<A>)
    // readonly transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>)`
        : ''
    }
  }
>() {`)

  // Static Live Layer
  builder.addRaw(`  // ${'='.repeat(74)}
  // Static Live Layer (Effect 3.0+ Pattern)
  // ${'='.repeat(74)}

  /**
   * Live Layer - Production implementation
   *
   * Uses Layer.scoped for automatic resource cleanup.
   * Customize dependency injection and resource initialization in the implementation.
   */
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      // 1. Inject Dependencies
      // Uncomment and customize based on your service needs:
      // const config = yield* ${className}Config;
      // const logger = yield* LoggingService;
      ${
        hasProvider && providerClassName
          ? `const provider = yield* ${providerClassName};`
          : `// const provider = yield* ProviderService; // Replace with actual provider`
      }
${
  isDatabaseInfra
    ? `
      // Note: For database operations, implement your Kysely provider integration here
      // Example: const kysely = yield* KyselyProvider;`
    : ''
}

      // 2. Acquire Resources with Effect.acquireRelease
      // Example: Connection pool that needs cleanup
${
  hasProvider && providerClassName
    ? `      // When using a provider, resource acquisition is handled by the provider
      // Uncomment below if you need additional custom resources
      // const resource = yield* Effect.acquireRelease(
      //   Effect.gen(function*() {
      //     // Acquire phase: Initialize resource
      //     // yield* logger.info("${className} service initializing")
      //
      //     // Replace with actual resource initialization:
      //     // const pool = yield* Effect.tryPromise({
      //     //   try: () => createConnectionPool(config),
      //     //   catch: (error) => new ${className}InitializationError({
      //     //     message: "Failed to create connection pool",
      //     //     cause: error
      //     //   })
      //     // })
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
      // )`
    : `      const resource = yield* Effect.acquireRelease(
        Effect.sync(() => {
          // Acquire phase: Initialize resource (sync baseline)
          // For async initialization with dependencies, use Effect.gen with yield*
          //
          // Example with Effect.gen (for async/with deps):
          // Effect.gen(function*() {
          //   yield* logger.info("${className} service initializing")
          //   const pool = yield* Effect.tryPromise({
          //     try: () => createConnectionPool(config),
          //     catch: (error) => new ${className}InitializationError({
          //       message: "Failed to create connection pool",
          //       cause: error
          //     })
          //   })
          //   return pool;
          // })

          // Baseline: Return mock resource (sync)
          return {
            isConnected: true,
            query: async (id: string) => ({ id, data: "example" }),
            close: async () => { /* cleanup */ }
          }
        }),
        (resource) =>
          // Release phase: Cleanup resource
          Effect.tryPromise({
            try: () => resource.close(),
            catch: () => new Error("Failed to close resource")
          }).pipe(
            Effect.catchAll(() => Effect.void) // Ignore cleanup errors
          )
      )`
}

      // ${'='.repeat(74)}
      // OPTIONAL: Background Job Queue with Queue
      // ${'='.repeat(74)}
      //
      // Use Queue for async task processing, job queuing, and work distribution:
      //
      // import { Queue } from "effect";
      //
      // // Create bounded queue with backpressure (max 1000 pending jobs)
      // const jobQueue = yield* Queue.bounded<{ type: string; payload: unknown }>(1000)
      //
      // // Start background processor fiber
      // yield* Effect.forkScoped(
      //   Effect.gen(function*() {
      //     while (true) {
      //       // Take batch of jobs from queue
      //       const jobs = yield* Queue.takeUpTo(jobQueue, 10)
      //
      //       // Process jobs with controlled concurrency
      //       yield* Effect.all(
      //         jobs.map(job => processJob(job)),
      //         { concurrency: 5 }
      //       )
      //     }
      //   })
      // )
      //
      // // Enqueue jobs from service methods:
      // // yield* Queue.offer(jobQueue, { type: "send_email", payload: emailData })
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
      // ${'='.repeat(74)}

      // ${'='.repeat(74)}
      // OPTIONAL: Event Broadcasting with PubSub
      // ${'='.repeat(74)}
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
      // }>(1000)
      //
      // // Service methods can publish events:
      // // yield* PubSub.publish(eventBus, {
      // //   type: "${className}Created",
      // //   payload: createdItem,
      // //   timestamp: new Date()
      // // })
      //
      // // Consumers subscribe to receive events:
      // export const subscribe = (
      //   handler: (event: unknown) => Effect.Effect<void, never>
      // ) =>
      //   Effect.gen(function*() {
      //     const subscription = yield* PubSub.subscribe(eventBus)
      //
      //     // Process events from subscription queue
      //     yield* Queue.take(subscription).pipe(
      //       Effect.flatMap(handler),
      //       Effect.forever,
      //       Effect.forkScoped  // Run in background fiber
      //     )
      //   })
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
      // ${'='.repeat(74)}

      // ${'='.repeat(74)}
      // OPTIONAL: Startup Coordination with Latch
      // ${'='.repeat(74)}
      //
      // Use Latch to block operations until prerequisites complete:
      //
      // import { Effect } from "effect";
      //
      // // Create closed latch (blocks operations)
      // const migrationLatch = yield* Effect.makeLatch(false)
      //
      // // Run migrations in background, open latch when done
      // yield* Effect.forkScoped(
      //   Effect.gen(function*() {
      //     // yield* runDatabaseMigrations()
      //     yield* migrationLatch.open()  // Unblock waiting operations
      //   })
      // )
      //
      // // Service methods wait for latch before executing:
      // // yield* migrationLatch.await()  // Blocks until migrations complete
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
      // ${'='.repeat(74)}

      // ${'='.repeat(74)}
      // OPTIONAL: Fiber Coordination with Deferred
      // ${'='.repeat(74)}
      //
      // Use Deferred for value passing between fibers with coordination:
      //
      // import { Deferred, Effect } from "effect";
      //
      // // Create deferred for async result
      // const initResult = yield* Deferred.make<ResourceHandle, ${className}Error>()
      //
      // // Background fiber initializes and resolves deferred
      // yield* Effect.forkScoped(
      //   Effect.gen(function*() {
      //     const handle = yield* initializeResource()
      //     yield* Deferred.succeed(initResult, handle)
      //   }).pipe(
      //     Effect.catchAll((error) =>
      //       Deferred.fail(initResult, error)
      //     )
      //   )
      // )
      //
      // // Service methods wait for and use the result:
      // get: (id: string) =>
      //   Effect.gen(function*() {
      //     const handle = yield* Deferred.await(initResult)  // Waits & unwraps
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
      // ${'='.repeat(74)}

      // ${'='.repeat(74)}
      // Advanced Pattern: Exit-Aware Finalizers
      // ${'='.repeat(74)}
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
      //   Effect.gen(function*() {
      //     const connection = yield* Effect.tryPromise({
      //       try: () => pool.connect(),
      //       catch: (error) => new ${className}ConnectionError({ cause: error })
      //     })
      //     yield* Effect.sync(() => connection.beginTransaction())
      //
      //     yield* Scope.addFinalizer((exit) =>
      //       Exit.match(exit, {
      //         onFailure: () =>
      //           Effect.gen(function*() {
      //             yield* Effect.tryPromise(() => connection.rollback()).pipe(
      //               Effect.catchAll(() => Effect.void)
      //             )
      //             yield* Effect.sync(() => connection.release())
      //           }),
      //         onSuccess: () =>
      //           Effect.gen(function*() {
      //             yield* Effect.tryPromise(() => connection.commit()).pipe(
      //               Effect.tapError(() =>
      //                 Effect.tryPromise(() => connection.rollback()).pipe(
      //                   Effect.catchAll(() => Effect.void)
      //                 )
      //               )
      //             )
      //             yield* Effect.sync(() => connection.release())
      //           })
      //       })
      //     )
      //     return connection;
      //   }),
      //   (connection) =>
      //     Effect.sync(() => connection.isConnected && connection.release()).pipe(
      //       Effect.catchAll(() => Effect.void)
      //     )
      // )
      //
      // Message Queue Pattern:
      // yield* Scope.addFinalizer((exit) =>
      //   Exit.isSuccess(exit)
      //     ? Effect.tryPromise(() => message.ack())
      //     : Effect.tryPromise(() => message.nack())
      // )
      //
      // See EFFECT_PATTERNS.md "Exit-Aware Finalizers" for full examples and patterns.
      //
      // ${'='.repeat(74)}

      // 3. Return Service Implementation
      // ✅ Direct object return (Effect 3.0+), no .of() needed
      // Operations are instrumented with Effect.withSpan for distributed tracing
      return {
        get: (id: string) =>
          Effect.gen(function*() {
            // yield* logger.debug(\`Getting item: \${id}\`)

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.get(id).pipe(
              Effect.map(Option.some),
              Effect.catchTag("${providerClassName}NotFoundError", () =>
                Effect.succeed(Option.none())
              )
            )`
                : `const result = yield* Effect.tryPromise({
              try: () => resource.query(id),
              catch: (error) => new ${className}InternalError({
                message: \`Failed to get item \${id}\`,
                cause: error
              })
            })
            return Option.fromNullable(result)`
            }
          }).pipe(Effect.withSpan("${className}.get")),

        findByCriteria: (criteria, skip = 0, limit = 10) =>
          Effect.gen(function*() {
            // yield* logger.debug("Finding items by criteria", { criteria, skip, limit })

            const result = yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual query logic
                return [{ id: "1", ...criteria }, { id: "2", ...criteria }]
                  .slice(skip, skip + limit)
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to find items by criteria",
                cause: error
              })
            })
            return result;
          }).pipe(Effect.withSpan("${className}.findByCriteria")),

        create: (input) =>
          Effect.gen(function*() {
            // yield* logger.info("Creating item", { input })

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.create(input)`
                : `const result = yield* Effect.tryPromise({
              try: async () => {
                // Replace with actual creation logic
                return { id: randomUUID(), ...input, createdAt: new Date() };
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to create item",
                cause: error
              })
            })
            return result;`
            }
          }).pipe(Effect.withSpan("${className}.create")),

        update: (id, input) =>
          Effect.gen(function*() {
            // yield* logger.info(\`Updating item: \${id}\`, { input })

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            return yield* provider.update(id, input)`
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
            })
            return result;`
            }
          }).pipe(Effect.withSpan("${className}.update")),

        delete: (id) =>
          Effect.gen(function*() {
            // yield* logger.info(\`Deleting item: \${id}\`)

            ${
              hasProvider && providerClassName
                ? `// Delegate to provider
            yield* provider.delete(id)`
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
            })`
            }
          }).pipe(Effect.withSpan("${className}.delete")),

        healthCheck: () =>
          ${
            hasProvider && providerClassName
              ? `Effect.gen(function*() {
            // Delegate to provider
            return yield* provider.healthCheck()
          })`
              : `Effect.sync(() => {
            // Check resource health (sync baseline)
            // For async health checks, use Effect.gen with yield*
            //
            // Example with Effect.gen (for async health check):
            // Effect.gen(function*() {
            //   const result = yield* Effect.tryPromise({
            //     try: () => resource.query("health"),
            //     catch: () => false as const
            //   }).pipe(Effect.catchAll(() => Effect.succeed(false as const)))
            //   return result;
            // })

            // Baseline: Return sync health status
            return resource.isConnected;
          })`
          }.pipe(Effect.withSpan("${className}.healthCheck"))${
            isDatabaseInfra
              ? `

        // TODO: Add database query and transaction operations with your database schema type
        // Example implementation:
        //
        // query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
        //   kysely.query(fn).pipe(Effect.withSpan("${className}.query")),
        //
        // transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
        //   Effect.gen(function*() {
        //     return yield* kysely.query((db) =>
        //       db.transaction().execute(async (trx) => {
        //         const txKyselyLayer = Layer.succeed(kysely, {
        //           query: <T>(queryFn: (db: Kysely<Database>) => Promise<T>) =>
        //             Effect.tryPromise({
        //               try: () => queryFn(trx),
        //               catch: (error) => new ${className}InternalError({ message: "Transaction query failed", cause: error })
        //             })
        //         })
        //         return await Effect.runPromise(fn.pipe(Effect.provide(txKyselyLayer)))
        //       })
        //     )
        //   }).pipe(Effect.withSpan("${className}.transaction"))`
              : ''
          }
      };
    })
  )

  // ${'='.repeat(74)}
  // Static Test Layer
  // ${'='.repeat(74)}

  /**
   * Test Layer - In-memory implementation
   *
   * Uses Layer.sync for test isolation (fresh instance per test run).
   * Each test run gets its own isolated mock state.
   * No external dependencies required.
   */
  static readonly Test = Layer.sync(this, () => {
    // Fresh storage per test run for isolation
    const testStorage = new Map<string, Record<string, unknown>>()

    return {
      get: (id: string) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST get id=\${id}\`)
          return Option.fromNullable(testStorage.get(id))
        }),
      findByCriteria: (criteria: Record<string, unknown>, skip?: number, limit?: number) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST findByCriteria\`, { criteria, skip, limit })
          const items = Array.from(testStorage.values())
          return items.slice(skip ?? 0, (skip ?? 0) + (limit ?? 10))
        }),
      create: (input: Record<string, unknown>) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST create\`, input)
          const id = randomUUID()
          const item = { id, ...input };
          testStorage.set(id, item)
          return item
        }),
      update: (id: string, input: Record<string, unknown>) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST update id=\${id}\`, input)
          const item = { id, ...input };
          testStorage.set(id, item)
          return item
        }),
      delete: (id: string) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST delete id=\${id}\`)
          testStorage.delete(id)
        }),
      healthCheck: () =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[${className}] TEST healthCheck\`)
          return true
        })${
          isDatabaseInfra
            ? `

      // TODO: Add test mock implementations for database query and transaction operations
      // Example:
      // query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
      //   Effect.succeed({}),
      // transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
      //   fn.pipe(Effect.provideService(${className}Service, ${className}Service.Test))`
            : ''
        }
    }
  })

  // ${'='.repeat(74)}
  // Static Dev Layer
  // ${'='.repeat(74)}

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   * Use this layer during local development to see detailed operation logs.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function*() {
      yield* Effect.logInfo(\`[${className}Service] [DEV] Initializing development layer\`)

      // Get actual implementation from Live layer
      const liveService = yield* ${className}Service.Live.pipe(
        Layer.build,
        Effect.map((ctx) => Context.get(ctx, ${className}Service))
      )

      // Wrap all operations with verbose logging
      return {
        get: (id: string) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] get called with id:\`, id)
            const result = yield* liveService.get(id)
            yield* Effect.logDebug(\`[${className}Service] [DEV] get result:\`, result)
            return result;
          }),

        findByCriteria: (criteria, skip, limit) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] findByCriteria called:\`, { criteria, skip, limit })
            const result = yield* liveService.findByCriteria(criteria, skip, limit)
            yield* Effect.logDebug(\`[${className}Service] [DEV] findByCriteria returned \${result.length} items\`)
            return result;
          }),

        create: (input) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] create called with:\`, input)
            const result = yield* liveService.create(input)
            yield* Effect.logDebug(\`[${className}Service] [DEV] create result:\`, result)
            return result;
          }),

        update: (id, input) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] update called:\`, { id, input })
            const result = yield* liveService.update(id, input)
            yield* Effect.logDebug(\`[${className}Service] [DEV] update result:\`, result)
            return result;
          }),

        delete: (id) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] delete called with id:\`, id)
            yield* liveService.delete(id)
            yield* Effect.logDebug(\`[${className}Service] [DEV] delete completed\`)
          }),

        healthCheck: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[${className}Service] [DEV] healthCheck called\`)
            const result = yield* liveService.healthCheck()
            yield* Effect.logDebug(\`[${className}Service] [DEV] healthCheck result:\`, result)
            return result;
          })${
            isDatabaseInfra
              ? `

        // TODO: Add development layer wrappers for database query and transaction operations
        // Example:
        // query: <A>(fn: (db: Kysely<Database>) => Promise<A>) =>
        //   Effect.gen(function*() {
        //     yield* Effect.logDebug(\`[${className}Service] [DEV] query called\`)
        //     const result = yield* liveService.query(fn)
        //     yield* Effect.logDebug(\`[${className}Service] [DEV] query result:\`, result)
        //     return result;
        //   }),
        // transaction: <A, E>(fn: Effect.Effect<A, E, ${className}Service>) =>
        //   Effect.gen(function*() {
        //     yield* Effect.logDebug(\`[${className}Service] [DEV] transaction started\`)
        //     const result = yield* liveService.transaction(fn)
        //     yield* Effect.logDebug(\`[${className}Service] [DEV] transaction completed\`)
        //     return result;
        //   })`
              : ''
          }
      };
    })
  )

  // ${'='.repeat(74)}
  // Static Auto Layer
  // ${'='.repeat(74)}

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
        return ${className}Service.Test;
      case "development":
        return ${className}Service.Dev;
      default:
        return ${className}Service.Live;
    }
  })${
    includeClientServer
      ? `

  // ${'='.repeat(74)}
  // Platform-Specific Layers (Client/Server)
  // ${'='.repeat(74)}

  /**
   * Client Live Layer
   *
   * Browser-safe implementation defined in client.ts
   * This property is assigned at module load time.
   */
  static ClientLive: Layer.Layer<${className}Service, never, never>

  /**
   * Server Live Layer
   *
   * Node.js implementation defined in server.ts
   * This property is assigned at module load time.
   */
  static ServerLive: Layer.Layer<${className}Service, never, never>`
      : ''
  }
}`)

  return builder.toString()
}
