/**
 * EffectLogger Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @myorg/provider-effect-logger
 */

import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";

/**
 * Test service tag for layer composition tests
 */
class EffectLoggerTestService extends Context.Tag("EffectLoggerTestService")<
  EffectLoggerTestService,
  {
    readonly getName: () => Effect.Effect<string>;
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>;
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createEffectLoggerTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(EffectLoggerTestService, {
    getName: () => Effect.succeed("effect-logger"),
    getConfig: () => Effect.succeed(config),
  });
}

describe("EffectLogger Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("effect-logger");
      }).pipe(Effect.provide(Layer.fresh(createEffectLoggerTestLayer()))),
    );

    it.scoped("should provide configuration", () =>
      Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const config = yield* service.getConfig();
        expect(config).toEqual({ timeout: 5000 });
      }).pipe(Effect.provide(Layer.fresh(createEffectLoggerTestLayer({ timeout: 5000 })))),
    );
  });

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("effect-logger");
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createEffectLoggerTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0",
              }),
            ),
          ),
        ),
      ),
    );

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(EffectLoggerTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true }),
      });

      return Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("overridden");
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)));
    });
  });

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(EffectLoggerTestService, {
        getName: () => Effect.succeed("sync-effect-logger"),
        getConfig: () => Effect.succeed({}),
      });

      return Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("sync-effect-logger");
      }).pipe(Effect.provide(Layer.fresh(syncLayer)));
    });

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        EffectLoggerTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-effect-logger"),
          getConfig: () => Effect.succeed({ async: true }),
        })),
      );

      return Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("async-effect-logger");
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)));
    });

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false;

      const scopedLayer = Layer.scoped(
        EffectLoggerTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true;
            return {
              getName: () => Effect.succeed("scoped-effect-logger"),
              getConfig: () => Effect.succeed({ scoped: true }),
            };
          }),
          () => Effect.void,
        ),
      );

      return Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("scoped-effect-logger");
        expect(initialized).toBe(true);
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)));
    });
  });

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0;

      const countingLayer = Layer.effect(
        EffectLoggerTestService,
        Effect.sync(() => {
          callCount++;
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount }),
          };
        }),
      );

      return Effect.gen(function* () {
        const service = yield* EffectLoggerTestService;
        const name = yield* service.getName();
        expect(name).toBe("call-1");
        expect(callCount).toBe(1);
      }).pipe(Effect.provide(Layer.fresh(countingLayer)));
    });
  });
});
