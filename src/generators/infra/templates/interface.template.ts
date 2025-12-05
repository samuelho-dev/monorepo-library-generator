/**
 * Infrastructure Service Interface Template
 *
 * Generates the service definition using Effect 3.0+ Context.Tag pattern.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate service interface file for infrastructure service
 */
export function generateInterfaceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // File header
  builder.addFileHeader({
    title: `${className} Service`,
    description:
      `Defines the service contract using Effect 3.0+ Context.Tag pattern with inline interface\nand static Live layer for dependency injection.\n\nThis file combines the service definition and implementation in a single module following\nEffect 3.0+ best practices for infrastructure services.\n\nCUSTOMIZATION GUIDE:\n1. ✅ Service methods are fully defined in Context.Tag interface (get, findByCriteria, create, update, delete, healthCheck)\n2. ✅ Live layer includes complete implementation with dependency injection, resource management, and error handling\n3. ✅ Test layer provides in-memory implementations for all methods\n4. 🔧 Customize resource initialization, query logic, and error types for your specific use case\n5. 🔧 Uncomment and configure dependencies (config, logger, provider) as needed`,
    module: `@custom-repo/infra-${fileName}/service`,
    see: [
      "https://effect.website/docs/guides/context-management for dependency injection",
      "EFFECT_PATTERNS.md for Effect 3.0+ service patterns"
    ]
  })

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Option", "Context"] },
    {
      from: "./errors",
      imports: [
        `${className}InternalError`
      ]
    },
    { from: "./errors", imports: [`${className}Error`], isTypeOnly: true }
  ])

  // Section: Service Context.Tag Definition
  builder.addSectionComment(
    "Service Context.Tag Definition with Inline Interface (Effect 3.0+)"
  )

  // Service class with Context.Tag
  builder.addRaw(`/**
 * ${className} Service Context Tag
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition and static Live layer.
 * This ensures proper type inference and follows modern Effect best practices.
 *
 * WHY THIS PATTERN:
 * - Preserves complete type information in Context
 * - Allows TypeScript to infer method signatures correctly
 * - Avoids circular reference when interface and tag share same name
 * - Includes static Live layer directly in service class
 * - Follows Effect 3.0+ recommended architecture
 *
 * ARCHITECTURE NOTES:
 * - Use Layer.scoped for services that manage resources (connections, pools, files)
 * - Use Layer.effect for stateless services or simple configuration
 * - Use Effect.acquireRelease for automatic resource cleanup
 * - Capture runtime context when integrating callback-based libraries
 *
 * @example
 * \`\`\`typescript
 * // In application or API handler:
 * const program = Effect.gen(function* () {
 *   const service = yield* ${className}Service;
 *   const result = yield* service.get("id-123");
 *   return result;
 * }).pipe(
 *   Effect.provide(${className}Service.Live)
 * );
 * \`\`\`
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
    ) => Effect.Effect<readonly unknown[], ${className}Error>;

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
    ) => Effect.Effect<unknown, ${className}Error>;

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
    ) => Effect.Effect<unknown, ${className}Error>;

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
    readonly delete: (id: string) => Effect.Effect<void, ${className}Error>;

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
    readonly healthCheck: () => Effect.Effect<boolean, never>;
  }
>() {`)

  // Static Live Layer
  builder.addRaw(`  // ${"=".repeat(74)}
  // Static Live Layer (Effect 3.0+ Pattern)
  // ${"=".repeat(74)}

  /**
   * Production Layer Implementation
   *
   * This is the live implementation of ${className}Service that will be used in production.
   * Uses Layer.scoped for automatic resource cleanup.
   *
   * WHEN TO USE Layer.scoped vs Layer.effect:
   * - Layer.scoped: Services managing resources (connections, pools, subscriptions)
   * - Layer.effect: Stateless services or simple configuration
   *
   * DEPENDENCY INJECTION EXAMPLES:
   * - Configuration: const config = yield* ${className}Config;
   * - Logging: import { LoggingService } from "@custom-repo/infra-logging/server";
   * - Provider: Replace ProviderService with actual provider like StripeService
   * - Other Services: Inject other infra services as needed
   *
   * @example
   * \`\`\`typescript
   * // Usage in application:
   * const program = Effect.gen(function* () {
   *   const service = yield* ${className}Service;
   *   return yield* service.get("id");
   * }).pipe(
   *   Effect.provide(${className}Service.Live)
   * );
   * \`\`\`
   */
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      // 1. Inject Dependencies
      // Uncomment and customize based on your service needs:
      // const config = yield* ${className}Config;
      // const logger = yield* LoggingService;
      // const provider = yield* ProviderService; // Replace with actual provider

      // 2. Acquire Resources with Effect.acquireRelease
      // Example: Connection pool that needs cleanup
      const resource = yield* Effect.acquireRelease(
        Effect.gen(function () {
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
        (resource) => Effect.gen(function () {
          // Release phase: Cleanup resource
          // yield* logger.info("${className} service shutting down");

          return Effect.tryPromise({
            try: () => resource.close(),
            catch: () => new Error("Failed to close resource")
          }).pipe(
            Effect.catchAll(() => Effect.void) // Ignore cleanup errors
          );
        })
      );

      // 3. Return Service Implementation
      // ✅ Direct object return (Effect 3.0+), no .of() needed
      return {
        get: (id: string) =>
          Effect.gen(function () {
            // yield* logger.debug(\`Getting item: \${id}\`);

            return Effect.tryPromise({
              try: () => resource.query(id),
              catch: (error) => new ${className}InternalError({
                message: \`Failed to get item \${id}\`,
                cause: error
              })
            }).pipe(
              Effect.map(Option.fromNullable)
            );
          }),

        findByCriteria: (_criteria, _skip = 0, _limit = 10) =>
          Effect.gen(function () {
            // yield* logger.debug("Finding items by criteria", { criteria, skip, limit });

            return Effect.tryPromise({
              try: async () => {
                // Replace with actual query logic
                return [{ id: "1", ..._criteria }, { id: "2", ..._criteria }]
                  .slice(_skip, _skip + _limit);
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to find items by criteria",
                cause: error
              })
            });
          }),

        create: (input) =>
          Effect.gen(function () {
            // yield* logger.info("Creating item", { input });

            return Effect.tryPromise({
              try: async () => {
                // Replace with actual creation logic
                return { id: crypto.randomUUID(), ...input, createdAt: new Date() };
              },
              catch: (error) => new ${className}InternalError({
                message: "Failed to create item",
                cause: error
              })
            });
          }),

        update: (id, input) =>
          Effect.gen(function () {
            // yield* logger.info(\`Updating item: \${id}\`, { input });

            // Note: Cannot use yield* inside async callback
            // If you need to check existence first, do it outside Effect.tryPromise
            return Effect.tryPromise({
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
          }),

        delete: (id) =>
          Effect.gen(function () {
            // yield* logger.info(\`Deleting item: \${id}\`);

            // Note: Cannot use yield* inside async callback
            // If you need to check existence first, do it outside Effect.tryPromise
            return Effect.tryPromise({
              try: async () => {
                // Replace with actual deletion logic
                // For existence check, use SDK-level validation or separate Effect
                // Perform deletion
              },
              catch: (error) => new ${className}InternalError({
                message: \`Failed to delete item \${id}\`,
                cause: error
              })
            });
          }),

        healthCheck: () =>
          Effect.gen(function () {
            // Check resource health
            const isHealthy = resource.isConnected;

            // Optionally: Perform actual health check query
            // const result = yield* Effect.tryPromise({
            //   try: () => resource.query("health"),
            //   catch: () => false as const
            // }).pipe(Effect.catchAll(() => Effect.succeed(false as const)));

            return isHealthy;
          })
      };
    })
  );

  // ${"=".repeat(74)}
  // Static Test Layer
  // ${"=".repeat(74)}

  /**
   * Test Layer Implementation
   *
   * In-memory implementation for testing. Use this layer in unit and integration tests.
   * All operations are synchronous and don't require external services.
   *
   * @example
   * \`\`\`typescript
   * // Usage in tests:
   * const testProgram = program.pipe(
   *   Effect.provide(${className}Service.Test)
   * );
   * \`\`\`
   */
  static readonly Test = Layer.succeed(this, {
    get: (_id: string) => Effect.succeed(Option.none()),
    findByCriteria: (_criteria, _skip, _limit) => Effect.succeed([]),
    create: (input) => Effect.succeed({ id: "test-id", ...input }),
    update: (_id, input) => Effect.succeed({ id: "test-id", ...input }),
    delete: (_id) => Effect.void,
    healthCheck: () => Effect.succeed(true)
  });
}`)

  return builder.toString()
}
