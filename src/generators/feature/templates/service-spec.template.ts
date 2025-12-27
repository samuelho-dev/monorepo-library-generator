/**
 * Service Spec Template
 *
 * Generates server/service.spec.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/service-spec-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { FeatureTemplateOptions } from '../../../utils/types'

/**
 * Generate server/service.spec.ts file for feature library
 */
export function generateServiceSpecFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, propertyName } = options

  builder.addFileHeader({
    title: `${className}Service Tests`,
    description: `Uses @effect/vitest for Effect-based testing.

Uses ${className}Service.TestLayer which composes:
- ${className}Service.Live
- ${className}Repository.Live
- DatabaseService.Test (in-memory)`
  })

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Option'] },
    { from: '@effect/vitest', imports: ['describe', 'expect', 'it'] },
    { from: './service', imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  builder.addRaw(`/**
 * Test entity interface for ${className}
 * Matches the structure returned by service.create()
 */
interface ${className}TestEntity {
  readonly id: string
  readonly name: string
}

describe("${className}Service", () => {
  it.scoped("should create and retrieve ${propertyName}", () =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      const created: ${className}TestEntity = yield* service.create({ name: "Test ${className}" })
      expect(created).toBeDefined()

      const result = yield* service.get(created.id)
      expect(Option.isSome(result)).toBe(true)
    }).pipe(Effect.provide(Layer.fresh(${className}Service.TestLayer)))
  )

  it.scoped("should list ${propertyName}s with pagination", () =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      yield* service.create({ name: "First ${className}" })
      yield* service.create({ name: "Second ${className}" })

      const items = yield* service.findByCriteria({}, 0, 10)
      expect(items.length).toBeGreaterThan(0)

      const count = yield* service.count({})
      expect(count).toBeGreaterThan(0)
    }).pipe(Effect.provide(Layer.fresh(${className}Service.TestLayer)))
  )

  it.scoped("should update ${propertyName}", () =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      const created: ${className}TestEntity = yield* service.create({ name: "Original" })

      const updated = yield* service.update(created.id, { name: "Updated" })
      expect(Option.isSome(updated)).toBe(true)
    }).pipe(Effect.provide(Layer.fresh(${className}Service.TestLayer)))
  )

  it.scoped("should delete ${propertyName}", () =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      const created: ${className}TestEntity = yield* service.create({ name: "ToDelete" })

      yield* service.delete(created.id)

      const exists = yield* service.exists(created.id)
      expect(exists).toBe(false)
    }).pipe(Effect.provide(Layer.fresh(${className}Service.TestLayer)))
  )

  it.scoped("service methods should be defined", () =>
    Effect.gen(function*() {
      const service = yield* ${className}Service

      expect(service.get).toBeDefined()
      expect(service.findByCriteria).toBeDefined()
      expect(service.count).toBeDefined()
      expect(service.create).toBeDefined()
      expect(service.update).toBeDefined()
      expect(service.delete).toBeDefined()
      expect(service.exists).toBeDefined()
    }).pipe(Effect.provide(Layer.fresh(${className}Service.TestLayer)))
  )
})`)
  builder.addBlankLine()

  return builder.toString()
}
