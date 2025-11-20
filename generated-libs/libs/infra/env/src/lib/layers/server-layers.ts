import { EnvService } from "../service/interface";
import { Context, Effect, Layer, Option, Schedule } from "effect";

/**
 * Env Service Layers
 *
 * Layer compositions for server-side dependency injection using Effect.
Provides additional layer variants for different environments and use cases.

NOTE: The primary Live and Test layers are now static members of EnvService
(see ../service/interface.ts). This file provides optional additional layer variants.
 *
 * @module @custom-repo/infra-env/layers
 * @see https://effect.website/docs/guides/context-management for layer patterns
 */

// ============================================================================
// Primary Layers (Available as Static Members)
// ============================================================================

//
// The primary Live and Test layers are defined as static members of EnvService:
//
// - EnvService.Live: Production layer with full implementation
// - EnvService.Test: Test layer with mock implementation
//
// Usage:
// ```typescript
// const program = Effect.gen(function* () {
//   const service = yield* EnvService;
//   return yield* service.get("id");
// }).pipe(
//   Effect.provide(EnvService.Live)  // Use static Live layer
// );
// ```

// ============================================================================
// Development Layer (Optional)
// ============================================================================

/**
 * Development Layer
 *
 * Optional layer with extra logging and debugging for local development.
 * Use this layer during local development to see detailed operation logs.
 *
 * LAYER TYPE SELECTION:
 * - Uses Layer.effect (NOT Layer.scoped) for simple dependency injection
 * - Only use Layer.scoped when you have resources requiring cleanup
 *
 * This is an EXAMPLE - you may delete this if you don't need development-specific logging.
 *
 * @example
 * ```typescript
 * // Usage in development:
 * const program = Effect.gen(function* () {
 *   const service = yield* EnvService;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(EnvServiceDev)
 * );
 * ```
 */
export const EnvServiceDev = Layer.effect(
  EnvService,
  Effect.gen(function* () {
    // TODO: Inject dependencies
    // const config = yield* EnvConfig;
    // const logger = yield* LoggingService;

    // TODO: Add development-specific setup (verbose logging, etc.)
    console.log("[Env] Development layer initialized");

    return {
      get: (id: string) => {
        console.log(`[Env] DEV GET ${id}`);
        return Effect.succeed(Option.none());
      },
      findByCriteria: (_criteria, _skip, _limit) => {
        console.log(`[Env] DEV findByCriteria`);
        return Effect.succeed([]);
      },
      create: (input) => {
        console.log(`[Env] DEV create`, input);
        return Effect.succeed({ id: "dev-id", ...input });
      },
      update: (id, input) => {
        console.log(`[Env] DEV update ${id}`, input);
        return Effect.succeed({ id, ...input });
      },
      delete: (id) => {
        console.log(`[Env] DEV delete ${id}`);
        return Effect.void;
      },
      healthCheck: () => {
        console.log(`[Env] DEV healthCheck`);
        return Effect.succeed(true);
      },
    };
  }),
);

/**
 * Development Layer WITH Resource Cleanup (Optional Example)
 *
 * ONLY use this pattern if your service manages resources that need cleanup
 * (e.g., database connections, file handles, network sockets, subscriptions).
 *
 * For simple dependency injection without cleanup, use Layer.effect (see above).
 *
 * DELETE THIS if you don't need resource management.
 *
 * @example
 * ```typescript
 * // When you need cleanup:
 * export const EnvServiceWithCleanup = Layer.scoped(
 *   EnvService,
 *   Effect.gen(function* () {
 *     // Acquire resource with automatic cleanup
 *     const resource = yield* Effect.acquireRelease(
 *       Effect.sync(() => {
 *         console.log("[Env] Acquiring resource");
 *         return createResource();
 *       }),
 *       (r) => Effect.sync(() => {
 *         console.log("[Env] Releasing resource");
 *         r.close();
 *       })
 *     );
 *
 *     return {
 *       get: (id: string) => Effect.succeed(resource.query(id))
 *     };
 *   })
 * );
 * ```
 */

// ============================================================================
// Auto Layer (Environment Detection) - Optional
// ============================================================================

