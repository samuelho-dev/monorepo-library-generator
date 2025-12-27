/**
 * Fragment Registry Service
 *
 * Effect-idiomatic service for fragment type registration and lookup.
 * Uses Context.Tag pattern with Layer-based dependency injection.
 *
 * @module monorepo-library-generator/templates/fragments/registry
 */

import { Context, Data, Effect, Layer, Option } from 'effect'
import type { SourceFile } from 'ts-morph'
import type { InterpolationError } from '../core/resolver'
import type { TemplateContext } from '../core/types'
import type {
  AnyFragmentConfig,
  FragmentConfig,
  FragmentDefinition,
  FragmentRegistryEntry,
  FragmentRenderer,
  InternalFragmentEntry
} from './types'

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error when fragment type is not found in registry
 */
export class FragmentNotFoundError extends Data.TaggedError('FragmentNotFoundError')<{
  readonly fragmentType: string
  readonly message: string
}> {
  static create(fragmentType: string) {
    return new FragmentNotFoundError({
      fragmentType,
      message: `Fragment type not found: ${fragmentType}`
    })
  }
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Fragment Registry Service Interface
 *
 * All methods return Effect<A, E, never> - no dependencies in R.
 */
interface FragmentRegistryImpl {
  /**
   * Register a fragment type
   */
  readonly register: <TConfig extends FragmentConfig>(
    type: string,
    renderer: FragmentRenderer<TConfig>,
    requiredImports?: ReadonlyArray<string>
  ) => Effect.Effect<void, never, never>

  /**
   * Get a fragment entry by type
   */
  readonly get: (
    type: string
  ) => Effect.Effect<Option.Option<FragmentRegistryEntry<FragmentConfig>>, never, never>

  /**
   * Check if a fragment type is registered
   */
  readonly has: (type: string) => Effect.Effect<boolean, never, never>

  /**
   * Get all registered fragment types
   */
  readonly getTypes: () => Effect.Effect<ReadonlyArray<string>, never, never>

  /**
   * Render a fragment definition
   */
  readonly render: (
    sourceFile: SourceFile,
    definition: FragmentDefinition<AnyFragmentConfig>,
    context: TemplateContext
  ) => Effect.Effect<void, FragmentNotFoundError | InterpolationError, never>

  /**
   * Render multiple fragments
   */
  readonly renderAll: (
    sourceFile: SourceFile,
    definitions: ReadonlyArray<FragmentDefinition<AnyFragmentConfig>>,
    context: TemplateContext
  ) => Effect.Effect<void, FragmentNotFoundError | InterpolationError, never>

  /**
   * Get all required imports for a set of fragments
   */
  readonly getRequiredImports: (
    definitions: ReadonlyArray<FragmentDefinition<AnyFragmentConfig>>
  ) => Effect.Effect<ReadonlyArray<string>, never, never>
}

// ============================================================================
// Service Tag
// ============================================================================

/**
 * Fragment Registry Service Tag
 *
 * Usage:
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const registry = yield* FragmentRegistry
 *   yield* registry.register("myFragment", renderer)
 *   yield* registry.render(sourceFile, definition, context)
 * })
 *
 * // Provide the layer
 * program.pipe(Effect.provide(FragmentRegistry.Live))
 * ```
 */
export class FragmentRegistry extends Context.Tag('FragmentRegistry')<
  FragmentRegistry,
  FragmentRegistryImpl
>() {
  /**
   * Live implementation with internal Map storage
   */
  static readonly Live: Layer.Layer<FragmentRegistry> = Layer.sync(FragmentRegistry, () => {
    // Capture entries Map at layer construction
    // Use InternalFragmentEntry to avoid generic variance issues
    const entries = new Map<string, InternalFragmentEntry>()

    return {
      register: (type, renderer, requiredImports = []) =>
        Effect.sync(() => {
          // Store with broader type - type safety ensured by fragment type string
          entries.set(type, {
            type,
            renderer,
            requiredImports
          })
        }),

      get: (type) =>
        Effect.sync(() => {
          const entry = entries.get(type)
          return entry ? Option.some(entry) : Option.none()
        }),

      has: (type) => Effect.sync(() => entries.has(type)),

      getTypes: () => Effect.sync(() => Array.from(entries.keys())),

      render: (sourceFile, definition, context) =>
        Effect.gen(function* () {
          const entry = entries.get(definition.type)

          if (!entry) {
            return yield* Effect.fail(FragmentNotFoundError.create(definition.type))
          }

          yield* entry.renderer(sourceFile, definition.config, context)
        }),

      renderAll: (sourceFile, definitions, context) =>
        Effect.gen(function* () {
          for (const definition of definitions) {
            // Check condition if present
            if (definition.condition) {
              const conditionValue = context[definition.condition]
              if (!conditionValue) continue
            }

            const entry = entries.get(definition.type)

            if (!entry) {
              return yield* Effect.fail(FragmentNotFoundError.create(definition.type))
            }

            yield* entry.renderer(sourceFile, definition.config, context)
          }
        }),

      getRequiredImports: (definitions) =>
        Effect.sync(() => {
          const imports = new Set<string>()

          for (const definition of definitions) {
            const entry = entries.get(definition.type)
            if (entry) {
              for (const imp of entry.requiredImports) {
                imports.add(imp)
              }
            }
          }

          return Array.from(imports)
        })
    }
  })

  /**
   * Test implementation with isolated state
   *
   * Creates a fresh Map instance per test to prevent test pollution.
   */
  static readonly Test: Layer.Layer<FragmentRegistry> = Layer.sync(FragmentRegistry, () => {
    // Fresh Map per test - isolated from Live
    // Use InternalFragmentEntry to avoid generic variance issues
    const entries = new Map<string, InternalFragmentEntry>()

    return {
      register: (type, renderer, requiredImports = []) =>
        Effect.sync(() => {
          // Store with broader type - type safety ensured by fragment type string
          entries.set(type, {
            type,
            renderer,
            requiredImports
          })
        }),

      get: (type) =>
        Effect.sync(() => {
          const entry = entries.get(type)
          return entry ? Option.some(entry) : Option.none()
        }),

      has: (type) => Effect.sync(() => entries.has(type)),

      getTypes: () => Effect.sync(() => Array.from(entries.keys())),

      render: (sourceFile, definition, context) =>
        Effect.gen(function* () {
          const entry = entries.get(definition.type)

          if (!entry) {
            return yield* Effect.fail(FragmentNotFoundError.create(definition.type))
          }

          yield* entry.renderer(sourceFile, definition.config, context)
        }),

      renderAll: (sourceFile, definitions, context) =>
        Effect.gen(function* () {
          for (const definition of definitions) {
            if (definition.condition) {
              const conditionValue = context[definition.condition]
              if (!conditionValue) continue
            }

            const entry = entries.get(definition.type)

            if (!entry) {
              return yield* Effect.fail(FragmentNotFoundError.create(definition.type))
            }

            yield* entry.renderer(sourceFile, definition.config, context)
          }
        }),

      getRequiredImports: (definitions) =>
        Effect.sync(() => {
          const imports = new Set<string>()

          for (const definition of definitions) {
            const entry = entries.get(definition.type)
            if (entry) {
              for (const imp of entry.requiredImports) {
                imports.add(imp)
              }
            }
          }

          return Array.from(imports)
        })
    }
  })
}
