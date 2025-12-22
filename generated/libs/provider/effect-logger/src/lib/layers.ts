import { env } from "@myorg/env";
import { Effect, Layer, Redacted } from "effect";
import { EffectLoggerInternalError } from "./errors";
import { EffectLogger } from "./service";
import type { EffectLoggerConfig, Resource } from "./types";

/**
 * effect-logger - Layer Implementations
 *
 * CRITICAL: Choose correct Layer type
 * Reference: provider.md lines 1548-1587
 *
 * Layer Selection Guide:
 * 1. Layer.succeed - Test/mock data (immediate value)
 * 2. Layer.sync - Pure sync functions (no async, no deps)
 * 3. Layer.effect - Async with dependencies
 * 4. Layer.scoped - Needs cleanup/release
 */

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// In-Memory Store for Baseline Implementation
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
// Provides a working baseline implementation using in-memory storage.
// Replace with actual SDK integration as needed.
//
// Benefits:
// - Works immediately without SDK setup
// - All type errors resolved
// - Demonstrates correct Effect patterns
// - Easy to replace with real SDK
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

/**
 * Create in-memory store for baseline implementation
 *
 * Provides full CRUD operations without external dependencies.
 * Replace with SDK integration when ready.
 */
function createInMemoryStore() {
  // Use Resource type from ./types for type safety
  const store = new Map<string, Resource>();
  let idCounter = 0;

  return {
    list: (params?: { page?: number; limit?: number }) =>
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

    get: (id: string) =>
      Effect.gen(function* () {
        const item = store.get(id);
        if (!item) {
          return yield* Effect.fail(
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
          );
        }
        return item;
      }),

    create: (data: Omit<Resource, "id" | "createdAt" | "updatedAt">) =>
      Effect.sync(() => {
        const id = `item-${++idCounter}`;
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

    update: (id: string, data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>) =>
      Effect.gen(function* () {
        const item = store.get(id);
        if (!item) {
          return yield* Effect.fail(
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
          );
        }
        const updated: Resource = {
          ...item,
          ...data,
          id, // Preserve ID
          createdAt: item.createdAt, // Preserve createdAt
          updatedAt: new Date(),
        };
        store.set(id, updated);
        return updated;
      }),

    delete: (id: string) =>
      Effect.gen(function* () {
        const existed = store.delete(id);
        if (!existed) {
          return yield* Effect.fail(
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
          );
        }
      }),
  };
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// Resource Management
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
// This template uses Layer.scoped + Effect.addFinalizer for cleanup.
//
// For complex resources (pools, connections), use Effect.acquireRelease:
//   const resource = yield* Effect.acquireRelease(
//     Effect.tryPromise(() => SDK.connect(config)),  // acquire
//     (r) => Effect.sync(() => r.close())             // release
//   );
//
// See EFFECT_PATTERNS.md for complete examples
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// Runtime Preservation (for Event-Driven SDKs)
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
// If your SDK uses callbacks (EventEmitter, WebSocket, streams), you MUST
// preserve the Effect runtime. See EFFECT_PATTERNS.md lines 1779+ for complete guide.
//
// WHEN REQUIRED:
// - Event emitters: client.on('event', callback)
// - WebSocket handlers: ws.on('message', callback)
// - Stream processors: stream.on('data', callback)
// - Timers/intervals: setInterval(callback, ms)
//
// NOT REQUIRED:
// - Promise-based SDKs (use Effect.tryPromise)
// - Synchronous functions
// - SDKs with async/await APIs
//
// Example pattern:
//
// export const EffectLoggerLive = Layer.scoped(
//   EffectLogger,
//   Effect.gen(function* () {
//     const runtime = yield* Effect.runtime(); // Capture runtime
//     const logger = yield* LoggingService;
//
//     const client = new EventEmitterSDK();
//
//     client.on('event', (data) => {
//       Runtime.runFork(runtime)(
//         Effect.gen(function* () {
//           yield* logger.info('Event received', data);
//           // All services available here
//         })
//       );
//     });
//
//     yield* Effect.addFinalizer(() =>
//       Effect.sync(() => client.close())
//     );
//
//     return EffectLogger.make(client, config);
//   })
// );
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

/**
 * Live Layer - Production environment
 *
 * BASELINE IMPLEMENTATION: Uses in-memory store for immediate functionality.
 * This provides a working service that can be replaced with SDK integration.
 *
 * SDK INTEGRATION STEPS:
 * 1. Install SDK: npm install your-sdk
 * 2. Initialize client: const client = new SDK(config)
 * 3. Replace store operations with SDK calls
 * 4. Add timeout wrappers: Effect.timeoutFail(sdk.call(), { duration, onTimeout })
 * 5. Keep Effect.withSpan for distributed tracing
 *
 * Uses Layer.effect for dependency injection without cleanup.
 * Switch to Layer.scoped if SDK needs cleanup (connections, pools, etc.)
 *
 * See EFFECT_PATTERNS.md for complete SDK integration guide.
 */
export const EffectLoggerLive = Layer.effect(
  EffectLogger,
  Effect.sync(() => {
    const config: EffectLoggerConfig = {
      apiKey: Redacted.value(env.EFFECT_LOGGER_API_KEY) ?? "baseline_api_key",
      timeout: env.EFFECT_LOGGER_TIMEOUT ?? 20000,
    };

    // Baseline: In-memory store (replace with SDK integration)
    const store = createInMemoryStore();

    // Return service implementation directly (Effect 3.0+ pattern)
    // Operations instrumented with Effect.withSpan for distributed tracing
    return {
      config,
      healthCheck: Effect.succeed({ status: "healthy" as const }).pipe(
        Effect.withSpan("EffectLogger.healthCheck"),
      ),
      // TODO: Replace store operations with SDK calls
      list: (params) => store.list(params).pipe(Effect.withSpan("EffectLogger.list")),
      get: (id) => store.get(id).pipe(Effect.withSpan("EffectLogger.get")),
      create: (data) => store.create(data).pipe(Effect.withSpan("EffectLogger.create")),
      update: (id, data) => store.update(id, data).pipe(Effect.withSpan("EffectLogger.update")),
      delete: (id) => store.delete(id).pipe(Effect.withSpan("EffectLogger.delete")),
    };
  }),
);

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// Alternative: Layer.scoped (for SDKs requiring cleanup)
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
// Use this pattern if your SDK has cleanup methods (close, disconnect, end).
// Examples: Database pools, WebSocket connections, file handles
//
// export const EffectLoggerLive = Layer.scoped(
//   EffectLogger,
//   Effect.gen(function* () {
//     const config: EffectLoggerConfig = {
//       apiKey: env.EFFECT_LOGGER_API_KEY ?? "baseline_api_key",
//       timeout: env.EFFECT_LOGGER_TIMEOUT ?? 20000,
//     };
//
//     // Initialize SDK client
//     const client = new ExternalSDK(config);
//
//     // Register cleanup function
//     yield* Effect.addFinalizer(() =>
//       Effect.sync(() => {
//         // Example cleanup calls:
//         // client.close()
//         // client.disconnect()
//         // pool.end()
//         console.log(`[EffectLogger] Cleaning up client resources`);
//       }),
//     );
//
//     // Return service implementation directly
//     return {
//       config,
//       healthCheck: Effect.succeed({ status: "healthy" as const }),
//       // ... operation implementations
//     };
//   }),
// );
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

/**
 * Test Layer - Testing environment
 *
 * Uses Layer.sync for deterministic testing with in-memory store.
 * Each Layer.fresh creates isolated state for test independence.
 */
export const EffectLoggerTest = Layer.sync(EffectLogger, () => {
  // In-memory store for test isolation
  const store = new Map<string, Resource>();
  let idCounter = 0;

  return {
    config: { apiKey: "test_key", timeout: 1000 },
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
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
          );
        }
        return item;
      }),

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

    update: (id, data) =>
      Effect.gen(function* () {
        const item = store.get(id);
        if (!item) {
          return yield* Effect.fail(
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
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
            new EffectLoggerInternalError({ message: `Item ${id} not found` }),
          );
        }
      }),
  };
});

