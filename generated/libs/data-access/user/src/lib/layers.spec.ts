/**
 * User Layers Tests
 *
 * Tests verify Effect layer composition and dependency injection setup.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test layer composition (do layers wire up correctly?)
- Use it.scoped for layer tests (they need Scope)
- Create inline test layers with Layer.succeed
- Focus on layer mechanics, not business logic
 *
 * @module @myorg/data-access-user
 */

import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";

/**
 * Test service tag for layer composition tests
 */
class UserTestService extends Context.Tag("UserTestService")<
  UserTestService,
  {
    readonly getValue: () => Effect.Effect<string>;
    readonly setValue: (value: string) => Effect.Effect<void>;
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createUserTestLayer(initialValue: string) {
  let value = initialValue;

  return Layer.succeed(UserTestService, {
    getValue: () => Effect.sync(() => value),
    setValue: (newValue: string) =>
      Effect.sync(() => {
        value = newValue;
      }),
  });
}

describe("User Layers", () => {
  describe("Layer Composition", () => {
    it.scoped("should create and provide a layer successfully", () =>
      Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("initial");
      }).pipe(Effect.provide(Layer.fresh(createUserTestLayer("initial")))),
    );

    it.scoped("should compose multiple layers", () =>
      Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("composed");
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createUserTestLayer("composed"),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0",
              }),
            ),
          ),
        ),
      ),
    );

    it.scoped("should allow layer to be overridden", () =>
      Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("overridden");
      }).pipe(Effect.provide(Layer.fresh(createUserTestLayer("overridden")))),
    );
  });

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () =>
      Effect.gen(function* () {
        const service = yield* UserTestService;
        const initial = yield* service.getValue();
        expect(initial).toBe("isolated");

        yield* service.setValue("modified");
        const modified = yield* service.getValue();
        expect(modified).toBe("modified");
      }).pipe(Effect.provide(Layer.fresh(createUserTestLayer("isolated")))),
    );

    it.scoped("should not see modifications from other tests", () =>
      Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("fresh");
      }).pipe(Effect.provide(Layer.fresh(createUserTestLayer("fresh")))),
    );
  });

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(UserTestService, {
        getValue: () => Effect.succeed("sync-value"),
        setValue: () => Effect.void,
      });

      return Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("sync-value");
      }).pipe(Effect.provide(Layer.fresh(syncLayer)));
    });

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        UserTestService,
        Effect.sync(() => ({
          getValue: () => Effect.succeed("async-value"),
          setValue: () => Effect.void,
        })),
      );

      return Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("async-value");
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)));
    });
  });

  describe("Layer Memoization", () => {
    it.scoped("should track initialization count", () => {
      let initCount = 0;

      const countingLayer = Layer.effect(
        UserTestService,
        Effect.sync(() => {
          initCount++;
          return {
            getValue: () => Effect.succeed(`count-${initCount}`),
            setValue: () => Effect.void,
          };
        }),
      );

      return Effect.gen(function* () {
        const service = yield* UserTestService;
        const value = yield* service.getValue();
        expect(value).toBe("count-1");
        expect(initCount).toBe(1);
      }).pipe(Effect.provide(Layer.fresh(countingLayer)));
    });
  });
});
