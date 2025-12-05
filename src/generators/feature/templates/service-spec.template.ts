/**
 * Service Spec Template
 *
 * Generates server/service.spec.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/service-spec-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server/service.spec.ts file for feature library
 *
 * Creates test suite using @effect/vitest for proper resource management.
 */
export function generateServiceSpecFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, propertyName } = options

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

See: https://effect.website/docs/guides/testing/vitest`
  })

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect"] },
    { from: "@effect/vitest", imports: ["describe", "expect"] },
    { from: "@effect/vitest", imports: ["it"] },
    { from: "./service", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  // Add test suite
  builder.addRaw(`describe("${className}Service", () => {`)
  builder.addBlankLine()

  // Test with default layer
  builder.addRaw(`  // ==========================================================================
  // Test with Default Test Layer
  // ==========================================================================
  //
  // PATTERN: Use it.scoped() with ${className}Service.Test layer
  // The service is automatically provided and cleaned up after test
  //
  it.scoped("should execute exampleOperation successfully", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;
      yield* service.exampleOperation();
    }).pipe(Effect.provide(${className}Service.Test))
  );`)
  builder.addBlankLine()

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
  //     const result = yield* service.exampleOperation().pipe(
  //       Effect.flip, // Convert success to failure for error testing
  //       Effect.option // Catch error as Option
  //     );
  //
  //     expect(Option.isSome(result)).toBe(true);
  //   }).pipe(
  //     Effect.provide(${className}Service.Live),
  //     Effect.provide(
  //       Layer.succeed(UserRepository, {
  //         findById: () => Effect.fail(new RepositoryError()),
  //       })
  //     )
  //   )
  // );`)
  builder.addBlankLine()

  // Test with custom assertions
  builder.addRaw(`  // ==========================================================================
  // Test with Custom Assertions
  // ==========================================================================
  //
  // PATTERN: Use Effect.gen for complex test logic
  // Yield service operations and make assertions inline
  //
  it.scoped("exampleOperation should be defined", () =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Verify service method exists
      expect(service.exampleOperation).toBeDefined();
      expect(typeof service.exampleOperation).toBe("function");
    }).pipe(Effect.provide(${className}Service.Test))
  );`)
  builder.addBlankLine()

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
  //     const ${propertyName}Service = yield* ${className}Service;
  //     const authService = yield* AuthService;
  //
  //     // Test service interaction
  //     yield* ${propertyName}Service.exampleOperation();
  //
  //     // Make assertions
  //     expect(true).toBe(true);
  //   }).pipe(
  //     Effect.provide(${className}Service.Live),
  //     Effect.provide(AuthService.Test),
  //     Effect.provide(UserRepositoryTest)
  //   )
  // );`)
  builder.addBlankLine()

  // Add TODO comments
  builder.addRaw(`  // TODO: Add more comprehensive tests for your service methods
  // - Test error handling paths
  // - Test different input scenarios
  // - Test service orchestration
  // - Test with mocked dependencies
});`)
  builder.addBlankLine()

  return builder.toString()
}