/**
 * Dev Layer - Development environment
 *
 * Same as Live but with debug logging and longer timeouts.
 * Uses in-memory store for baseline implementation.
 */
export const EffectLoggerDev = Layer.effect(
  EffectLogger,
  Effect.gen(function* () {
    const config: EffectLoggerConfig = {
      apiKey: Redacted.value(env.EFFECT_LOGGER_API_KEY) ?? "dev_key",
      timeout: 30000, // Longer timeout for dev
    };

    // Baseline: In-memory store (replace with SDK integration)
    const store = createInMemoryStore();

    yield* Effect.logInfo(
      "[EffectLogger] [DEV] Development layer initialized with in-memory store",
    );

    // Return service implementation with distributed tracing
    return {
      config,
      healthCheck: Effect.succeed({ status: "healthy" as const }).pipe(
        Effect.withSpan("EffectLogger.healthCheck"),
      ),
      // TODO: Replace store operations with SDK calls
      list: (params) =>
        store
          .list(params)
          .pipe(Effect.tap(() => Effect.logDebug("[EffectLogger] list called")))
          .pipe(Effect.withSpan("EffectLogger.list")),
      get: (id) =>
        store
          .get(id)
          .pipe(Effect.tap(() => Effect.logDebug(`[EffectLogger] get called: ${id}`)))
          .pipe(Effect.withSpan("EffectLogger.get")),
      create: (data) =>
        store
          .create(data)
          .pipe(Effect.tap(() => Effect.logDebug("[EffectLogger] create called")))
          .pipe(Effect.withSpan("EffectLogger.create")),
      update: (id, data) =>
        store
          .update(id, data)
          .pipe(Effect.tap(() => Effect.logDebug(`[EffectLogger] update called: ${id}`)))
          .pipe(Effect.withSpan("EffectLogger.update")),
      delete: (id) =>
        store
          .delete(id)
          .pipe(Effect.tap(() => Effect.logDebug(`[EffectLogger] delete called: ${id}`)))
          .pipe(Effect.withSpan("EffectLogger.delete")),
    };
  }),
);

