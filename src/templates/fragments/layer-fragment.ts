/**
 * Layer Fragment
 *
 * Fragment renderer for Effect Layer definitions.
 * Generates type-safe layer constants with composition support.
 *
 * @module monorepo-library-generator/templates/fragments/layer-fragment
 */

import { Effect } from 'effect'
import type { SourceFile } from 'ts-morph'
import { interpolateSync } from '../core/resolver'
import type { TemplateContext } from '../core/types'
import type { LayerFragmentConfig } from './types'

// ============================================================================
// Layer Fragment Renderer
// ============================================================================

/**
 * Render a Layer fragment
 *
 * Generates a Layer constant with optional composition.
 */
export function renderLayerFragment(
  sourceFile: SourceFile,
  config: LayerFragmentConfig,
  context: TemplateContext
) {
  return Effect.sync(() => {
    const name = interpolateSync(config.name, context)
    const serviceTag = interpolateSync(config.serviceTag, context)
    const implementation = interpolateSync(config.implementation, context)

    const statements: Array<string> = []

    // Add JSDoc if provided
    if (config.jsdoc) {
      statements.push(`/**\n * ${interpolateSync(config.jsdoc, context)}\n */`)
    }

    // Build layer expression
    let layerExpr = buildLayerExpression(config.layerType, serviceTag, implementation)

    // Apply composition if specified
    if (config.composition) {
      layerExpr = applyComposition(layerExpr, config.composition, context)
    }

    // Add export
    const exportKeyword = config.exported !== false ? 'export ' : ''
    statements.push(`${exportKeyword}const ${name} = ${layerExpr}`)

    // Add to source file
    sourceFile.addStatements(statements.join('\n'))
  })
}

/**
 * Build the layer expression based on type
 */
function buildLayerExpression(
  layerType: LayerFragmentConfig['layerType'],
  serviceTag: string,
  implementation: string
) {
  switch (layerType) {
    case 'effect':
      return `Layer.effect(${serviceTag}, ${implementation})`
    case 'sync':
      return `Layer.sync(${serviceTag}, () => ${implementation})`
    case 'scoped':
      return `Layer.scoped(${serviceTag}, ${implementation})`
    case 'succeed':
      return `Layer.succeed(${serviceTag}, ${implementation})`
    case 'suspend':
      return `Layer.suspend(() => Layer.succeed(${serviceTag}, ${implementation}))`
    default:
      return `Layer.succeed(${serviceTag}, ${implementation})`
  }
}

/**
 * Apply layer composition
 */
function applyComposition(
  baseExpr: string,
  composition: NonNullable<LayerFragmentConfig['composition']>,
  context: TemplateContext
) {
  let expr = baseExpr

  // Apply merge
  if (composition.merge && composition.merge.length > 0) {
    const layers = composition.merge.map((l) => interpolateSync(l, context)).join(', ')
    expr = `Layer.merge(${expr}, ${layers})`
  }

  // Apply provide
  if (composition.provide && composition.provide.length > 0) {
    const layers = composition.provide.map((l) => interpolateSync(l, context)).join(', ')
    expr = `${expr}.pipe(Layer.provide(${layers}))`
  }

  // Apply provideMerge
  if (composition.provideMerge && composition.provideMerge.length > 0) {
    const layers = composition.provideMerge.map((l) => interpolateSync(l, context)).join(', ')
    expr = `${expr}.pipe(Layer.provideMerge(${layers}))`
  }

  return expr
}

// ============================================================================
// Fragment Presets
// ============================================================================

/**
 * Create a live repository layer fragment
 */
export function liveRepositoryLayerFragment(
  className: string,
  options: {
    readonly dependencies?: ReadonlyArray<string>
    readonly implementation?: string
  } = {}
) {
  const serviceName = `${className}Repository`
  const implementation =
    options.implementation ??
    `{
    findById: (id) => Effect.gen(function*() {
      // TODO: Implement
      return Option.none()
    }),
    findAll: (filters, pagination, sort) => Effect.gen(function*() {
      // TODO: Implement
      return { items: [], total: 0, limit: 10, offset: 0, hasMore: false }
    }),
    count: (filters) => Effect.gen(function*() {
      // TODO: Implement
      return 0
    }),
    create: (input) => Effect.gen(function*() {
      // TODO: Implement
      return input as ${className}
    }),
    update: (id, input) => Effect.gen(function*() {
      // TODO: Implement
      return input as ${className}
    }),
    delete: (id) => Effect.gen(function*() {
      // TODO: Implement
    }),
    exists: (id) => Effect.gen(function*() {
      // TODO: Implement
      return false
    })
  }`

  return {
    name: `${serviceName}Live`,
    layerType: 'succeed',
    serviceTag: serviceName,
    implementation,
    dependencies: options.dependencies,
    jsdoc: `Live implementation of ${serviceName}`
  }
}

/**
 * Create a test repository layer fragment (in-memory)
 */
export function testRepositoryLayerFragment(className: string) {
  const serviceName = `${className}Repository`

  return {
    name: `${serviceName}Test`,
    layerType: 'sync',
    serviceTag: serviceName,
    implementation: `make${serviceName}InMemory()`,
    jsdoc: `Test implementation of ${serviceName} using in-memory store`
  }
}

/**
 * Create a live service layer fragment
 */
export function liveServiceLayerFragment(
  className: string,
  options: {
    readonly dependencies?: ReadonlyArray<string>
  } = {}
) {
  const serviceName = `${className}Service`
  const repoName = `${className}Repository`

  return {
    name: `${serviceName}Live`,
    layerType: 'effect',
    serviceTag: serviceName,
    implementation: `Effect.gen(function*() {
    const repo = yield* ${repoName}

    return {
      get: (id) => repo.findById(id).pipe(
        Effect.flatMap(Option.match({
          onNone: () => Effect.fail(${className}NotFoundRepositoryError.create(id)),
          onSome: Effect.succeed
        }))
      ),
      list: repo.findAll,
      create: repo.create,
      update: repo.update,
      delete: repo.delete
    }
  })`,
    dependencies: options.dependencies ?? [repoName],
    jsdoc: `Live implementation of ${serviceName}`
  }
}

/**
 * Create a composed application layer
 */
export function composedLayerFragment(
  name: string,
  options: {
    readonly serviceLayers: ReadonlyArray<string>
    readonly infrastructureLayer?: string
    readonly jsdoc?: string
  }
) {
  const mergeExpr =
    options.serviceLayers.length > 1
      ? `Layer.mergeAll(${options.serviceLayers.join(', ')})`
      : (options.serviceLayers[0] ?? 'Layer.empty')

  return {
    name,
    layerType: 'succeed',
    serviceTag: '',
    implementation: mergeExpr,
    composition: options.infrastructureLayer
      ? { provide: [options.infrastructureLayer] }
      : undefined,
    jsdoc: options.jsdoc ?? `Composed ${name} layer`
  }
}

/**
 * Create an infrastructure layer fragment
 */
export function infrastructureLayerFragment(
  name: string,
  services: ReadonlyArray<string>,
  options: {
    readonly variant?: 'Live' | 'Test' | 'Dev'
    readonly jsdoc?: string
  } = {}
) {
  const variant = options.variant ?? 'Live'
  const serviceRefs = services.map((s) => `${s}${variant}`).join(', ')

  return {
    name: `${name}${variant}`,
    layerType: 'succeed',
    serviceTag: '',
    implementation: `Layer.mergeAll(${serviceRefs})`,
    jsdoc: options.jsdoc ?? `${variant} infrastructure layer`
  }
}
