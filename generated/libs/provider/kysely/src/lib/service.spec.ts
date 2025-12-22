/**
 * Kysely Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @myorg/provider-kysely
 */

import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";

/**
 * Test service tag for layer composition tests
 */
class KyselyTestService extends Context.Tag("KyselyTestService")<
  KyselyTestService,
  {
    readonly getName: () => Effect.Effect<string>;
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>;
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createKyselyTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(KyselyTestService, {
    getName: () => Effect.succeed("kysely"),
    getConfig: () => Effect.succeed(config),
  });
}

describe("Kysely Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("kysely");
      }).pipe(Effect.provide(Layer.fresh(createKyselyTestLayer()))),
    );

    it.scoped("should provide configuration", () =>
      Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const config = yield* service.getConfig();
        expect(config).toEqual({ timeout: 5000 });
      }).pipe(Effect.provide(Layer.fresh(createKyselyTestLayer({ timeout: 5000 })))),
    );
  });

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("kysely");
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createKyselyTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0",
              }),
            ),
          ),
        ),
      ),
    );

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(KyselyTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true }),
      });

      return Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("overridden");
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)));
    });
  });

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(KyselyTestService, {
        getName: () => Effect.succeed("sync-kysely"),
        getConfig: () => Effect.succeed({}),
      });

      return Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("sync-kysely");
      }).pipe(Effect.provide(Layer.fresh(syncLayer)));
    });

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        KyselyTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-kysely"),
          getConfig: () => Effect.succeed({ async: true }),
        })),
      );

      return Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("async-kysely");
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)));
    });

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false;

      const scopedLayer = Layer.scoped(
        KyselyTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true;
            return {
              getName: () => Effect.succeed("scoped-kysely"),
              getConfig: () => Effect.succeed({ scoped: true }),
            };
          }),
          () => Effect.void,
        ),
      );

      return Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("scoped-kysely");
        expect(initialized).toBe(true);
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)));
    });
  });

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0;

      const countingLayer = Layer.effect(
        KyselyTestService,
        Effect.sync(() => {
          callCount++;
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount }),
          };
        }),
      );

      return Effect.gen(function* () {
        const service = yield* KyselyTestService;
        const name = yield* service.getName();
        expect(name).toBe("call-1");
        expect(callCount).toBe(1);
      }).pipe(Effect.provide(Layer.fresh(countingLayer)));
    });
  });
});
