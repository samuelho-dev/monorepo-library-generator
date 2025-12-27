/**
 * Factory Type Definitions
 *
 * Core interfaces and types for the template factory system.
 * These types define the contract for error, layer, and service factories.
 *
 * @module monorepo-library-generator/generators/shared/factories/types
 */

import type { TypeScriptBuilder } from '../../../utils/code-builder'

// ============================================================================
// Common Types
// ============================================================================

/**
 * Error style options
 *
 * - 'data': Uses Data.TaggedError (simpler, for providers and services)
 * - 'schema': Uses Schema.TaggedError (serializable, for RPC boundaries)
 */
export type ErrorStyle = 'data' | 'schema'

/**
 * Library type identifiers
 */
export type LibraryType = 'contract' | 'data-access' | 'feature' | 'infra' | 'provider'

/**
 * Provider type for provider-specific error generation
 */
export type ProviderType = 'sdk' | 'cli' | 'http' | 'graphql'

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Field definition for Data.TaggedError
 */
export interface DataFieldDef {
  /** Field name */
  readonly name: string

  /** TypeScript type (e.g., 'string', 'number', 'unknown') */
  readonly type: string

  /** Whether field is optional */
  readonly optional?: boolean

  /** JSDoc comment for the field */
  readonly jsdoc?: string
}

/**
 * Field definition for Schema.TaggedError
 */
export interface SchemaFieldDef {
  /** Field name */
  readonly name: string

  /** Schema type (e.g., 'Schema.String', 'Schema.Number') */
  readonly schema: string

  /** Whether field is optional */
  readonly optional?: boolean
}

/**
 * Static method definition for error classes
 */
export interface StaticMethodDef {
  /** Method name (e.g., 'create') */
  readonly name: string

  /** Method parameters */
  readonly params: ReadonlyArray<{
    name: string
    type: string
    optional?: boolean
  }>

  /** Method body (the code inside the function) */
  readonly body: string
}

// ============================================================================
// Error Factory Types
// ============================================================================

/**
 * Static method parameter definition
 */
export interface StaticMethodParam {
  readonly name: string
  readonly type: string
  readonly optional?: boolean
}

/**
 * Additional static method definition for error classes
 */
export interface AdditionalStaticMethod {
  /** Method name (e.g., 'dependency', 'internal') */
  readonly name: string
  /** Method parameters */
  readonly params: readonly StaticMethodParam[]
  /** Method body (the code inside the function) */
  readonly body: string
}

/**
 * Complete error definition
 *
 * Defines a single error class with all its properties.
 *
 * @example
 * ```typescript
 * const notFoundError: ErrorDefinition = {
 *   name: 'NotFound',
 *   description: 'Resource not found error',
 *   fields: [
 *     { name: 'message', type: 'string', jsdoc: 'Human-readable message' },
 *     { name: 'id', type: 'string', jsdoc: 'Resource identifier' },
 *   ],
 *   staticCreate: {
 *     params: [{ name: 'id', type: 'string' }],
 *     body: 'return new UserNotFoundError({ message: `User not found: ${id}`, id })',
 *   },
 * };
 * ```
 */
export interface ErrorDefinition {
  /** Error name suffix (e.g., 'NotFound' -> 'UserNotFoundError') */
  readonly name: string

  /** Description for JSDoc */
  readonly description: string

  /**
   * Fields for Data.TaggedError style
   * Use this for 'data' style errors
   */
  readonly fields?: readonly DataFieldDef[]

  /**
   * Schema fields for Schema.TaggedError style
   * Use this for 'schema' style errors
   */
  readonly schemaFields?: readonly SchemaFieldDef[]

  /**
   * Static create() helper method
   * Only applicable for 'data' style errors
   */
  readonly staticCreate?: {
    params: readonly StaticMethodParam[]
    body: string
  }

