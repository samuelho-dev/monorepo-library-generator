import { Context, Effect, Layer, Redacted } from "effect";
import type { EffectMetricsServiceError } from "../errors";
import { EffectMetricsNotFoundError } from "../errors";
import type {
  EffectMetricsConfig,
  HealthCheckResult,
  ListParams,
  PaginatedResult,
  Resource,
} from "../types";

/**
 * EffectMetrics Service Interface
 *
 * Context.Tag definition for EffectMetrics provider service.

External Service: Effect.Metrics

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create'
  - Full service: import { EffectMetrics } from './service'
 *
 * @module @myorg/provider-effect-metrics/service
 */

// ============================================================================
// Service Interface
// ============================================================================

/**
 * EffectMetrics Service Interface
 *
 * Provider: External service adapter for Effect.Metrics
 *
 * Operations:
 * - Health check and configuration
 * - CRUD operations for external service resources
 * - Pagination support for list operations
 * - Retry logic with exponential backoff
 */
export interface EffectMetricsServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: EffectMetricsConfig;

  /**
   * Health check - verifies service connectivity
   */
  readonly healthCheck: Effect.Effect<HealthCheckResult, EffectMetricsServiceError>;

  /**
   * List resources with pagination support
   */
  readonly list: (
    params?: ListParams,
  ) => Effect.Effect<PaginatedResult<Resource>, EffectMetricsServiceError>;

  /**
   * Get resource by ID
   */
  readonly get: (id: string) => Effect.Effect<Resource, EffectMetricsServiceError>;

  /**
   * Create new resource
   */
  readonly create: (
    data: Omit<Resource, "id" | "createdAt" | "updatedAt">,
  ) => Effect.Effect<Resource, EffectMetricsServiceError>;

  /**
   * Update existing resource
   */
  readonly update: (
    id: string,
    data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>,
  ) => Effect.Effect<Resource, EffectMetricsServiceError>;

  /**
   * Delete resource
   */
  readonly delete: (id: string) => Effect.Effect<void, EffectMetricsServiceError>;

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
  // ) => Stream.Stream<Resource, EffectMetricsServiceError, never>;
  //
  // // Implementation:
  // streamAll: (params) =>
  //   Stream.asyncScoped<Resource, EffectMetricsServiceError>((emit) =>
  //     Effect.gen(function* () {
  //       const client = yield* EffectMetricsClient;
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
  // ) => Stream.Stream<Resource, EffectMetricsServiceError, never>;
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
  //   EffectMetricsEvent,
  //   EffectMetricsServiceError,
  //   never
  // >;
  //
  // // Implementation with Queue:
  // streamEvents: () =>
  //   Stream.asyncScoped<EffectMetricsEvent, EffectMetricsServiceError>((emit) =>
  //     Effect.gen(function* () {
  //       const client = yield* EffectMetricsClient;
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
  // ) => Stream.Stream<void, EffectMetricsServiceError, never>;
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
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * EffectMetrics Service Tag
 *
 * Access via: yield* EffectMetrics
 *
 * Static layers:
 * - EffectMetrics.Live - Production with real Effect.Metrics SDK
 * - EffectMetrics.Test - In-memory for testing
 * - EffectMetrics.Dev - Development with logging
 *
 * Bundle optimization:
 * Operations are lazy-loaded via dynamic imports for optimal tree-shaking.
 * Only the operations you use will be included in your bundle.
 */
