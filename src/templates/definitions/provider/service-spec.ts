/**
 * Provider Service Spec Template Definition
 *
 * Declarative template for generating lib/service.spec.ts in provider libraries.
 * Contains @effect/vitest tests for the provider service.
 *
 * @module monorepo-library-generator/templates/definitions/provider/service-spec
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Provider Service Spec Template Definition
 *
 * Generates a service.spec.ts file with:
 * - Service interface tests
 * - Layer composition tests
 * - Layer type tests (succeed, effect, scoped)
 * - Layer isolation tests
 */
export const providerServiceSpecTemplate: TemplateDefinition = {
  id: "provider/service-spec",
  meta: {
    title: "{className} Service Tests",
    description: `Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details`,
    module: "{scope}/provider-{fileName}"
  },
  imports: [
    { from: "@effect/vitest", items: ["describe", "expect", "it"] },
    { from: "effect", items: ["Context", "Effect", "Layer"] }
  ],
  sections: [
    // Test Service Tag
    {
      title: "Test Service Tag",
      content: {
        type: "raw",
        value: `/**
 * Test service tag for layer composition tests
 */
class {className}TestService extends Context.Tag("{className}TestService")<
  {className}TestService,
  {
    readonly getName: () => Effect.Effect<string>
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>
  }
>() {}`
      }
    },
    // Test Layer Factory
    {
      content: {
        type: "raw",
        value: `/**
 * Creates a test layer with configurable behavior
 */
function create{className}TestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed({className}TestService, {
    getName: () => Effect.succeed("{fileName}"),
    getConfig: () => Effect.succeed(config)
  })
}`
      }
    },
    // Test Suite
    {
      title: "Test Suite",
      content: {
        type: "raw",
        value: `describe("{className} Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("{fileName}")
      }).pipe(Effect.provide(Layer.fresh(create{className}TestLayer()))))

    it.scoped("should provide configuration", () =>
      Effect.gen(function*() {
        const service = yield* {className}TestService
        const config = yield* service.getConfig()
        expect(config).toEqual({ timeout: 5000 })
      }).pipe(Effect.provide(Layer.fresh(create{className}TestLayer({ timeout: 5000 })))))
  })

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("{fileName}")
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              create{className}TestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0"
              })
            )
          )
        )
      ))

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed({className}TestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true })
      })

      return Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("overridden")
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)))
    })
  })

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed({className}TestService, {
        getName: () => Effect.succeed("sync-{fileName}"),
        getConfig: () => Effect.succeed({})
      })

      return Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("sync-{fileName}")
      }).pipe(Effect.provide(Layer.fresh(syncLayer)))
    })

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        {className}TestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-{fileName}"),
          getConfig: () => Effect.succeed({ async: true })
        }))
      )

      return Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("async-{fileName}")
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))
    })

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false

      const scopedLayer = Layer.scoped(
        {className}TestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true
            return {
              getName: () => Effect.succeed("scoped-{fileName}"),
              getConfig: () => Effect.succeed({ scoped: true })
            }
          }),
          () => Effect.void
        )
      )

      return Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("scoped-{fileName}")
        expect(initialized).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)))
    })
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0

      const countingLayer = Layer.effect(
        {className}TestService,
        Effect.sync(() => {
          callCount++
          return {
            getName: () => Effect.succeed(\`call-\${callCount}\`),
            getConfig: () => Effect.succeed({ count: callCount })
          }
        })
      )

      return Effect.gen(function*() {
        const service = yield* {className}TestService
        const name = yield* service.getName()
        expect(name).toBe("call-1")
        expect(callCount).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(countingLayer)))
    })
  })
})`
      }
    }
  ]
}

export default providerServiceSpecTemplate
