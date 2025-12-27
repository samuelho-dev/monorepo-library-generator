import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"

/**
 * Auth Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @samuelho-dev/infra-auth
 */

/**
 * Test service tag for layer composition tests
 */
class AuthTestService extends Context.Tag("AuthTestService")<
  AuthTestService,
  {
    readonly getName: () => Effect.Effect<string>
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createAuthTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(AuthTestService, {
    getName: () => Effect.succeed("auth"),
    getConfig: () => Effect.succeed(config)
  })
}

describe("Auth Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("auth")
      }).pipe(Effect.provide(Layer.fresh(createAuthTestLayer()))))

    it.scoped("should provide configuration", () =>
      Effect.gen(function*() {
        const service = yield* AuthTestService
        const config = yield* service.getConfig()
        expect(config).toEqual({ timeout: 5000 })
      }).pipe(Effect.provide(Layer.fresh(createAuthTestLayer({ timeout: 5000 })))))
  })

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("auth")
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createAuthTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0"
              })
            )
          )
        )
      ))

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(AuthTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true })
      })

      return Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("overridden")
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)))
    })
  })

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(AuthTestService, {
        getName: () => Effect.succeed("sync-auth"),
        getConfig: () => Effect.succeed({})
      })

      return Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("sync-auth")
      }).pipe(Effect.provide(Layer.fresh(syncLayer)))
    })

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        AuthTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-auth"),
          getConfig: () => Effect.succeed({ async: true })
        }))
      )

      return Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("async-auth")
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))
    })

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false

      const scopedLayer = Layer.scoped(
        AuthTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true
            return {
              getName: () => Effect.succeed("scoped-auth"),
              getConfig: () => Effect.succeed({ scoped: true })
            }
          }),
          () => Effect.void
        )
      )

      return Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("scoped-auth")
        expect(initialized).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)))
    })
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0

      const countingLayer = Layer.effect(
        AuthTestService,
        Effect.sync(() => {
          callCount++
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount })
          }
        })
      )

      return Effect.gen(function*() {
        const service = yield* AuthTestService
        const name = yield* service.getName()
        expect(name).toBe("call-1")
        expect(callCount).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(countingLayer)))
    })
  })
})
