/**
 * Logging Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @myorg/infra-logging
 */

import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";

/**
 * Test service tag for layer composition tests
 */
class LoggingTestService extends Context.Tag("LoggingTestService")<
  LoggingTestService,
  {
    readonly getName: () => Effect.Effect<string>;
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>;
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createLoggingTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(LoggingTestService, {
    getName: () => Effect.succeed("logging"),
    getConfig: () => Effect.succeed(config),
  });
}

describe("Logging Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("logging");
      }).pipe(Effect.provide(Layer.fresh(createLoggingTestLayer()))),
    );

    it.scoped("should provide configuration", () =>
      Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const config = yield* service.getConfig();
        expect(config).toEqual({ timeout: 5000 });
      }).pipe(Effect.provide(Layer.fresh(createLoggingTestLayer({ timeout: 5000 })))),
    );
  });

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("logging");
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createLoggingTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0",
              }),
            ),
          ),
        ),
      ),
    );

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(LoggingTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true }),
      });

      return Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("overridden");
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)));
    });
  });

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(LoggingTestService, {
        getName: () => Effect.succeed("sync-logging"),
        getConfig: () => Effect.succeed({}),
      });

      return Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("sync-logging");
      }).pipe(Effect.provide(Layer.fresh(syncLayer)));
    });

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        LoggingTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-logging"),
          getConfig: () => Effect.succeed({ async: true }),
        })),
      );

      return Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("async-logging");
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)));
    });

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false;

      const scopedLayer = Layer.scoped(
        LoggingTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true;
            return {
              getName: () => Effect.succeed("scoped-logging"),
              getConfig: () => Effect.succeed({ scoped: true }),
            };
          }),
          () => Effect.void,
        ),
      );

      return Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("scoped-logging");
        expect(initialized).toBe(true);
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)));
    });
  });

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0;

      const countingLayer = Layer.effect(
        LoggingTestService,
        Effect.sync(() => {
          callCount++;
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount }),
          };
        }),
      );

      return Effect.gen(function* () {
        const service = yield* LoggingTestService;
        const name = yield* service.getName();
        expect(name).toBe("call-1");
        expect(callCount).toBe(1);
      }).pipe(Effect.provide(Layer.fresh(countingLayer)));
    });
  });
});
