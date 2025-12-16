/**
 * Feature Service Template
 *
 * Generates server/service/service.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/feature/service/service-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../../utils/shared/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/service/service.ts file
 *
 * Creates Context.Tag interface with static layers
 */
export function generateFeatureServiceFile(
  options: FeatureTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className}Service.

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create-${fileName}'
  - Full service: import { ${className}Service } from './interface'`,
    module: `@custom-repo/feature-${fileName}/server/service`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context"] }
  ])
  builder.addBlankLine()

  // Import shared types and errors
  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}Result`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}Error`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Add baseline integration imports
  builder.addComment("Baseline Integration - Repository")
  builder.addRaw(`import { ${className}Repository } from "${scope}/data-access-${fileName}";`)
  builder.addBlankLine()

  // Service interface
  builder.addSectionComment("Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Interface
 *
 * Business logic and orchestration for ${fileName} domain.
 * TODO: Customize operations based on your domain requirements
 */
export interface ${className}ServiceInterface {
  /**
   * Example operation - Replace with your actual operations
   */
  readonly exampleOperation: () => Effect.Effect<${className}Result, ${className}Error>;

  // ==========================================================================
  // TODO: Caching Strategies with Effect Operators
  // ==========================================================================
  //
  // Effect provides built-in caching operators for different use cases.
  // Choose the right caching strategy based on your needs:
  //
  // DECISION MATRIX:
  // ┌─────────────────────┬─────────────┬──────────────┬─────────────────┐
  // │ Strategy            │ Scope       │ TTL Support  │ Use Case        │
  // ├─────────────────────┼─────────────┼──────────────┼─────────────────┤
  // │ Effect.cached       │ Single proc │ Indefinite   │ Pure functions  │
  // │ Effect.cachedWithTTL│ Single proc │ Yes (time)   │ API rate limits │
  // │ CacheService (Redis)│ Distributed │ Yes (custom) │ User sessions   │
  // │ Layered caching     │ Both        │ Yes          │ High traffic    │
  // └─────────────────────┴─────────────┴──────────────┴─────────────────┘
  //
  // Example 1: Effect.cached - Indefinite cache for pure computations
  //
  // readonly getUserProfile: (userId: string) => Effect.Effect<
  //   UserProfile,
  //   ${className}Error,
  //   never
  // >;
  //
  // // Implementation in Live layer:
  // getUserProfile: (userId) =>
  //   Effect.gen(function* () {
  //     const repo = yield* UserRepository;
  //     const user = yield* repo.findById(userId);
  //     return transformToProfile(user);
  //   }).pipe(Effect.cached), // ← Cache indefinitely
  //
  // // Usage:
  // const profile1 = yield* service.getUserProfile("user-123");
  // const profile2 = yield* service.getUserProfile("user-123"); // Cached!
  //
  // ⚠️  Use Effect.cached for:
  // - Pure computations (same input → same output)
  // - Expensive calculations
  // - Reference data that rarely changes
  //
  // ❌ Don't use Effect.cached for:
  // - Data that changes frequently
  // - Time-sensitive data
  // - User-specific dynamic data
  //
  // Example 2: Effect.cachedWithTTL - Time-based expiration
  //
  // readonly getProductCatalog: () => Effect.Effect<
  //   Product[],
  //   ${className}Error,
  //   never
  // >;
  //
  // // Implementation with 10-minute TTL:
  // getProductCatalog: () =>
  //   Effect.gen(function* () {
  //     const repo = yield* ProductRepository;
  //     const products = yield* repo.findAll();
  //     return products;
  //   }).pipe(Effect.cachedWithTTL("10 minutes")),
  //
  // // Cache refreshes automatically after 10 minutes
  // const catalog1 = yield* service.getProductCatalog(); // Fresh
  // const catalog2 = yield* service.getProductCatalog(); // Cached
  // // ... 11 minutes later ...
  // const catalog3 = yield* service.getProductCatalog(); // Fresh again
  //
  // ⚠️  Use Effect.cachedWithTTL for:
  // - API responses with rate limits
  // - Frequently accessed data that changes periodically
  // - Reducing database load
  //
  // Example 3: Layered Caching (L1: Memory + L2: Redis)
  //
  // readonly getProductDetails: (productId: string) => Effect.Effect<
  //   Product,
  //   ${className}Error,
  //   CacheService // ← Redis dependency
  // >;
  //
  // // Implementation with two-tier caching:
  // getProductDetails: (productId) =>
  //   Effect.gen(function* () {
  //     // L2 Cache: Check Redis first
  //     const cache = yield* CacheService;
  //     const cached = yield* cache.get<Product>(\`product:\${productId}\`);
  //
  //     if (Option.isSome(cached)) {
  //       return cached.value;
  //     }
  //
  //     // Cache miss - fetch from database
  //     const repo = yield* ProductRepository;
  //     const product = yield* repo.findById(productId);
  //
  //     // Store in Redis with TTL
  //     yield* cache.set(\`product:\${productId}\`, product, "1 hour");
  //
  //     return product;
  //   }).pipe(Effect.cached), // ← L1 Cache: In-memory
  //
  // ⚠️  Use layered caching for:
  // - High-traffic endpoints
  // - Multi-server deployments
  // - Expensive database queries
  //
  // Pattern: L1 (fast, single-process) + L2 (shared, durable)
  //
  // Example 4: Effect.once - One-time initialization
  //
  // readonly initializeFeatureFlags: () => Effect.Effect<
  //   FeatureFlags,
  //   ${className}Error,
  //   never
  // >;
  //
  // // Implementation:
  // initializeFeatureFlags: () =>
  //   Effect.gen(function* () {
  //     const config = yield* ConfigService;
  //     const flags = yield* config.loadFeatureFlags();
  //     console.log("Feature flags initialized");
  //     return flags;
  //   }).pipe(Effect.once), // ← Runs exactly once
  //
  // // Multiple calls share the same result
  // const flags1 = yield* service.initializeFeatureFlags(); // Initializes
  // const flags2 = yield* service.initializeFeatureFlags(); // Returns cached
  //
  // ⚠️  Use Effect.once for:
  // - Application initialization
  // - Loading configuration
  // - One-time setup operations
  //
  // Example 5: cachedFunction - Function memoization
  //
  // import { cachedFunction } from "effect/Function"
  //
  // // In Live layer:
  // const calculateDiscount = cachedFunction(
  //   (price: number, tier: string) =>
  //     Effect.gen(function* () {
  //       // Expensive calculation
  //       const rules = yield* DiscountRules;
  //       return rules.calculate(price, tier);
  //     })
  // );
  //
  // readonly getDiscountedPrice: (
  //   price: number,
  //   tier: string
  // ) => Effect.Effect<number, ${className}Error, DiscountRules>;
  //
  // // Implementation:
  // getDiscountedPrice: (price, tier) => calculateDiscount(price, tier),
  //
  // ⚠️  Use cachedFunction for:
  // - Pure function memoization
  // - Expensive calculations with same inputs
  // - Deterministic transformations
  //
  // Example 6: Cache invalidation pattern
  //
  // readonly updateProduct: (
  //   productId: string,
  //   data: ProductUpdate
  // ) => Effect.Effect<Product, ${className}Error, CacheService>;
  //
  // // Implementation with cache invalidation:
  // updateProduct: (productId, data) =>
  //   Effect.gen(function* () {
  //     const repo = yield* ProductRepository;
  //     const cache = yield* CacheService;
  //
  //     // Update database
  //     const updated = yield* repo.update(productId, data);
  //
  //     // Invalidate cache
  //     yield* cache.delete(\`product:\${productId}\`);
  //
  //     return updated;
  //   }),
  //
  // Pattern: Write-through invalidation
  // 1. Update database
  // 2. Invalidate cache
  // 3. Next read will refresh cache
  //
  // See EFFECT_PATTERNS.md "Built-in Effect Caching Operators" for more examples.
  // See FEATURE.md for service-level caching strategies.

  // ==========================================================================
  // TODO: Stream-Based Operations for Large Datasets
  // ==========================================================================
  //
  // Stream provides constant-memory processing for large/unbounded datasets.
  // Use Stream when:
  // - Processing 1000+ items
  // - Memory constraints are critical
  // - Need backpressure handling
  // - Processing real-time data flows
  //
  // Example 1: Stream all records with batch processing
  //
  // readonly processAllOrders: () => Effect.Effect<
  //   ProcessingSummary,
  //   ${className}Error,
  //   OrderRepository
  // >;
  //
  // // Implementation with Stream:
  // processAllOrders: () =>
  //   Effect.gen(function* () {
  //     const repo = yield* OrderRepository;
  //
  //     // Stream all orders in batches of 100
  //     const summary = yield* repo.streamAll({ batchSize: 100 }).pipe(
  //       // Process each order
  //       Stream.mapEffect((order) =>
  //         Effect.gen(function* () {
  //           // Business logic here
  //           yield* validateOrder(order);
  //           yield* enrichOrder(order);
  //           return order;
  //         })
  //       ),
  //       // Group into batches of 50 for bulk operations
  //       Stream.grouped(50),
  //       Stream.mapEffect((batch) => saveBatch(batch)),
  //       // Collect results
  //       Stream.runCollect,
  //       Effect.map((results) => ({
  //         processed: Chunk.size(results),
  //         success: true
  //       }))
  //     );
  //
  //     return summary;
  //   }),
  //
  // Benefits:
  // - Constant memory usage regardless of total orders
  // - Backpressure prevents overwhelming downstream systems
  // - Can process millions of records efficiently
  //
  // Example 2: Stream with Sink for aggregation
  //
  // readonly calculateTotalRevenue: (
  //   startDate: Date,
  //   endDate: Date
  // ) => Effect.Effect<number, ${className}Error, OrderRepository>;
  //
  // // Implementation:
  // calculateTotalRevenue: (startDate, endDate) =>
  //   Effect.gen(function* () {
  //     const repo = yield* OrderRepository;
  //
  //     // Stream orders and aggregate with Sink
  //     const total = yield* repo.streamByCriteria({
  //       status: "completed",
  //       createdAt: { gte: startDate, lte: endDate }
  //     }).pipe(
  //       Stream.map(order => order.amount),
  //       Stream.run(Sink.sum) // Constant memory aggregation!
  //     );
  //
  //     return total;
  //   }),
  //
  // Alternative sinks:
  // - Sink.count - Count items
  // - Sink.head - Get first item
  // - Sink.last - Get last item
  // - Sink.fold - Custom aggregation
  //
  // Example 3: Stream with error handling
  //
  // readonly exportCustomers: () => Effect.Effect<
  //   ExportResult,
  //   ${className}Error,
  //   CustomerRepository | FileService
  // >;
  //
  // // Implementation with robust error handling:
  // exportCustomers: () =>
  //   Effect.gen(function* () {
  //     const repo = yield* CustomerRepository;
  //     const fileService = yield* FileService;
  //
  //     const result = yield* repo.streamAll().pipe(
  //       // Transform to CSV format
  //       Stream.map(customer => customerToCsvRow(customer)),
  //       // Handle errors per-item (don't fail entire stream)
  //       Stream.mapEffect((row) =>
  //         Effect.catchAll(
  //           validateCsvRow(row),
  //           (error) => {
  //             console.error("Validation failed:", error);
  //             return Effect.succeed(null); // Skip invalid rows
  //           }
  //         )
  //       ),
  //       // Filter out skipped rows
  //       Stream.filter(row => row !== null),
  //       // Write to file in chunks
  //       Stream.grouped(1000),
  //       Stream.mapEffect((chunk) => fileService.appendChunk(chunk)),
  //       Stream.runDrain
  //     );
  //
  //     return { success: true, exported: true };
  //   }),
  //
  // Example 4: Real-time data processing with Queue
  //
  // readonly processIncomingEvents: () => Effect.Effect<
  //   never,
  //   ${className}Error,
  //   EventQueue
  // >;
  //
  // // Implementation with Queue + Stream:
  // processIncomingEvents: () =>
  //   Effect.gen(function* () {
  //     const queue = yield* EventQueue;
  //
  //     // Create stream from queue
  //     yield* Stream.fromQueue(queue).pipe(
  //       // Process events in parallel (max 10 concurrent)
  //       Stream.mapEffect(
  //         (event) => processEvent(event),
  //         { concurrency: 10 }
  //       ),
  //       // Log errors but continue processing
  //       Stream.catchAll((error) => {
  //         console.error("Event processing failed:", error);
  //         return Stream.empty;
  //       }),
  //       Stream.runDrain
  //     );
  //   }),
  //
  // Pattern: Queue as event buffer, Stream for processing
  //
  // Example 5: Stream composition for complex workflows
  //
  // readonly syncDataPipeline: () => Effect.Effect<
  //   SyncResult,
  //   ${className}Error,
  //   SourceRepository | TargetRepository | TransformService
  // >;
  //
  // // Implementation:
  // syncDataPipeline: () =>
  //   Effect.gen(function* () {
  //     const source = yield* SourceRepository;
  //     const target = yield* TargetRepository;
  //     const transform = yield* TransformService;
  //
  //     const synced = yield* source.streamAll().pipe(
  //       // Transform data
  //       Stream.mapEffect((item) => transform.convert(item)),
  //       // Validate
  //       Stream.filter((item) => item.isValid),
  //       // Enrich
  //       Stream.mapEffect((item) => transform.enrich(item)),
  //       // Batch insert to target
  //       Stream.grouped(100),
  //       Stream.mapEffect((batch) => target.insertBatch(batch)),
  //       // Count total
  //       Stream.run(Sink.count)
  //     );
  //
  //     return { success: true, synced };
  //   }),
  //
  // See EFFECT_PATTERNS.md "Streaming & Queuing Patterns" for comprehensive examples.
  // See FEATURE.md for service-level Stream integration patterns.
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}Service
 *
 * Static layers:
 * - ${className}Service.Live - Production with real dependencies
 * - ${className}Service.Test - In-memory for testing
 * - ${className}Service.Dev - Development with logging
 */
export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * BASELINE INTEGRATION:
   * - Repository is injected and ready to use
   * - Effect.log* methods for observability
   * - Shows proper error transformation patterns
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Inject repository (available for use in operations below)
      const repo = yield* ${className}Repository;
      void repo; // Mark as available but not used in placeholder implementation

      return {
        exampleOperation: () =>
          Effect.gen(function* () {
            // Log operation start (using Effect's built-in logging)
            yield* Effect.logInfo("${className} example operation started");

            // Example: Using repository with error transformation
            // const result = yield* repo.findById("example-id").pipe(
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: "Failed to fetch ${fileName}",
            //       cause: repoError,
            //     })
            //   )
            // );

            // Example: Orchestrating multiple operations
            // const data = yield* repo.findAll();
            // yield* Effect.logInfo(\`Fetched ${fileName} data (count: \${data.total})\`);

            // Placeholder: Implement your business logic here
            yield* Effect.logInfo("${className} example operation completed");

            // Note: Return type issue - ${className}Result is Record<string, never>
            // Update lib/shared/types.ts to define proper result shape
            return {} as ${className}Result;
          }),
      };
    })
  );

  /**
   * Test Layer - In-memory implementation
   */
  static readonly Test = Layer.succeed(
    this,
    {
      exampleOperation: () =>
        Effect.succeed({} as ${className}Result)
    }
  );

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Same implementation as Live but with enhanced debug logging.
   * Use this layer during local development to see operation flow.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      yield* Effect.logInfo(\`[${className}Service] [DEV] Initializing development layer\`);

      // Inject repository (same as Live layer)
      const repo = yield* ${className}Repository;
      void repo; // Mark as available but not used in placeholder implementation

      // Return service implementation with enhanced logging
      return {
        exampleOperation: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}Service] [DEV] exampleOperation called\`);

            // Log operation start
            yield* Effect.logInfo("${className} example operation started [DEV MODE]");

            // Example: Using repository with error transformation
            // const result = yield* repo.findById("example-id").pipe(
            //   Effect.tap(() => Effect.logDebug("[DEV] Repository call completed")),
            //   Effect.mapError((repoError) =>
            //     new ${className}Error({
            //       message: "Failed to fetch ${fileName}",
            //       cause: repoError,
            //     })
            //   )
            // );

            // Placeholder: Implement your business logic here
            yield* Effect.logInfo("${className} example operation completed [DEV MODE]");

            const result = {} as ${className}Result;
            yield* Effect.logDebug(\`[${className}Service] [DEV] exampleOperation result:\`, result);
            return result;
          })
      };
    })
  );
}`)

  return builder.toString()
}
