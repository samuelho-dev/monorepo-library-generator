/**
 * Metrics Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @myorg/infra-metrics
 */

import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";

/**
 * Test service tag for layer composition tests
 */
class MetricsTestService extends Context.Tag("MetricsTestService")<
  MetricsTestService,
  {
    readonly getName: () => Effect.Effect<string>;
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>;
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createMetricsTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(MetricsTestService, {
    getName: () => Effect.succeed("metrics"),
    getConfig: () => Effect.succeed(config),
  });
}

describe("Metrics Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("metrics");
      }).pipe(Effect.provide(Layer.fresh(createMetricsTestLayer()))),
    );

    it.scoped("should provide configuration", () =>
      Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const config = yield* service.getConfig();
        expect(config).toEqual({ timeout: 5000 });
      }).pipe(Effect.provide(Layer.fresh(createMetricsTestLayer({ timeout: 5000 })))),
    );
  });

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("metrics");
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createMetricsTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0",
              }),
            ),
          ),
        ),
      ),
    );

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(MetricsTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true }),
      });

      return Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("overridden");
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)));
    });
  });

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(MetricsTestService, {
        getName: () => Effect.succeed("sync-metrics"),
        getConfig: () => Effect.succeed({}),
      });

      return Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("sync-metrics");
      }).pipe(Effect.provide(Layer.fresh(syncLayer)));
    });

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        MetricsTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-metrics"),
          getConfig: () => Effect.succeed({ async: true }),
        })),
      );

      return Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("async-metrics");
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)));
    });

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false;

      const scopedLayer = Layer.scoped(
        MetricsTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true;
            return {
              getName: () => Effect.succeed("scoped-metrics"),
              getConfig: () => Effect.succeed({ scoped: true }),
            };
          }),
          () => Effect.void,
        ),
      );

      return Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("scoped-metrics");
        expect(initialized).toBe(true);
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)));
    });
  });

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0;

      const countingLayer = Layer.effect(
        MetricsTestService,
        Effect.sync(() => {
          callCount++;
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount }),
          };
        }),
      );

      return Effect.gen(function* () {
        const service = yield* MetricsTestService;
        const name = yield* service.getName();
        expect(name).toBe("call-1");
        expect(callCount).toBe(1);
      }).pipe(Effect.provide(Layer.fresh(countingLayer)));
    });
  });
});