  /**
   * Additional static methods (e.g., dependency(), orchestration(), internal())
   * Only applicable for 'data' style errors
   */
  readonly additionalMethods?: readonly AdditionalStaticMethod[]
}

/**
 * Configuration for error factory
 *
 * @example
 * ```typescript
 * const config: ErrorFactoryConfig = {
 *   className: 'User',
 *   style: 'data',
 *   errors: [
 *     ERROR_DEFINITIONS.notFound('User', 'userId'),
 *     ERROR_DEFINITIONS.validation('User'),
 *   ],
 *   includeUnionType: true,
 *   unionTypeName: 'UserError',
 * };
 * ```
 */
export interface ErrorFactoryConfig {
  /** Class name prefix (e.g., 'User' -> 'UserNotFoundError') */
  readonly className: string

  /** Error style: 'data' or 'schema' */
  readonly style: ErrorStyle

  /** Error definitions to generate */
  readonly errors: readonly ErrorDefinition[]

  /** Whether to include union type of all errors */
  readonly includeUnionType?: boolean

  /** Custom name for union type (default: `${className}Error`) */
  readonly unionTypeName?: string

  /** Whether to include static create() methods (only for 'data' style) */
  readonly includeStaticCreate?: boolean
}

/**
 * Configuration for contract error re-exports
 *
 * Used when a library (data-access, feature) needs to re-export
 * errors from its corresponding contract library.
 */
export interface ContractReExportConfig {
  /** Class name for the domain (e.g., 'User') */
  readonly className: string

  /** Workspace scope (e.g., '@myorg') */
  readonly scope: string

  /** File name for import path (e.g., 'user') */
  readonly fileName: string

  /** Error types to re-export */
  readonly errorTypes?: readonly string[]

  /** Whether to include 'type' keyword for re-exports */
  readonly typeOnly?: boolean
}

// ============================================================================
// Layer Factory Types
// ============================================================================

/**
 * Layer type options
 */
export type LayerType = 'sync' | 'effect' | 'scoped' | 'suspend' | 'succeed'

/**
 * Layer name options
 */
export type LayerName = 'Live' | 'Test' | 'Dev' | 'Auto'

/**
 * Layer definition
 *
 * Defines a single layer (Live, Test, Dev, or Auto).
 */
export interface LayerDefinition {
  /** Layer name */
  readonly name: LayerName

  /** Layer creation type */
  readonly type: LayerType

  /** Whether to use in-memory store for this layer */
  readonly useInMemoryStore?: boolean

  /** Whether to include tracing spans */
  readonly includeTracing?: boolean

  /** JSDoc description */
  readonly jsdoc?: string

  /** Custom implementation code (overrides default) */
  readonly implementation?: string
}

/**
 * Infrastructure layer configuration
 *
 * Defines infrastructure services to compose into layers.
 */
export interface InfrastructureConfig {
  /** Service names to include in infrastructure layer */
  readonly services: readonly string[]

  /** Environments to generate (Live, Test, Dev) */
  readonly environments: readonly Exclude<LayerName, 'Auto'[]>
}

/**
 * Composed layer configuration
 *
 * Defines how service layers are composed with infrastructure.
 */
export interface ComposedLayerConfig {
  /** Layer name (Live, Test, Dev) */
  readonly name: Exclude<LayerName, 'Auto'>

  /** Service layers to merge */
  readonly serviceLayers: readonly string[]

  /** Infrastructure layer to provide */
  readonly infrastructureLayer: string
}

/**
 * Configuration for layer factory
 *
 * Used by generateLayersFile() to create complete layer files.
 *
 * @example
 * ```typescript
 * const config: LayerFactoryConfig = {
 *   className: 'User',
 *   fileName: 'user',
 *   scope: '@myorg',
 *   libraryType: 'data-access',
 *   infrastructureServices: ['DatabaseService', 'LoggingService'],
 *   domainServices: ['UserRepository', 'UserCache'],
 * };
 * ```
 */