/**
 * Automatic Layer Selection
 *
 * Selects appropriate layer based on NODE_ENV environment variable.
 * Convenient for applications that auto-select layers at startup.
 *
 * Environment mapping:
 * - NODE_ENV=production → EnvService.Live
 * - NODE_ENV=test → EnvService.Test
 * - NODE_ENV=development (default) → EnvServiceDev
 *
 * NOTE: This is an EXAMPLE. You may delete this if you prefer explicit layer selection.
 *
 * @example
 * ```typescript
 * // Usage in application:
 * const program = Effect.gen(function* () {
 *   const service = yield* EnvService;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(EnvServiceAuto)  // Automatically selects based on NODE_ENV
 * );
 * ```
 */
export const EnvServiceAuto = (() => {
  const env = process.env["NODE_ENV"] || "development";

  switch (env) {
    case "production":
      return EnvService.Live;
    case "test":
      return EnvService.Test;
    default:
      return EnvServiceDev;
  }
})();

// ============================================================================
// Advanced Pattern Examples (DELETE IF NOT NEEDED)
// ============================================================================

/**
 * Example: Layer with Custom Configuration
 *
 * Shows how to create a layer variant with custom configuration overrides.
 * Useful for testing specific scenarios or non-standard environments.
 *
 * DELETE THIS if you don't need configuration variants.
 */
export const EnvServiceCustom = (customConfig: {
  timeout?: number;
  retries?: number;
}) =>
  Layer.scoped(
    EnvService,
    Effect.gen(function* () {
      // Merge custom config with defaults
      const defaults = {
        timeout: 5000,
        retries: 3,
        ...customConfig,
      };

      console.log("[Env] Custom layer initialized with", defaults);

      return {
        get: (id: string) =>
          Effect.gen(function* () {
            // Use custom config in implementation
            console.log(`[Env] GET ${id} with ${defaults.timeout}ms timeout`);
            return Option.none();
          }),
        findByCriteria: (_criteria, _skip, _limit) => Effect.succeed([]),
        create: (input) => Effect.succeed({ id: "custom-id", ...input }),
        update: (id, input) => Effect.succeed({ id, ...input }),
        delete: (_id) => Effect.void,
        healthCheck: () => Effect.succeed(true),
      };
    }),
  );

/**
 * Example: Layer with Retry Policy
 *
 * Shows how to wrap service methods with automatic retry logic.
 * Useful for services calling flaky external APIs.
 *
 * Uses Layer.effect (NOT Layer.scoped) because retry logic doesn't require cleanup.
 *
 * DELETE THIS if you don't need retry policies.
 */
export const EnvServiceWithRetry = Layer.effect(
  EnvService,
  Effect.gen(function* () {
    // Get base service implementation
    const baseService = yield* EnvService.Live.pipe(
      Layer.build,
      Effect.map((context) => Context.get(context, EnvService))
    );

    // Wrap methods with retry policy
    const retryPolicy = {
      times: 3,
      schedule: Schedule.exponential("100 millis"),
    };

    return {
      get: (id: string) =>
        baseService.get(id).pipe(Effect.retry(retryPolicy)),
      findByCriteria: (criteria, skip, limit) =>
        baseService.findByCriteria(criteria, skip, limit).pipe(Effect.retry(retryPolicy)),
      create: (input) =>
        baseService.create(input).pipe(Effect.retry(retryPolicy)),
      update: (id, input) =>
        baseService.update(id, input).pipe(Effect.retry(retryPolicy)),
      delete: (id) =>
        baseService.delete(id).pipe(Effect.retry(retryPolicy)),
      healthCheck: () => baseService.healthCheck(),
    };
  }),
);

// ============================================================================
// Layer Composition Examples
// ============================================================================

/**
 * Example: Composed Layer with Dependencies
 *
 * Shows how to compose EnvService with its dependencies.
 * Useful for providing a complete service layer stack.
 *
 * DELETE THIS if you don't need pre-composed layer stacks.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const service = yield* EnvService;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(EnvServiceWithDeps)  // Provides EnvService + all deps
 * );
 * ```
 */
// export const EnvServiceWithDeps = Layer.mergeAll(
//   EnvService.Live,
//   EnvConfigLive,
//   LoggingServiceLive,
//   // ... other dependency layers
// );