/**
 * Fragment Types
 *
 * Type definitions for the fragment system.
 * Fragments are reusable, composable template components.
 *
 * @module monorepo-library-generator/templates/fragments/types
 */

import type { Effect } from 'effect'
import type { SourceFile } from 'ts-morph'
import type { InterpolationError } from '../core/resolver'
import type { TemplateContext } from '../core/types'

// ============================================================================
// Fragment Configuration Types
// ============================================================================

/**
 * Base fragment configuration
 *
 * All fragments extend this interface with their specific config.
 */
export interface FragmentConfig {
  /** Fragment identifier for debugging/tracing */
  readonly id?: string

  /** Optional JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Error field definition for TaggedError fragments
 */
export interface ErrorField {
  /** Field name */
  readonly name: string

  /** TypeScript type */
  readonly type: string

  /** Whether field is optional */
  readonly optional?: boolean

  /** JSDoc comment for field */
  readonly jsdoc?: string
}

/**
 * Static method definition for error classes
 */
export interface ErrorStaticMethod {
  /** Method name (e.g., 'create', 'fromRaw') */
  readonly name: string

  /** Method parameters */
  readonly params: ReadonlyArray<{
    readonly name: string
    readonly type: string
    readonly optional?: boolean
  }>

  /** Method body code */
  readonly body: string
}

/**
 * TaggedError fragment configuration
 */
export interface TaggedErrorFragmentConfig extends FragmentConfig {
  /** Error class name (e.g., 'UserNotFoundError') */
  readonly className: string

  /** Tag name for Data.TaggedError (defaults to className) */
  readonly tagName?: string

  /** Error fields */
  readonly fields: ReadonlyArray<ErrorField>

  /** Static factory methods */
  readonly staticMethods?: ReadonlyArray<ErrorStaticMethod>

  /** Whether to export the class */
  readonly exported?: boolean
}

/**
 * Method parameter definition
 */
export interface MethodParam {
  /** Parameter name */
  readonly name: string

  /** TypeScript type */
  readonly type: string

  /** Whether parameter is optional */
  readonly optional?: boolean
}

/**
 * Service method definition
 */
export interface ServiceMethod {
  /** Method name */
  readonly name: string

  /** Method parameters */
  readonly params: ReadonlyArray<MethodParam>

  /** Return type (the full Effect.Effect<...> type) */
  readonly returnType: string

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Static layer definition for Context.Tag classes
 */
export interface StaticLayer {
  /** Layer name (e.g., 'Live', 'Test') */
  readonly name: string

  /** Layer implementation code */
  readonly implementation: string

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Context.Tag fragment configuration
 */
export interface ContextTagFragmentConfig extends FragmentConfig {
  /** Service class name (e.g., 'UserRepository') */
  readonly serviceName: string

  /** Tag identifier string (defaults to serviceName) */
  readonly tagIdentifier?: string

  /** Service methods */
  readonly methods: ReadonlyArray<ServiceMethod>

  /** Static layer definitions */
  readonly staticLayers?: ReadonlyArray<StaticLayer>

  /** Whether to export the class */
  readonly exported?: boolean
}

/**
 * Schema field definition
 */
export interface SchemaField {
  /** Field name */
  readonly name: string

  /** Schema expression (e.g., 'Schema.String') */
  readonly schema: string

  /** Whether field is optional */
  readonly optional?: boolean

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Schema annotations
 */
export interface SchemaAnnotations {
  /** Schema identifier */
  readonly identifier?: string

  /** Human-readable title */
  readonly title?: string

  /** Description */
  readonly description?: string
}

/**
 * Schema fragment configuration
 */
export interface SchemaFragmentConfig extends FragmentConfig {
  /** Schema constant name */
  readonly name: string

  /** Schema type: Struct, String, Number, etc. */
  readonly schemaType: 'Struct' | 'String' | 'Number' | 'Boolean' | 'Array' | 'Union'