export interface LayerFactoryConfig {
  /** Class name for the domain (e.g., 'User') */
  readonly className: string

  /** File name for paths (e.g., 'user') */
  readonly fileName: string

  /** Workspace scope (e.g., '@myorg') */
  readonly scope: string

  /** Library type for naming conventions */
  readonly libraryType: 'data-access' | 'feature'

  /** Infrastructure services to include */
  readonly infrastructureServices: readonly string[]

  /** Domain services to include (e.g., ['UserRepository', 'UserCache']) */
  readonly domainServices: readonly string[]

  /** Include Dev layer (default: true) */
  readonly includeDev?: boolean

  /** Sub-module layers for feature libraries */
  readonly subModuleLayers?: {
    readonly live: readonly string[]
    readonly test: readonly string[]
  }
}

// ============================================================================
// Service Factory Types
// ============================================================================

/**
 * Service method definition
 */
export interface ServiceMethodDef {
  /** Method name */
  readonly name: string

  /** Method parameters */
  readonly params: ReadonlyArray<{
    name: string
    type: string
    optional?: boolean
    description?: string
  }>

  /** Return type (inside Effect.Effect) */
  readonly returnType: string

  /** Error types this method can throw */
  readonly errorTypes?: readonly string[]

  /** JSDoc description */
  readonly jsdoc?: string

  /** Tracing configuration */
  readonly tracing?: {
    spanName: string
    attributes?: Record<string, string>
  }
}

/**
 * Configuration for service factory
 */
export interface ServiceFactoryConfig {
  /** Class name (e.g., 'User') */
  readonly className: string

  /** Service name (e.g., 'UserService') */
  readonly serviceName: string

  /** Service description for JSDoc */
  readonly description: string

  /** Service methods */
  readonly methods: readonly ServiceMethodDef[]

  /** Service style */
  readonly style: 'interface-first' | 'inline'

  /** Dependencies this service requires */
  readonly dependencies?: readonly string[]

  /** Whether to include layers */
  readonly includeLayers?: boolean
}

// ============================================================================
// Index Factory Types
// ============================================================================

/**
 * Export definition for index files
 */
export interface ExportDefinition {
  /** Export type */
  readonly type: 'named' | 'type' | 'typeAll' | 'all' | 'default'

  /** Items to export (for 'named' and 'type' exports) */
  readonly items?: readonly string[]

  /** Source module path */
  readonly from: string

  /** Optional condition for conditional exports */
  readonly condition?: boolean
}

/**
 * Export section for organizing exports
 */
export interface ExportSection {
  /** Section title (used as comment) */
  readonly title: string

  /** Optional description */
  readonly description?: string

  /** Exports in this section */
  readonly exports: readonly ExportDefinition[]
}

/**
 * Configuration for index factory
 */
export interface IndexFactoryConfig {
  /** Class name */
  readonly className: string

  /** Library type */
  readonly libraryType: LibraryType

  /** Package name */
  readonly packageName: string

  /** Workspace scope */
  readonly scope: string

  /** Export sections */
  readonly sections: readonly ExportSection[]
}

// ============================================================================
// Factory Result Types
// ============================================================================

/**
 * Factory function signature
 *
 * All factories follow this pattern: take a TypeScriptBuilder and mutate it.
 */
export type FactoryFn = (builder: TypeScriptBuilder) => void

/**
 * Factory that returns a string instead of mutating builder
 *
 * Alternative pattern for simpler testing.
 */
export type StringFactory<TConfig> = (config: TConfig) => string

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Factory configuration validation error
 */
export interface FactoryValidationError {
  readonly field: string
  readonly message: string
  readonly value?: unknown
}

/**
 * Validation result
 */
export type ValidationResult<T> =
  | { readonly valid: true; readonly config: T }
  | { readonly valid: false; readonly errors: readonly FactoryValidationError[] }
