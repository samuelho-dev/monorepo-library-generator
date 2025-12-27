import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"

/**
 * Rpc Service Tests
 *
 * Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details
 *
 * @module @samuelho-dev/infra-rpc
 */

/**
 * Test service tag for layer composition tests
 */
class RpcTestService extends Context.Tag("RpcTestService")<
  RpcTestService,
  {
    readonly getName: () => Effect.Effect<string>
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function createRpcTestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(RpcTestService, {
    getName: () => Effect.succeed("rpc"),
    getConfig: () => Effect.succeed(config)
  })
}

describe("Rpc Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("rpc")
      }).pipe(Effect.provide(Layer.fresh(createRpcTestLayer()))))

    it.scoped("should provide configuration", () =>
      Effect.gen(function*() {
        const service = yield* RpcTestService
        const config = yield* service.getConfig()
        expect(config).toEqual({ timeout: 5000 })
      }).pipe(Effect.provide(Layer.fresh(createRpcTestLayer({ timeout: 5000 })))))
  })

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("rpc")
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              createRpcTestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0"
              })
            )
          )
        )
      ))

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(RpcTestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true })
      })

      return Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("overridden")
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)))
    })
  })

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(RpcTestService, {
        getName: () => Effect.succeed("sync-rpc"),
        getConfig: () => Effect.succeed({})
      })

      return Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("sync-rpc")
      }).pipe(Effect.provide(Layer.fresh(syncLayer)))
    })

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        RpcTestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-rpc"),
          getConfig: () => Effect.succeed({ async: true })
        }))
      )

      return Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("async-rpc")
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))
    })

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false

      const scopedLayer = Layer.scoped(
        RpcTestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true
            return {
              getName: () => Effect.succeed("scoped-rpc"),
              getConfig: () => Effect.succeed({ scoped: true })
            }
          }),
          () => Effect.void
        )
      )

      return Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("scoped-rpc")
        expect(initialized).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)))
    })
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0

      const countingLayer = Layer.effect(
        RpcTestService,
        Effect.sync(() => {
          callCount++
          return {
            getName: () => Effect.succeed(`call-${callCount}`),
            getConfig: () => Effect.succeed({ count: callCount })
          }
        })
      )

      return Effect.gen(function*() {
        const service = yield* RpcTestService
        const name = yield* service.getName()
        expect(name).toBe("call-1")
        expect(callCount).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(countingLayer)))
    })
  })
})