  /** Fields for Struct schemas */
  readonly fields?: ReadonlyArray<SchemaField>

  /** Brand name for branded types */
  readonly brand?: string

  /** Schema annotations */
  readonly annotations?: SchemaAnnotations

  /** Whether to export the schema */
  readonly exported?: boolean

  /** Type alias name (creates inferred type) */
  readonly typeAlias?: string
}

/**
 * Layer composition configuration
 */
export interface LayerComposition {
  /** Layers to merge */
  readonly merge?: ReadonlyArray<string>

  /** Layers to provide */
  readonly provide?: ReadonlyArray<string>

  /** Layers to provide and merge */
  readonly provideMerge?: ReadonlyArray<string>
}

/**
 * Layer fragment configuration
 */
export interface LayerFragmentConfig extends FragmentConfig {
  /** Layer constant name (e.g., 'UserRepositoryLive') */
  readonly name: string

  /** Layer creation type */
  readonly layerType: 'effect' | 'sync' | 'scoped' | 'succeed' | 'suspend'

  /** Service tag being implemented */
  readonly serviceTag: string

  /** Layer implementation code */
  readonly implementation: string

  /** Dependencies required by this layer */
  readonly dependencies?: ReadonlyArray<string>

  /** Layer composition */
  readonly composition?: LayerComposition

  /** Whether to export the layer */
  readonly exported?: boolean
}

/**
 * Import fragment configuration
 */
export interface ImportFragmentConfig extends FragmentConfig {
  /** Module specifier */
  readonly from: string

  /** Named imports */
  readonly imports: ReadonlyArray<string>

  /** Whether this is a type-only import */
  readonly typeOnly?: boolean
}

/**
 * Section comment fragment configuration
 */
export interface SectionCommentFragmentConfig extends FragmentConfig {
  /** Section title */
  readonly title: string

  /** Optional description lines */
  readonly description?: ReadonlyArray<string>
}

// ============================================================================
// Fragment Definition Types
// ============================================================================

/**
 * Fragment render function type
 *
 * A fragment is a function that modifies a SourceFile.
 */
export type FragmentRenderer<TConfig extends FragmentConfig> = (
  sourceFile: SourceFile,
  config: TConfig,
  context: TemplateContext
) => Effect.Effect<void, InterpolationError>

/**
 * Fragment definition
 *
 * Combines configuration with metadata.
 */
export interface FragmentDefinition<TConfig extends FragmentConfig = FragmentConfig> {
  /** Fragment type identifier */
  readonly type: string

  /** Fragment configuration */
  readonly config: TConfig

  /** Optional condition for rendering */
  readonly condition?: string
}

/**
 * Union of all fragment configurations
 */
export type AnyFragmentConfig =
  | TaggedErrorFragmentConfig
  | ContextTagFragmentConfig
  | SchemaFragmentConfig
  | LayerFragmentConfig
  | ImportFragmentConfig
  | SectionCommentFragmentConfig

/**
 * Fragment registry entry
 *
 * Uses unknown renderer type internally to avoid generic variance issues.
 * The registry handles type narrowing at runtime.
 */
export interface FragmentRegistryEntry<TConfig extends FragmentConfig = FragmentConfig> {
  /** Fragment type name */
  readonly type: string

  /** Fragment renderer function */
  readonly renderer: FragmentRenderer<TConfig>

  /** Required Effect imports for this fragment */
  readonly requiredImports: ReadonlyArray<string>
}

/**
 * Internal registry entry with broader type for storage
 *
 * This type allows storing any FragmentRenderer in the Map without
 * TypeScript variance issues. The registry ensures type safety through
 * the fragment type string at runtime.
 */
export interface InternalFragmentEntry {
  readonly type: string
  readonly renderer: (
    sourceFile: SourceFile,
    config: FragmentConfig,
    context: TemplateContext
  ) => Effect.Effect<void, InterpolationError>
  readonly requiredImports: ReadonlyArray<string>
}
