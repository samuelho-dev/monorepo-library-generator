/**
 * Fragment Registry
 *
 * Central registry for all fragment types.
 * Fragments are looked up by type and rendered with their config.
 *
 * @module monorepo-library-generator/templates/fragments/registry
 */

import { Data, Effect, Option } from "effect"
import type { SourceFile } from "ts-morph"
import type { InterpolationError } from "../core/resolver"
import type { TemplateContext } from "../core/types"
import type {
  AnyFragmentConfig,
  FragmentConfig,
  FragmentDefinition,
  FragmentRegistryEntry,
  FragmentRenderer
} from "./types"

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error when fragment type is not found in registry
 */
export class FragmentNotFoundError extends Data.TaggedError("FragmentNotFoundError")<{
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
// Fragment Registry
// ============================================================================

/**
 * Fragment Registry
 *
 * Manages fragment type registration and lookup.
 */
export class FragmentRegistry {
  private readonly entries: Map<string, FragmentRegistryEntry<FragmentConfig>> = new Map()

  /**
   * Register a fragment type
   */
  register<TConfig extends FragmentConfig>(
    type: string,
    renderer: FragmentRenderer<TConfig>,
    requiredImports: ReadonlyArray<string> = []
  ): this {
    this.entries.set(type, {
      type,
      renderer: renderer as FragmentRenderer<FragmentConfig>,
      requiredImports
    })
    return this
  }

  /**
   * Get a fragment entry by type
   */
  get(type: string): Option.Option<FragmentRegistryEntry<FragmentConfig>> {
    const entry = this.entries.get(type)
    return entry ? Option.some(entry) : Option.none()
  }

  /**
   * Check if a fragment type is registered
   */
  has(type: string): boolean {
    return this.entries.has(type)
  }

  /**
   * Get all registered fragment types
   */
  getTypes(): ReadonlyArray<string> {
    return Array.from(this.entries.keys())
  }

  /**
   * Render a fragment definition
   */
  render(
    sourceFile: SourceFile,
    definition: FragmentDefinition<AnyFragmentConfig>,
    context: TemplateContext
  ): Effect.Effect<void, FragmentNotFoundError | InterpolationError> {
    return Effect.gen(this, function*() {
      const entry = this.get(definition.type)

      if (Option.isNone(entry)) {
        return yield* Effect.fail(FragmentNotFoundError.create(definition.type))
      }

      yield* entry.value.renderer(sourceFile, definition.config, context)
    })
  }

  /**
   * Render multiple fragments
   */
  renderAll(
    sourceFile: SourceFile,
    definitions: ReadonlyArray<FragmentDefinition<AnyFragmentConfig>>,
    context: TemplateContext
  ): Effect.Effect<void, FragmentNotFoundError | InterpolationError> {
    return Effect.gen(this, function*() {
      for (const definition of definitions) {
        // Check condition if present
        if (definition.condition) {
          const conditionValue = context[definition.condition]
          if (!conditionValue) continue
        }

        yield* this.render(sourceFile, definition, context)
      }
    })
  }

  /**
   * Get all required imports for a set of fragments
   */
  getRequiredImports(definitions: ReadonlyArray<FragmentDefinition<AnyFragmentConfig>>): ReadonlyArray<string> {
    const imports = new Set<string>()

    for (const definition of definitions) {
      const entry = this.get(definition.type)
      if (Option.isSome(entry)) {
        for (const imp of entry.value.requiredImports) {
          imports.add(imp)
        }
      }
    }

    return Array.from(imports)
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

let defaultRegistry: FragmentRegistry | null = null

/**
 * Get the default fragment registry
 *
 * Creates the registry on first call and registers all built-in fragments.
 */
export function getFragmentRegistry(): FragmentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new FragmentRegistry()
    // Built-in fragments are registered by the fragment modules when imported
  }
  return defaultRegistry
}

/**
 * Create a fresh fragment registry
 *
 * Useful for testing or isolated contexts.
 */
export function createFragmentRegistry(): FragmentRegistry {
  return new FragmentRegistry()
}

/**
 * Register a fragment on the default registry
 */
export function registerFragment<TConfig extends FragmentConfig>(
  type: string,
  renderer: FragmentRenderer<TConfig>,
  requiredImports: ReadonlyArray<string> = []
): void {
  getFragmentRegistry().register(type, renderer, requiredImports)
}
