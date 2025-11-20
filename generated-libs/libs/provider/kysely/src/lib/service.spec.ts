import { Kysely } from "./service";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vitest";
import type { KyselyError } from "./errors";

/**
 * Kysely Service Tests
 *
 * Tests verify that the provider correctly wraps the Kysely SDK with Effect patterns.
 * Uses @effect/vitest with minimal inline mocking for rapid iteration.
 *
 * Testing Guidelines:
 * - ✅ Test SDK wrapping (does the provider correctly wrap SDK methods?)
 * - ✅ Use it.effect for simple provider tests
 * - ✅ Create inline mocks with minimal test data
 * - ✅ Focus on error transformation and Effect integration
 * - ✅ Keep ALL tests in this ONE file
 *
 * - ❌ DON'T create separate mock-factories.ts files
 * - ❌ DON'T create separate test-layer.ts files
 * - ❌ DON'T test the external SDK itself (that's the SDK's responsibility)
 * - ❌ DON'T create complex mock objects matching full SDK types
 * - ❌ DON'T use manual Effect.runPromise (use it.effect instead)
 */


describe("Kysely", () => {
  /**
   * TODO: Implement tests for your Kysely service
   *
   * Example test pattern:
   *
   * it.effect("creates resource successfully", () =>
   *   Effect.gen(function* () {
   *     const service = yield* Kysely;
   *     const result = yield* service.createResource({ data: "test" });
   *     expect(result.id).toBeDefined();
   *   }).pipe(Effect.provide(Kysely.Live))
   * );
   *
   * it.effect("handles SDK errors correctly", () =>
   *   Effect.gen(function* () {
   *     const service = yield* Kysely;
   *     const result = yield* service.failingMethod().pipe(Effect.flip);
   *     expect(result._tag).toBe("KyselyError");
   *   }).pipe(Effect.provide(KyselyTest))
   * );
   */

  it.effect("service is defined", () =>
    Effect.gen(function* () {
      const service = yield* Kysely;
      expect(service).toBeDefined();
    }).pipe(Effect.provide(Kysely.Live))
  );
});
