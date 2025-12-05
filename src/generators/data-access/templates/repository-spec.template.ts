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
4. Transaction rollback behavior (if applicable)`,
    module: "@custom-repo/data-access"
  })

  // Add imports
  builder.addImports([
    { from: "vitest", imports: ["describe", "expect"] }
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
   *   }).pipe(Effect.provide(${className}RepositoryLive.pipe(Layer.provide(KyselyServiceMock))))
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
   *   }).pipe(Effect.provide(${className}RepositoryLive.pipe(Layer.provide(mockError))))
   * );
   */

  it("repository is defined", () => {
    // Basic smoke test - replace with actual repository tests
    expect(true).toBe(true);
  });
});
`)

  return builder.toString()
}