/**
 * Auto Layer - Automatic environment detection
 *
 * Selects appropriate layer based on NODE_ENV.
 * Uses Layer.suspend for lazy evaluation - the layer is selected at runtime
 * when the layer is first used, not at module import time.
 */
export const EffectLoggerAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "production":
      return EffectLoggerLive;
    case "development":
      return EffectLoggerDev;
    case "test":
      return EffectLoggerTest;
    default:
      return EffectLoggerDev;
  }
});

/**
 * makeEffectLoggerLayer - Custom layer factory
 *
 * Use this to create a layer with custom configuration.
 * Baseline uses in-memory store - replace with SDK integration.
 *
 * Example:
 * ```typescript
 * const customLayer = makeEffectLoggerLayer({
 *   apiKey: "custom_key",
 *   timeout: 5000,
 * });
 * ```
 */
export function makeEffectLoggerLayer(config: EffectLoggerConfig) {
  return Layer.scoped(
    EffectLogger,
    Effect.gen(function* () {
      // Baseline: In-memory store (replace with SDK integration)
      const store = createInMemoryStore();

      // Register cleanup function
      yield* Effect.addFinalizer(() =>
        Effect.logInfo("[EffectLogger] [CUSTOM] Cleaning up resources").pipe(
          Effect.andThen(
            Effect.sync(() => {
              // TODO: Add SDK cleanup logic when integrating
              // client.close()
              // client.disconnect()
            }),
          ),
        ),
      );

      // Return service implementation directly (Effect 3.0+ pattern)
      return {
        config,
        healthCheck: Effect.succeed({ status: "healthy" as const }),
        // TODO: Replace store operations with SDK implementations
        list: (params) => store.list(params),
        get: (id) => store.get(id),
        create: (data) => store.create(data),
        update: (id, data) => store.update(id, data),
        delete: (id) => store.delete(id),
      };
    }),
  );
}