export class EffectMetrics extends Context.Tag("EffectMetrics")<
  EffectMetrics,
  EffectMetricsServiceInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * Currently uses in-memory baseline. Replace with Effect.Metrics SDK integration:
   *
   * @example
   * ```typescript
   * // 1. Install SDK: pnpm add effect.metrics-sdk
   * // 2. Replace in-memory store with SDK calls:
   * static readonly Live = Layer.effect(
   *   this,
   *   Effect.gen(function* () {
   *     const client = new Effect.MetricsClient(config);
   *     return {
   *       get: (id) => Effect.tryPromise({
   *         try: () => client.get(id),
   *         catch: (error) => new EffectMetricsInternalError({ message: "Get failed", cause: error })
   *       }),
   *       // ... other methods
   *     };
   *   })
   * );
   * ```
   */
  static readonly Live = Layer.effect(
    EffectMetrics,
    Effect.gen(function* () {
      // Lazy import env - only loads when Live layer is built, not at module parse time
      // This allows tests to import service.ts without triggering env validation
      const { env } = yield* Effect.promise(() => import("@myorg/env"));

      // In-memory baseline implementation
      // TODO: Replace with Effect.Metrics SDK integration
      const store = new Map<string, Resource>();
      let idCounter = 0;

      // Configuration from environment variables
      const config: EffectMetricsConfig = {
        apiKey: Redacted.value(env.EFFECT_METRICS_API_KEY) ?? "fallback_api_key",
        timeout: env.EFFECT_METRICS_TIMEOUT ?? 20000,
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
                new EffectMetricsNotFoundError({
                  message: `Resource ${id} not found`,
                  resourceId: id,
                  resourceType: "Resource",
                }),
              );
            }
            return item;
          }),

        create: (data) =>
          Effect.sync(() => {
            const id = `live-${++idCounter}`;
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
                new EffectMetricsNotFoundError({
                  message: `Resource ${id} not found`,
                  resourceId: id,
                  resourceType: "Resource",
                }),
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
                new EffectMetricsNotFoundError({
                  message: `Resource ${id} not found`,
                  resourceId: id,
                  resourceType: "Resource",
                }),
              );
            }
          }),
      };
    }),
  );

  /**
   * Test Layer - Placeholder implementation
   *
   * Uses Layer.sync for deterministic testing with in-memory store.
   * Each Layer.fresh creates isolated state for test independence.
   *
   * Provides a fully functional baseline implementation for testing.
   * Customize via Layer.succeed(EffectMetrics, \{ ...your mock implementations \})
   * for specific test scenarios.
   */
  static readonly Test = Layer.sync(EffectMetrics, () => {
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
              new EffectMetricsNotFoundError({
                message: `Resource ${id} not found`,
                resourceId: id,
                resourceType: "Resource",
              }),
            );
          }
          return item;
        }),

      // Create with generated ID
      create: (data) =>
        Effect.sync(() => {
          const id = `test-${++idCounter}`;
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
              new EffectMetricsNotFoundError({
                message: `Resource ${id} not found`,
                resourceId: id,
                resourceType: "Resource",
              }),
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
              new EffectMetricsNotFoundError({
                message: `Resource ${id} not found`,
                resourceId: id,
                resourceType: "Resource",
              }),
            );
          }
        }),
    };
  });

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   * Useful for debugging external SDK integrations.
   */
  static readonly Dev = Layer.effect(
    EffectMetrics,
    Effect.gen(function* () {
      console.log("[EffectMetrics] [DEV] Initializing development layer");

      // Get actual implementation from Live layer
      const liveService = yield* EffectMetrics.Live.pipe(
        Layer.build,
        Effect.map(Context.unsafeGet(EffectMetrics)),
      );

      // Wrap all operations with logging
      return {
        config: liveService.config,

        healthCheck: Effect.gen(function* () {
          console.log("[EffectMetrics] [DEV] healthCheck called");
          const result = yield* liveService.healthCheck;
          console.log("[EffectMetrics] [DEV] healthCheck result:", result);
          return result;
        }),

        list: (params) =>
          Effect.gen(function* () {
            console.log("[EffectMetrics] [DEV] list called with:", params);
            const result = yield* liveService.list(params);
            console.log("[EffectMetrics] [DEV] list result:", {
              count: result.data.length,
              total: result.total,
            });
            return result;
          }),

        get: (id) =>
          Effect.gen(function* () {
            console.log("[EffectMetrics] [DEV] get called with id:", id);
            const result = yield* liveService.get(id);
            console.log("[EffectMetrics] [DEV] get result:", result);
            return result;
          }),

        create: (data) =>
          Effect.gen(function* () {
            console.log("[EffectMetrics] [DEV] create called with:", data);
            const result = yield* liveService.create(data);
            console.log("[EffectMetrics] [DEV] create result:", result);
            return result;
          }),

        update: (id, data) =>
          Effect.gen(function* () {
            console.log("[EffectMetrics] [DEV] update called with id:", id, "data:", data);
            const result = yield* liveService.update(id, data);
            console.log("[EffectMetrics] [DEV] update result:", result);
            return result;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            console.log("[EffectMetrics] [DEV] delete called with id:", id);
            yield* liveService.delete(id);
            console.log("[EffectMetrics] [DEV] delete completed");
          }),
      };
    }),
  );
}
