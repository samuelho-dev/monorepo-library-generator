/**
 * Data Access Repository Spec Template
 *
 * Generates repository.spec.ts file for data-access libraries with test structure.
 *
 * @module monorepo-library-generator/data-access/repository-spec-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate repository.spec.ts file for data-access library
 *
 * Creates test file structure including:
 * - Test guidelines and patterns
 * - Mock setup examples
 * - Test structure with it.scoped
 */
export function generateRepositorySpecFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options

  // Add file header with testing guidelines
  builder.addFileHeader({
    title: `${className} Repository Tests`,
    description: `Tests verify that the repository correctly fulfills contract interface requirements.
Uses @effect/vitest with it.scoped for resource management and minimal inline mocking.

Testing Guidelines:
- ✅ Test repository behavior (does it fulfill the contract interface?)
- ✅ Use it.scoped for repository tests (they need Scope)
- ✅ Create inline mocks with Layer.succeed
- ✅ Focus on contract compliance, not implementation details
- ✅ Keep ALL tests in this ONE file

- ❌ DON'T create separate mock-factories.ts files
- ❌ DON'T create separate kysely-mocks.ts files
- ❌ DON'T test query builder implementation (Kysely handles this)
- ❌ DON'T test database connection logic (provider layer handles this)
- ❌ DON'T use manual Effect.runPromise (use it.scoped instead)

What to Test:
1. Contract fulfillment (verify all interface methods work)
2. Error transformation (database errors → repository errors)
3. Cache integration (hits, misses, invalidation if applicable)
4. Transaction rollback behavior (if applicable)

Layer Isolation:
- All tests use Layer.fresh for isolated in-memory storage
- Repositories often use Map/Set for test state - needs fresh instances
- Prevents test interference from accumulated state`,
    module: "@custom-repo/data-access"
  })

  // Add imports
  builder.addImports([
    { from: "@effect/vitest", imports: ["describe", "expect", "it"] },
    { from: "effect", imports: ["Effect", "Layer"] }
  ])
  builder.addBlankLine()

  // Add describe block with TODO examples
  builder.addRaw(`describe("${className} Repository", () => {
  /**
   * TODO: Implement tests for your repository
   *
   * Example: Mock Kysely layer inline
   *
   * const KyselyServiceMock = Layer.succeed(KyselyService, {
   *   db: {
   *     // Minimal mock - implement only what you need for your tests
   *     selectFrom: () => ({
   *       selectAll: () => ({
   *         where: () => ({
   *           executeTakeFirst: () =>
   *             Effect.succeed({
   *               id: "test-123",
   *               name: "Test Entity",
   *               createdAt: new Date(),
   *               updatedAt: new Date(),
   *             }),
   *         }),
   *       }),
   *     }),
   *   },
   * });
   *
   * Example: Test repository method with it.scoped
   *
   * it.scoped("findById returns entity when it exists", () =>
   *   Effect.gen(function* () {
   *     const repo = yield* ${className}Repository;
   *     const result = yield* repo.findById("test-123");
   *
   *     expect(Option.isSome(result)).toBe(true);
   *     if (Option.isSome(result)) {
   *       expect(result.value.id).toBe("test-123");
   *     }
   *   }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(KyselyServiceMock)))))
   * );
   *
   * Example: Test error handling
   *
   * it.scoped("findById handles database errors", () =>
   *   Effect.gen(function* () {
   *     const mockError = Layer.succeed(KyselyService, {
   *       db: {
   *         selectFrom: () => ({
   *           selectAll: () => ({
   *             where: () => ({
   *               executeTakeFirst: () =>
   *                 Effect.fail(new Error("Database connection failed")),
   *             }),
   *           }),
   *         }),
   *       },
   *     });
   *
   *     const repo = yield* ${className}Repository;
   *     const result = yield* repo.findById("test-123").pipe(Effect.flip);
   *
   *     expect(result._tag).toBe("${className}RepositoryError");
   *   }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(mockError)))))
   * );
   *
   * ==========================================================================
   * Time-Based Operations with TestClock
   * ==========================================================================
   *
   * PATTERN: Use TestClock to control time in tests without waiting
   * @effect/vitest provides TestClock automatically with it.scoped
   *
   * Example: Test repository operation with timeout
   *
   * it.scoped("findById should timeout for slow queries", () =>
   *   Effect.gen(function* () {
   *     const slowKysely = Layer.succeed(KyselyService, {
   *       db: {
   *         selectFrom: () => ({
   *           selectAll: () => ({
   *             where: () => ({
   *               executeTakeFirst: () =>
   *                 Effect.never.pipe(Effect.delay("1000 millis")), // Simulate slow query
   *             }),
   *           }),
   *         }),
   *       },
   *     });
   *
   *     const repo = yield* ${className}Repository;
   *
   *     const result = yield* repo.findById("test-123").pipe(
   *       Effect.timeout("500 millis"),
   *       Effect.exit
   *     );
   *
   *     expect(Exit.isFailure(result)).toBe(true);
   *   }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(slowKysely)))))
   * );
   *
   * Example: Test cache expiration with TestClock
   *
   * it.scoped("should refresh cache after TTL expires", () =>
   *   Effect.gen(function* () {
   *     let queryCount = 0;
   *
   *     const countingKysely = Layer.succeed(KyselyService, {
   *       db: {
   *         selectFrom: () => ({
   *           selectAll: () => ({
   *             where: () => ({
   *               executeTakeFirst: () =>
   *                 Effect.sync(() => {
   *                   queryCount++;
   *                   return { id: "test-123", name: \`Query \${queryCount}\` };
   *                 }),
   *             }),
   *           }),
   *         }),
   *       },
   *     });
   *
   *     const repo = yield* ${className}Repository;
   *
   *     // First query - cache miss
   *     const first = yield* repo.findById("test-123");
   *     expect(queryCount).toBe(1);
   *
   *     // Second query immediately - cache hit (if cached)
   *     const second = yield* repo.findById("test-123");
   *     expect(queryCount).toBe(1); // Still 1, cache was hit
   *
   *     // Advance clock past cache TTL
   *     yield* TestClock.adjust("11 minutes");
   *
   *     // Third query - cache expired, new query
   *     const third = yield* repo.findById("test-123");
   *     expect(queryCount).toBe(2); // Cache refreshed
   *   }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(countingKysely)))))
   * );
   *
   * Example: Test retry behavior with exponential backoff
   *
   * it.scoped("should retry failed queries with backoff", () =>
   *   Effect.gen(function* () {
   *     let attempts = 0;
   *
   *     const flakeyKysely = Layer.succeed(KyselyService, {
   *       db: {
   *         selectFrom: () => ({
   *           selectAll: () => ({
   *             where: () => ({
   *               executeTakeFirst: () =>
   *                 Effect.gen(function* () {
   *                   attempts++;
   *                   if (attempts < 3) {
   *                     return yield* Effect.fail(new Error("Temporary DB error"));
   *                   }
   *                   return { id: "test-123", name: "Success" };
   *                 }),
   *             }),
   *           }),
   *         }),
   *       },
   *     });
   *
   *     const repo = yield* ${className}Repository;
   *
   *     const fiber = yield* Effect.fork(
   *       repo.findById("test-123").pipe(
   *         Effect.retry({
   *           schedule: Schedule.exponential("100 millis").pipe(
   *             Schedule.compose(Schedule.recurs(3))
   *           )
   *         })
   *       )
   *     );
   *
   *     // Advance clock to trigger retries
   *     yield* TestClock.adjust("100 millis");  // 1st retry
   *     yield* TestClock.adjust("200 millis");  // 2nd retry
   *     yield* TestClock.adjust("400 millis");  // 3rd retry succeeds
   *
   *     const result = yield* Fiber.join(fiber);
   *     expect(Option.isSome(result)).toBe(true);
   *     expect(attempts).toBe(3);
   *   }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(flakeyKysely)))))
   * );
   *
   * Example: Test delayed connection initialization
   *
   * it.scoped("should handle delayed database connection", () =>
   *   Effect.gen(function* () {
   *     const delayedKysely = Layer.effect(
   *       KyselyService,
   *       Effect.gen(function* () {
   *         // Simulate connection delay
   *         yield* Effect.sleep("200 millis");
   *
   *         return {
   *           db: {
   *             selectFrom: () => ({
   *               selectAll: () => ({
   *                 where: () => ({
   *                   executeTakeFirst: () =>
   *                     Effect.succeed({ id: "test-123", name: "Connected" }),
   *                 }),
   *               }),
   *             }),
   *           },
   *         };
   *       })
   *     );
   *
   *     const fiber = yield* Effect.fork(
   *       Effect.gen(function* () {
   *         const repo = yield* ${className}Repository;
   *         return yield* repo.findById("test-123");
   *       }).pipe(Effect.provide(Layer.fresh(${className}RepositoryLive.pipe(Layer.provide(delayedKysely)))))
   *     );
   *
   *     // Advance clock to allow connection to establish
   *     yield* TestClock.adjust("300 millis");
   *
   *     const result = yield* Fiber.join(fiber);
   *     expect(Option.isSome(result)).toBe(true);
   *   })
   * );
   *
   * Required imports for TestClock tests:
   * import { Fiber, TestClock, Exit, Schedule } from "effect"
   *
   * See TESTING_PATTERNS.md "Testing with TestClock" for more examples.
   */

  it("repository is defined", () => {
    // Basic smoke test - replace with actual repository tests
    expect(true).toBe(true);
  });
});
`)

  return builder.toString()
}
