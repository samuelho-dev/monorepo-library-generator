/**
 * Infrastructure Server Layers Template
 *
 * Generates server-side layer compositions.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate server layers file for infrastructure service
 */
export function generateServerLayersFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // File header
  builder.addFileHeader({
    title: `${className} Service Layers`,
    description: `Layer compositions for server-side dependency injection using Effect.\nProvides additional layer variants for different environments and use cases.\n\nNOTE: The primary Live and Test layers are now static members of ${className}Service\n(see ../service/service.ts). This file provides optional additional layer variants.`,
    module: `${scope}/infra-${fileName}/layers`,
    see: ['https://effect.website/docs/guides/context-management for layer patterns'],
  });

  // Imports
  builder.addImports([
    {
      from: 'effect',
      imports: ['Layer', 'Effect', 'Option'],
    },
    { from: '../service/service', imports: [`${className}Service`] },
    { from: `${scope}/env`, imports: ['env'] },
  ]);

  // Section: Primary Layers Comment
  builder.addSectionComment('Primary Layers (Available as Static Members)');

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
// \`\`\``);
  builder.addBlankLine();

  // Section: Development Layer
  builder.addSectionComment('Development Layer (Optional)');

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
      get: (id: string) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV GET id=\${id}\`);
          return Option.none();
        }),
      findByCriteria: (
        criteria: Record<string, unknown>,
        skip?: number,
        limit?: number
      ) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(
            \`[${className}] DEV findByCriteria\`,
            { criteria, skip, limit }
          );
          return [];
        }),
      create: (input: Record<string, unknown>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV create\`, input);
          return { id: "dev-id", ...input };
        }),
      update: (id: string, input: Record<string, unknown>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV update id=\${id}\`, input);
          return { id, ...input };
        }),
      delete: (id: string) =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV delete id=\${id}\`);
        }),
      healthCheck: () =>
        Effect.gen(function* () {
          yield* Effect.logDebug(\`[${className}] DEV healthCheck\`);
          return true;
        }),
    };
  }),
);`);
  builder.addBlankLine();

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
 */`);
  builder.addBlankLine();

  // Section: Auto Layer
  builder.addSectionComment('Auto Layer (Environment Detection) - Optional');

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
  switch (env.NODE_ENV) {
    case "production":
      return ${className}Service.Live;
    case "test":
      return ${className}Service.Test;
    default:
      return ${className}ServiceDev;
  }
});`);
  builder.addBlankLine();

  // Section: Advanced Pattern Examples
  builder.addSectionComment('Advanced Pattern Examples (DELETE IF NOT NEEDED)');

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
        get: (id: string) =>
          Effect.gen(function* () {
            // Use custom config in implementation
            yield* Effect.logDebug(\`[${className}] GET id=\${id} with \${defaults.timeout}ms timeout\`);
            return Option.none();
          }),
        findByCriteria: (
          criteria: Record<string, unknown>,
          skip?: number,
          limit?: number
        ) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}] findByCriteria\`, { criteria, skip, limit });
            return [];
          }),
        create: (input: Record<string, unknown>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}] create\`, input);
            return { id: "custom-id", ...input };
          }),
        update: (id: string, input: Record<string, unknown>) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}] update id=\${id}\`, input);
            return { id, ...input };
          }),
        delete: (id: string) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(\`[${className}] delete id=\${id}\`);
          }),
        healthCheck: () => Effect.succeed(true),
      };
    }),
  );`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * Example: Layer with Retry Policy (Code Example)
 *
 * Shows how to wrap service methods with automatic retry logic.
 * Useful for services calling flaky external APIs.
 *
 * This is a commented example - uncomment and customize as needed.
 * Uses Layer.effect for simple retry wrapping.
 *
 * @example
 * \`\`\`typescript
 * // Add retry logic by wrapping the Live layer
 * export const ${className}ServiceWithRetry = Layer.effect(
 *   ${className}Service,
 *   Effect.gen(function* () {
 *     const service = yield* ${className}Service;
 *
 *     const retryPolicy = {
 *       times: 3,
 *       schedule: Schedule.exponential("100 millis"),
 *     };
 *
 *     return {
 *       get: (id: string) =>
 *         service.get(id).pipe(Effect.retry(retryPolicy)),
 *       findByCriteria: (criteria, skip, limit) =>
 *         service.findByCriteria(criteria, skip, limit).pipe(Effect.retry(retryPolicy)),
 *       create: (input) =>
 *         service.create(input).pipe(Effect.retry(retryPolicy)),
 *       update: (id, input) =>
 *         service.update(id, input).pipe(Effect.retry(retryPolicy)),
 *       delete: (id) =>
 *         service.delete(id).pipe(Effect.retry(retryPolicy)),
 *       healthCheck: () => service.healthCheck(),
 *     };
 *   }),
 * ).pipe(Layer.provide(${className}Service.Live));
 * \`\`\`
 */`);
  builder.addBlankLine();

  // Section: Layer Composition Examples
  builder.addSectionComment('Layer Composition Examples');

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
// );`);

  return builder.toString();
}
