/**
 * Data Access Layers Spec Template
 *
 * Generates layers.spec.ts file for data-access libraries with working baseline tests.
 *
 * @module monorepo-library-generator/data-access/layers-spec-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { DataAccessTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

/**
 * Generate layers.spec.ts file for data-access library
 *
 * Creates test file with working baseline tests including:
 * - Layer composition tests
 * - Layer isolation tests
 * - Layer type tests (succeed, effect)
 * - Layer memoization tests
 */
export function generateLayersSpecFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Layers Tests`,
    description: `Tests verify Effect layer composition and dependency injection setup.
Uses @effect/vitest with it.scoped for resource management.

Testing Guidelines:
- Test layer composition (do layers wire up correctly?)
- Use it.scoped for layer tests (they need Scope)
- Create inline test layers with Layer.succeed
- Focus on layer mechanics, not business logic`,
    module: `${scope}/data-access-${fileName}`
  })

  builder.addImports([
    { from: '@effect/vitest', imports: ['describe', 'expect', 'it'] },
    { from: 'effect', imports: ['Context', 'Effect', 'Layer'] }
  ])

  builder.addRaw(`
/**
 * Test service tag for layer composition tests
 */
class ${className}TestService extends Context.Tag("${className}TestService")<
  ${className}TestService,
  {
    readonly getValue: () => Effect.Effect<string>
    readonly setValue: (value: string) => Effect.Effect<void>
  }
>() {}

/**
 * Creates a test layer with configurable behavior
 */
function create${className}TestLayer(initialValue: string) {
  let value = initialValue

  return Layer.succeed(${className}TestService, {
    getValue: () => Effect.sync(() => value),
    setValue: (newValue: string) =>
      Effect.sync(() => {
        value = newValue
      })
  })
}

describe("${className} Layers", () => {
  describe("Layer Composition", () => {
    it.scoped("should create and provide a layer successfully", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("initial")
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer("initial")))))

    it.scoped("should compose multiple layers", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("composed")
      }).pipe(
        Effect.provide(
          Layer.fresh(
            Layer.merge(
              create${className}TestLayer("composed"),
              Layer.succeed(Context.GenericTag<{ version: string }>("Version"), {
                version: "1.0.0"
              })
            )
          )
        )
      ))

    it.scoped("should allow layer to be overridden", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("overridden")
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer("overridden")))))
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests with Layer.fresh", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const initial = yield* service.getValue()
        expect(initial).toBe("isolated")

        yield* service.setValue("modified")
        const modified = yield* service.getValue()
        expect(modified).toBe("modified")
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer("isolated")))))

    it.scoped("should not see modifications from other tests", () =>
      Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("fresh")
      }).pipe(Effect.provide(Layer.fresh(create${className}TestLayer("fresh")))))
  })

  describe("Layer Types", () => {
    it.scoped("should work with Layer.succeed for synchronous initialization", () => {
      const syncLayer = Layer.succeed(${className}TestService, {
        getValue: () => Effect.succeed("sync-value"),
        setValue: () => Effect.void
      })

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("sync-value")
      }).pipe(Effect.provide(Layer.fresh(syncLayer)))
    })

    it.scoped("should work with Layer.effect for async initialization", () => {
      const asyncLayer = Layer.effect(
        ${className}TestService,
        Effect.sync(() => ({
          getValue: () => Effect.succeed("async-value"),
          setValue: () => Effect.void
        }))
      )

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("async-value")
      }).pipe(Effect.provide(Layer.fresh(asyncLayer)))
    })
  })

  describe("Layer Memoization", () => {
    it.scoped("should track initialization count", () => {
      let initCount = 0

      const countingLayer = Layer.effect(
        ${className}TestService,
        Effect.sync(() => {
          initCount++
          return {
            getValue: () => Effect.succeed(\`count-\${initCount}\`),
            setValue: () => Effect.void
          }
        })
      )

      return Effect.gen(function*() {
        const service = yield* ${className}TestService
        const value = yield* service.getValue()
        expect(value).toBe("count-1")
        expect(initCount).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(countingLayer)))
    })
  })
})
`)

  return builder.toString()
}
