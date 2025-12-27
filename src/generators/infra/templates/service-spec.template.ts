/**
 * Infra Service Spec Template
 *
 * Generates service.spec.ts file for infrastructure libraries with working baseline tests.
 *
 * @module monorepo-library-generator/infra/service-spec-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate service.spec.ts file for infra library
 *
 * Creates test file with working baseline tests including:
 * - Service interface tests (Context.Tag access)
 * - Layer composition tests (Live, Test, Dev layers)
 * - Error handling tests
 * - Configuration tests
 */
export function generateInfraServiceSpecFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Tests`,
    description: `Tests verify Effect service interface and layer composition.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test service interface (can we access the service?)
- Test layer composition (do layers provide the service correctly?)
- Use it.scoped for layer tests (they need Scope)
- Focus on service mechanics, not implementation details`,
    module: `${scope}/infra-${fileName}`
  })

  builder.addImports([
    { from: "@effect/vitest", imports: ["describe", "expect", "it"] },
    { from: "effect", imports: ["Context", "Effect", "Layer"] }
  ])

  builder.addRaw(`

/**
 * Test service tag for layer composition tests
 */
class ${className}TestService extends Context.Tag("${className}TestService")<
  ${className}TestService,
  {
    readonly getName: () => Effect.Effect<string>
    readonly getConfig: () => Effect.Effect<Record<string, unknown>>
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function create${className}TestLayer(config: Record<string, unknown> = {}) {
  return Layer.succeed(${className}TestService, {
    getName: () => Effect.succeed("${name}"),
    getConfig: () => Effect.succeed(config)
  })
}

describe("${className} Service", () => {
  describe("Service Interface", () => {
    it.scoped("should provide service through layer", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("${name}")
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer()))))

    it.scoped("should provide configuration", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const config = yield* service.getConfig()
        expect(config).toEqual({ timeout: 5000 })
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer({ timeout: 5000 })))))
  })

  describe("Layer Composition", () => {
    it.scoped("should compose with other layers", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("${name}")
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              create${className}TestLayer(),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0"
              })
            )
          )
        )
      ))

    it.scoped("should allow layer override", () => {
      const overrideLayer = Layer.succeed(${className}TestService, {
        getName: () => Effect.succeed("overridden"),
        getConfig: () => Effect.succeed({ custom: true })
      })

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("overridden")
      }).pipe(Effect.provide(Layer.fresh(overrideLayer)))
    })
  })

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(${className}TestService, {
        getName: () => Effect.succeed("sync-${name}"),
        getConfig: () => Effect.succeed({})
      })

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("sync-${name}")
      }).pipe(Effect.provide(Layer.fresh(syncLayer)))
    })

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        ${className}TestService,
        Effect.sync(() => ({
          getName: () => Effect.succeed("async-${name}"),
          getConfig: () => Effect.succeed({ async: true })
        }))
      )

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("async-${name}")
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))
    })

    it.scoped("should work with Layer.scoped for resource management", () => {
      let initialized = false

      const scopedLayer = Layer.scoped(
        ${className}TestService,
        Effect.acquireRelease(
          Effect.sync(() => {
            initialized = true
            return {
              getName: () => Effect.succeed("scoped-${name}"),
              getConfig: () => Effect.succeed({ scoped: true })
            }
          }),
          () => Effect.void
        )
      )

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("scoped-${name}")
        expect(initialized).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(scopedLayer)))
    })
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () => {
      let callCount = 0

      const countingLayer = Layer.effect(
        ${className}TestService,
        Effect.sync(() => {
          callCount++
          return {
            getName: () => Effect.succeed(\`call-\${callCount}\`),
            getConfig: () => Effect.succeed({ count: callCount })
          }
        })
      )

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const name = yield* service.getName()
        expect(name).toBe("call-1")
        expect(callCount).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(countingLayer)))
    })
  })
})
`)

  return builder.toString()
}
