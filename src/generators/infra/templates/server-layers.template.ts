/**
 * Infrastructure Server Layers Template
 *
 * Generates server-side layer compositions.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server layers file for infrastructure service
 */
export function generateServerLayersFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // File header
  builder.addFileHeader({
    title: `${className} Service Layers`,
    description:
      `Layer compositions for server-side dependency injection using Effect.\nProvides additional layer variants for different environments and use cases.\n\nNOTE: The primary Live and Test layers are now static members of ${className}Service\n(see ../service/interface.ts). This file provides optional additional layer variants.`,
    module: `@custom-repo/infra-${fileName}/layers`,
    see: [
      "https://effect.website/docs/guides/context-management for layer patterns"
    ]
  })

  // Imports
  builder.addImports([
    {
      from: "effect",
      imports: ["Layer", "Effect", "Option", "Context", "Schedule"]
    },
    { from: "../service/interface", imports: [`${className}Service`] }
  ])

  // Section: Primary Layers Comment
  builder.addSectionComment("Primary Layers (Available as Static Members)")

  builder.addRaw(`//
// The primary Live and Test layers are defined as static members of ${className}Service:
//
// - ${className}Service.Live: Production layer with full implementation
// - ${className}Service.Test: Test layer with mock implementation
//
// Usage:
// \`\`\`typescript
// const program = Effect.gen(function* () {
//   const service = yield* ${className}Service;
//   return yield* service.get("id");
// }).pipe(
//   Effect.provide(${className}Service.Live)  // Use static Live layer
// );
// \`\`\``)
  builder.addBlankLine()

  // Section: Development Layer
  builder.addSectionComment("Development Layer (Optional)")

  builder.addRaw(`/**
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
 * \`\`\`typescript
 * // Usage in development:
 * const program = Effect.gen(function* () {
 *   const service = yield* ${className}Service;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(${className}ServiceDev)
 * );
 * \`\`\`
 */
export const ${className}ServiceDev = Layer.effect(
  ${className}Service,
  Effect.gen(function* () {
    // TODO: Inject dependencies
    // const config = yield* ${className}Config;
    // const logger = yield* LoggingService;

    // TODO: Add development-specific setup (verbose logging, etc.)
    yield* Effect.logInfo("[${className}] Development layer initialized");

    return {
      get: () =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV GET\`);
          return Option.none();
        }),
      findByCriteria: () =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV findByCriteria\`);
          return [];
        }),
      create: (input) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV create\`, input);
          return { id: "dev-id", ...input };
        }),
      update: (_, input) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV update\`, input);
          return { id: "dev-id", ...input };
        }),
      delete: () =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV delete\`);
        }),
      healthCheck: () =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV healthCheck\`);
          return true;
        }),
    };
  }),
);`)
  builder.addBlankLine()

  builder.addRaw(`/**
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
 * \`\`\`typescript
 * // When you need cleanup:
 * export const ${className}ServiceWithCleanup = Layer.scoped(
 *   ${className}Service,
 *   Effect.gen(function* () {
 *     // Acquire resource with automatic cleanup
 *     const resource = yield* Effect.acquireRelease(
 *       Effect.sync(() => {
 *         console.log("[${className}] Acquiring resource");
 *         return createResource();
 *       }),
 *       (r) => Effect.sync(() => {
 *         console.log("[${className}] Releasing resource");
 *         r.close();
 *       })
 *     );
 *
 *     return {
 *       get: (id: string) => Effect.succeed(resource.query(id))
 *     };
 *   })
 * );
 * \`\`\`
 */`)
  builder.addBlankLine()

  // Section: Auto Layer
  builder.addSectionComment("Auto Layer (Environment Detection) - Optional")

  builder.addRaw(`/**
 * Automatic Layer Selection
 *
 * Selects appropriate layer based on NODE_ENV environment variable.
 * Convenient for applications that auto-select layers at startup.
 *
 * Uses Layer.suspend for lazy evaluation - the layer is selected at runtime
 * when the layer is first used, not at module import time.
 *
 * Environment mapping:
 * - NODE_ENV=production → ${className}Service.Live
 * - NODE_ENV=test → ${className}Service.Test
 * - NODE_ENV=development (default) → ${className}ServiceDev
 *
 * NOTE: This is an EXAMPLE. You may delete this if you prefer explicit layer selection.
 *
 * @example
 * \`\`\`typescript
 * // Usage in application:
 * const program = Effect.gen(function* () {
 *   const service = yield* ${className}Service;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(${className}ServiceAuto)  // Automatically selects based on NODE_ENV
 * );
 * \`\`\`
 */
export const ${className}ServiceAuto = Layer.suspend(() => {
  const env = process.env["NODE_ENV"] || "development";

  switch (env) {
    case "production":
      return ${className}Service.Live;
    case "test":
      return ${className}Service.Test;
    default:
      return ${className}ServiceDev;
  }
});`)
  builder.addBlankLine()

  // Section: Advanced Pattern Examples
  builder.addSectionComment("Advanced Pattern Examples (DELETE IF NOT NEEDED)")

  builder.addRaw(`/**
 * Example: Layer with Custom Configuration
 *
 * Shows how to create a layer variant with custom configuration overrides.
 * Useful for testing specific scenarios or non-standard environments.
 *
 * DELETE THIS if you don't need configuration variants.
 */
export const ${className}ServiceCustom = (customConfig: {
  timeout?: number;
  retries?: number;
}) =>
  Layer.scoped(
    ${className}Service,
    Effect.gen(function* () {
      // Merge custom config with defaults
      const defaults = {
        timeout: 5000,
        retries: 3,
        ...customConfig,
      };

      yield* Effect.logInfo("[${className}] Custom layer initialized with", defaults);

      return {
        get: () =>
          Effect.gen(function* () {
            // Use custom config in implementation
            yield* Effect.logDebug(\`[${className}] GET with \${defaults.timeout}ms timeout\`);
            return Option.none();
          }),
        findByCriteria: () => Effect.succeed([]),
        create: (input) => Effect.succeed({ id: "custom-id", ...input }),
        update: (_, input) => Effect.succeed({ id: "custom-id", ...input }),
        delete: () => Effect.void,
        healthCheck: () => Effect.succeed(true),
      };
    }),
  );`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Example: Layer with Retry Policy
 *
 * Shows how to wrap service methods with automatic retry logic.
 * Useful for services calling flaky external APIs.
 *
 * Uses Layer.effect (NOT Layer.scoped) because retry logic doesn't require cleanup.
 *
 * DELETE THIS if you don't need retry policies.
 */
export const ${className}ServiceWithRetry = Layer.effect(
  ${className}Service,
  Effect.gen(function* () {
    // Get base service implementation
    const baseService = yield* ${className}Service.Live.pipe(
      Layer.build,
      Effect.andThen(${className}Service)
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
);`)
  builder.addBlankLine()

  // Section: Layer Composition Examples
  builder.addSectionComment("Layer Composition Examples")

  builder.addRaw(`/**
 * Example: Composed Layer with Dependencies
 *
 * Shows how to compose ${className}Service with its dependencies.
 * Useful for providing a complete service layer stack.
 *
 * DELETE THIS if you don't need pre-composed layer stacks.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function* () {
 *   const service = yield* ${className}Service;
 *   return yield* service.get("id");
 * }).pipe(
 *   Effect.provide(${className}ServiceWithDeps)  // Provides ${className}Service + all deps
 * );
 * \`\`\`
 */
// export const ${className}ServiceWithDeps = Layer.mergeAll(
//   ${className}Service.Live,
//   ${className}ConfigLive,
//   LoggingServiceLive,
//   // ... other dependency layers
// );`)

  return builder.toString()
}
