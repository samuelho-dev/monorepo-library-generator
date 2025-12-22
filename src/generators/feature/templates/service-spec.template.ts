/**
 * Service Spec Template
 *
 * Generates server/service.spec.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/service-spec-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate server/service.spec.ts file for feature library
 *
 * Creates test suite using @effect/vitest for proper resource management.
 */
export function generateServiceSpecFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, propertyName } = options;

  // Add file header with testing pattern comparison
  builder.addFileHeader({
    title: `${className}Service Tests`,
    description: `Uses @effect/vitest for Effect-based testing with proper resource management.

TESTING PATTERN COMPARISON:
❌ Old Pattern (Don't use):
   - await Effect.runPromise(program.pipe(Effect.provide(TestLayer)))
   - Manual Effect.runPromise calls
   - No automatic scope management

✅ New Pattern (Use this):
   - it.scoped() from @effect/vitest
   - Automatic resource cleanup
   - Better error messages
   - Simpler syntax

See: https://effect.website/docs/guides/testing/vitest`,
  });

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Option'] },
    { from: '@effect/vitest', imports: ['describe', 'expect'] },
    { from: '@effect/vitest', imports: ['it'] },
    { from: './service', imports: [`${className}Service`] },
  ]);
  builder.addBlankLine();

  // Add Layer.fresh documentation
  builder.addRaw(`/**`);
  builder.addRaw(` * LAYER ISOLATION WITH Layer.fresh`);
  builder.addRaw(` * ================================`);
  builder.addRaw(` * All test layers use Layer.fresh for test isolation.`);
  builder.addRaw(` *`);
  builder.addRaw(` * ✅ Layer.fresh ensures each test gets a fresh layer instance`);
  builder.addRaw(` * ✅ Prevents state leakage between tests (critical for repositories)`);
  builder.addRaw(` * ✅ Minimal performance overhead (1-5ms per test)`);
  builder.addRaw(` *`);
  builder.addRaw(` * Pattern: Effect.provide(Layer.fresh(ServiceName.Test))`);
  builder.addRaw(` *`);
  builder.addRaw(` * See: https://effect.website/docs/guides/testing/vitest#layer-fresh`);
  builder.addRaw(` */`);
  builder.addBlankLine();

  // Add test suite
  builder.addRaw(`describe("${className}Service", () => {`);
  builder.addBlankLine();

  // Test with default layer
  builder.addRaw(`  // ==========================================================================
  // Test with Default Test Layer
  // ==========================================================================
  //
  // PATTERN: Use it.scoped() with ${className}Service.Test layer
  // The service is automatically provided and cleaned up after test
  //
  it.scoped("should create and retrieve ${propertyName}", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Create a new ${propertyName}
      const created = yield* service.create({ name: "Test ${className}" });
      expect(created).toBeDefined();

      // Verify it can be retrieved
      const result = yield* service.get((created as { id: string }).id);
      expect(Option.isSome(result)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))
  );

  it.scoped("should list ${propertyName}s with pagination", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Create some test data
      yield* service.create({ name: "First ${className}" });
      yield* service.create({ name: "Second ${className}" });

      // List with pagination
      const items = yield* service.findByCriteria({}, 0, 10);
      expect(items.length).toBeGreaterThan(0);

      // Count should match
      const count = yield* service.count({});
      expect(count).toBeGreaterThan(0);
    }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))
  );

  it.scoped("should update ${propertyName}", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Create and update
      const created = yield* service.create({ name: "Original" });
      const id = (created as { id: string }).id;

      const updated = yield* service.update(id, { name: "Updated" });
      expect(Option.isSome(updated)).toBe(true);
    }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))
  );

  it.scoped("should delete ${propertyName}", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Create and delete
      const created = yield* service.create({ name: "ToDelete" });
      const id = (created as { id: string }).id;

      yield* service.delete(id);

      // Verify exists returns false
      const exists = yield* service.exists(id);
      expect(exists).toBe(false);
    }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))
  );`);
  builder.addBlankLine();

  // Test with mocked dependencies
  builder.addRaw(`  // ==========================================================================
  // Test with Mocked Dependencies
  // ==========================================================================
  //
  // PATTERN: Create inline mocks using Layer.succeed
  // Compose mock layers with service layer for testing
  //
  // Example: Test with mocked repository
  // it.scoped("should handle repository errors", () =>
  //   Effect.gen(function* () {
  //     const service = yield* ${className}Service;
  //
  //     const result = yield* service.get("nonexistent-id").pipe(
  //       Effect.flip, // Convert success to failure for error testing
  //       Effect.option // Catch error as Option
  //     );
  //
  //     expect(Option.isSome(result)).toBe(true);
  //   }).pipe(
  //     Effect.provide(${className}Service.Live),
  //     Effect.provide(Layer.fresh(
  //       Layer.succeed(${className}Repository, {
  //         findById: () => Effect.fail(new RepositoryError()),
  //       })
  //     ))
  //   )
  // );`);
  builder.addBlankLine();

  // Test with custom assertions
  builder.addRaw(`  // ==========================================================================
  // Test with Custom Assertions
  // ==========================================================================
  //
  // PATTERN: Use Effect.gen for complex test logic
  // Yield service operations and make assertions inline
  //
  it.scoped("service methods should be defined", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Verify core service methods exist
      expect(service.get).toBeDefined();
      expect(service.findByCriteria).toBeDefined();
      expect(service.count).toBeDefined();
      expect(service.create).toBeDefined();
      expect(service.update).toBeDefined();
      expect(service.delete).toBeDefined();
      expect(service.exists).toBeDefined();
    }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))
  );`);
  builder.addBlankLine();

  // Test with multiple services
  builder.addRaw(`  // ==========================================================================
  // Test with Multiple Services
  // ==========================================================================
  //
  // PATTERN: Compose multiple test layers
  // Test service interactions with other services
  //
  // Example: Test orchestration between services
  // it.scoped("should orchestrate with other services", () =>
  //   Effect.gen(function* () {
  //     const ${propertyName}Svc = yield* ${className}Service;
  //     const authService = yield* AuthService;
  //
  //     // Test service interaction
  //     const items = yield* ${propertyName}Svc.findByCriteria({}, 0, 10);
  //
  //     // Make assertions
  //     expect(items).toBeDefined();
  //   }).pipe(
  //     Effect.provide(${className}Service.Live),
  //     Effect.provide(Layer.fresh(AuthService.Test)),
  //     Effect.provide(Layer.fresh(${className}Repository.Test))
  //   )
  // );`);
  builder.addBlankLine();

  // ========================================================================
  // TestClock Testing Patterns
  // ========================================================================
  builder.addRaw(`  // ==========================================================================`);
  builder.addRaw(`  // Time-Based Operations with TestClock`);
  builder.addRaw(`  // ==========================================================================`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // PATTERN: Use TestClock to control time in tests without waiting`);
  builder.addRaw(`  // @effect/vitest provides TestClock automatically with it.scoped`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // Example: Test operation with delay`);
  builder.addRaw(`  // it.scoped("should complete delayed operation", () =>`);
  builder.addRaw(`  //   Effect.gen(function* () {`);
  builder.addRaw(`  //     const service = yield* ${className}Service;`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     // Fork operation with delay`);
  builder.addRaw(`  //     const fiber = yield* Effect.fork(`);
  builder.addRaw(`  //       service.findByCriteria({}, 0, 10).pipe(Effect.delay("500 millis"))`);
  builder.addRaw(`  //     );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     // Advance test clock by 600ms`);
  builder.addRaw(`  //     yield* TestClock.adjust("600 millis");`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     // Verify operation completed`);
  builder.addRaw(`  //     const result = yield* Fiber.join(fiber);`);
  builder.addRaw(`  //     expect(result).toBeDefined();`);
  builder.addRaw(`  //   }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))`);
  builder.addRaw(`  // );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // Example: Test timeout handling`);
  builder.addRaw(`  // it.scoped("should handle timeouts correctly", () =>`);
  builder.addRaw(`  //   Effect.gen(function* () {`);
  builder.addRaw(`  //     const service = yield* ${className}Service;`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     const result = yield* service.findByCriteria({}, 0, 10).pipe(`);
  builder.addRaw(`  //       Effect.timeout("100 millis"),`);
  builder.addRaw(`  //       Effect.exit // Capture timeout`);
  builder.addRaw(`  //     );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     expect(Exit.isFailure(result)).toBe(true);`);
  builder.addRaw(`  //   }).pipe(Effect.provide(Layer.fresh(${className}Service.Test)))`);
  builder.addRaw(`  // );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // Example: Test retry with exponential backoff`);
  builder.addRaw(`  // it.scoped("should retry with backoff", () =>`);
  builder.addRaw(`  //   Effect.gen(function* () {`);
  builder.addRaw(`  //     let attempts = 0;`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     const FailingService = Layer.succeed(${className}Service, {`);
  builder.addRaw(`  //       get: () =>`);
  builder.addRaw(`  //         Effect.gen(function* () {`);
  builder.addRaw(`  //           attempts++;`);
  builder.addRaw(`  //           if (attempts < 3) {`);
  builder.addRaw(
    `  //             return yield* Effect.fail(new ${className}Error({ message: "Retry me" }));`,
  );
  builder.addRaw(`  //           }`);
  builder.addRaw(`  //           return Option.some({ id: "1" });`);
  builder.addRaw(`  //         }),`);
  builder.addRaw(`  //       findByCriteria: () => Effect.succeed([]),`);
  builder.addRaw(`  //       count: () => Effect.succeed(0),`);
  builder.addRaw(`  //       create: () => Effect.succeed({ id: "1" }),`);
  builder.addRaw(`  //       update: () => Effect.succeed(Option.some({ id: "1" })),`);
  builder.addRaw(`  //       delete: () => Effect.void,`);
  builder.addRaw(`  //       exists: () => Effect.succeed(false),`);
  builder.addRaw(`  //     });`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     const service = yield* ${className}Service;`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     const fiber = yield* Effect.fork(`);
  builder.addRaw(`  //       service.get("test-id").pipe(`);
  builder.addRaw(`  //         Effect.retry({`);
  builder.addRaw(`  //           schedule: Schedule.exponential("100 millis").pipe(`);
  builder.addRaw(`  //             Schedule.compose(Schedule.recurs(3))`);
  builder.addRaw(`  //           )`);
  builder.addRaw(`  //         })`);
  builder.addRaw(`  //       )`);
  builder.addRaw(`  //     );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     // Advance clock to trigger retries`);
  builder.addRaw(`  //     yield* TestClock.adjust("100 millis");  // 1st retry`);
  builder.addRaw(`  //     yield* TestClock.adjust("200 millis");  // 2nd retry`);
  builder.addRaw(`  //     yield* TestClock.adjust("400 millis");  // 3rd retry`);
  builder.addRaw(`  //`);
  builder.addRaw(`  //     const result = yield* Fiber.join(fiber);`);
  builder.addRaw(`  //     expect(Option.isSome(result)).toBe(true);`);
  builder.addRaw(`  //     expect(attempts).toBe(3);`);
  builder.addRaw(`  //   }).pipe(Effect.provide(Layer.fresh(FailingService)))`);
  builder.addRaw(`  // );`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // Required imports for TestClock tests:`);
  builder.addRaw(`  // import { Fiber, TestClock, Exit, Schedule } from "effect"`);
  builder.addRaw(`  //`);
  builder.addRaw(`  // See TESTING_PATTERNS.md "Testing with TestClock" for more examples.`);
  builder.addBlankLine();

  // Add TODO comments
  builder.addRaw(`  // TODO: Add more comprehensive tests for your service methods
  // - Test error handling paths
  // - Test different input scenarios
  // - Test service orchestration
  // - Test with mocked dependencies
});`);
  builder.addBlankLine();

  return builder.toString();
}
