/**
 * Template Definition Types
 *
 * Type-safe template definitions for Effect-TS code generation.
 * Templates are declarative specifications that can be compiled to TypeScript.
 *
 * @module monorepo-library-generator/templates/core/types
 */

import type { Data } from "effect"

// ============================================================================
// Template Definition Types
// ============================================================================

/**
 * Template Definition
 *
 * Declarative specification for a TypeScript file to be generated.
 * Supports interpolation via {variableName} syntax in strings.
 */
export interface TemplateDefinition {
  /** Unique identifier for the template (e.g., "contract/errors") */
  readonly id: string

  /** Template metadata */
  readonly meta: TemplateMeta

  /** Import statements */
  readonly imports: ReadonlyArray<ImportDefinition>

  /** Content sections */
  readonly sections: ReadonlyArray<SectionDefinition>

  /** Conditional content based on context flags */
  readonly conditionals?: Readonly<Record<string, ConditionalContent>>
}

/**
 * Template Metadata
 *
 * Descriptive information about the template.
 */
export interface TemplateMeta {
  /** Title with interpolation support (e.g., "{className} Errors") */
  readonly title: string

  /** Description for documentation */
  readonly description: string

  /** Module path for the generated file */
  readonly module?: string
}

/**
 * Import Definition
 *
 * Specifies an import statement in the generated file.
 */
export interface ImportDefinition {
  /** Package or relative path to import from */
  readonly from: string

  /** Named imports */
  readonly items: ReadonlyArray<string>

  /** Whether this is a type-only import */
  readonly isTypeOnly?: boolean

  /** Condition for including this import (context key) */
  readonly condition?: string
}

// ============================================================================
// Content Definitions
// ============================================================================

/**
 * Content Definition
 *
 * Union type for all possible content types in a template.
 */
export type ContentDefinition =
  | RawContent
  | ContextTagContent
  | TaggedErrorContent
  | SchemaContent
  | RpcDefinitionContent
  | FragmentReference
  | InterfaceContent
  | ClassContent
  | ConstantContent

/**
 * Raw TypeScript content (string-based)
 */
export interface RawContent {
  readonly type: "raw"
  /** Raw TypeScript code with interpolation support */
  readonly value: string
}

/**
 * Effect Context.Tag class definition
 */
export interface ContextTagContent {
  readonly type: "contextTag"
  readonly config: ContextTagConfig
}

/**
 * Effect Data.TaggedError class definition
 */
export interface TaggedErrorContent {
  readonly type: "taggedError"
  readonly config: TaggedErrorConfig
}

/**
 * Effect Schema definition
 */
export interface SchemaContent {
  readonly type: "schema"
  readonly config: SchemaConfig
}

/**
 * Effect RPC definition
 */
export interface RpcDefinitionContent {
  readonly type: "rpcDefinition"
  readonly config: RpcConfig
}

/**
 * Reference to a reusable fragment
 */
export interface FragmentReference {
  readonly type: "fragment"
  /** Fragment ID (e.g., "effect-patterns/context-tag") */
  readonly ref: string
  /** Parameters to pass to the fragment */
  readonly params?: Readonly<Record<string, unknown>>
}

/**
 * TypeScript interface definition
 */
export interface InterfaceContent {
  readonly type: "interface"
  readonly config: InterfaceConfig
}

/**
 * TypeScript class definition
 */
export interface ClassContent {
  readonly type: "class"
  readonly config: ClassConfig
}

/**
 * TypeScript constant definition
 */
export interface ConstantContent {
  readonly type: "constant"
  readonly config: ConstantConfig
}

// ============================================================================
// Section Definition
// ============================================================================

/**
 * Section Definition
 *
 * Groups related content with optional title and condition.
 */
export interface SectionDefinition {
  /** Section title for documentation comments */
  readonly title?: string

  /** Condition for including this section (context key) */
  readonly condition?: string

  /** Content in this section */
  readonly content: ContentDefinition | ReadonlyArray<ContentDefinition>
}

/**
 * Conditional Content
 *
 * Content that is only included when a condition is true.
 */
export interface ConditionalContent {
  /** Additional imports for this conditional */
  readonly imports?: ReadonlyArray<ImportDefinition>

  /** Sections to include */
  readonly sections: ReadonlyArray<SectionDefinition>
}

// ============================================================================
// Effect Pattern Configs
// ============================================================================

/**
 * Context.Tag Configuration
 *
 * Configures an Effect Context.Tag class with interface and layers.
 */
export interface ContextTagConfig {
  /** Service class name (e.g., "UserRepository") */
  readonly serviceName: string

  /** Tag identifier string (e.g., "UserRepository") */
  readonly tagIdentifier: string

  /** Interface methods for the service */
  readonly methods: ReadonlyArray<MethodSignature>

  /** Static layer definitions */
  readonly staticLayers?: ReadonlyArray<LayerConfig>

  /** JSDoc comment for the class */
  readonly jsdoc?: string
}

/**
 * Method Signature
 *
 * Describes a method on an interface.
 */
export interface MethodSignature {
  /** Method name */
  readonly name: string

  /** Method parameters */
  readonly params: ReadonlyArray<ParameterDefinition>

  /** Return type (Effect type) */
  readonly returnType: string

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Parameter Definition
 */
export interface ParameterDefinition {
  /** Parameter name */
  readonly name: string

  /** Parameter type */
  readonly type: string

  /** Whether the parameter is optional */
  readonly optional?: boolean
}

/**
 * Layer Configuration
 *
 * Defines a static layer on a Context.Tag class.
 */
export interface LayerConfig {
  /** Layer name (e.g., "Live", "Test", "Dev", "Auto") */
  readonly name: string

  /** Layer implementation code */
  readonly implementation: string

  /** Layer dependencies (for Layer.effect) */
  readonly dependencies?: ReadonlyArray<string>
}

/**
 * Tagged Error Configuration
 *
 * Configures a Data.TaggedError class.
 */
export interface TaggedErrorConfig {
  /** Error class name (e.g., "UserNotFoundError") */
  readonly className: string

  /** Tag name for the error */
  readonly tagName: string

  /** Error fields (must be readonly) */
  readonly fields: ReadonlyArray<FieldDefinition>

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Field Definition
 */
export interface FieldDefinition {
  /** Field name */
  readonly name: string

  /** Field type */
  readonly type: string

  /** Default value expression */
  readonly default?: string

  /** Whether field is optional */
  readonly optional?: boolean
}

/**
 * Schema Configuration
 *
 * Configures an Effect Schema definition.
 */
export interface SchemaConfig {
  /** Schema name (e.g., "UserSchema") */
  readonly name: string

  /** Schema type (Class, Struct, Union, etc.) */
  readonly schemaType: "Class" | "Struct" | "Union" | "TaggedUnion" | "String" | "Number" | "Boolean"

  /** Schema fields */
  readonly fields?: ReadonlyArray<SchemaFieldDefinition>

  /** Brand type for branded schemas */
  readonly brand?: string

  /** Schema annotations */
  readonly annotations?: Readonly<Record<string, string>>

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Schema Field Definition
 */
export interface SchemaFieldDefinition {
  /** Field name */
  readonly name: string

  /** Field schema expression */
  readonly schema: string

  /** Whether field is optional */
  readonly optional?: boolean
}

/**
 * RPC Configuration
 *
 * Configures an Effect RPC definition.
 */
export interface RpcConfig {
  /** RPC name (e.g., "GetUser") */
  readonly name: string

  /** Route type for access control */
  readonly routeType: "public" | "protected" | "admin"

  /** Payload schema configuration */
  readonly payload: RpcPayloadConfig

  /** Success response schema name */
  readonly success: string

  /** Error schema name */
  readonly error: string

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * RPC Payload Configuration
 */
export type RpcPayloadConfig =
  | { readonly type: "struct"; readonly fields: ReadonlyArray<SchemaFieldDefinition> }
  | { readonly type: "schema"; readonly name: string }
  | { readonly type: "void" }

// ============================================================================
// TypeScript Pattern Configs
// ============================================================================

/**
 * Interface Configuration
 */
export interface InterfaceConfig {
  /** Interface name */
  readonly name: string

  /** Whether the interface is exported */
  readonly isExported?: boolean

  /** Properties on the interface */
  readonly properties: ReadonlyArray<PropertyDefinition>

  /** Methods on the interface */
  readonly methods?: ReadonlyArray<MethodSignature>

  /** Extended interfaces */
  readonly extends?: ReadonlyArray<string>

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Property Definition
 */
export interface PropertyDefinition {
  /** Property name */
  readonly name: string

  /** Property type */
  readonly type: string

  /** Whether property is readonly */
  readonly readonly?: boolean

  /** Whether property is optional */
  readonly optional?: boolean
}

/**
 * Class Configuration
 */
export interface ClassConfig {
  /** Class name */
  readonly name: string

  /** Whether the class is exported */
  readonly isExported?: boolean

  /** Base class (extends) */
  readonly extends?: string

  /** Implemented interfaces */
  readonly implements?: ReadonlyArray<string>

  /** Class properties */
  readonly properties?: ReadonlyArray<PropertyDefinition>

  /** Class methods */
  readonly methods?: ReadonlyArray<MethodConfig>

  /** Static members */
  readonly statics?: ReadonlyArray<StaticMemberConfig>

  /** JSDoc comment */
  readonly jsdoc?: string
}

/**
 * Method Configuration
 */
export interface MethodConfig extends MethodSignature {
  /** Method body */
  readonly body: string

  /** Whether method is static */
  readonly isStatic?: boolean

  /** Whether method is async */
  readonly isAsync?: boolean
}

/**
 * Static Member Configuration
 */
export interface StaticMemberConfig {
  /** Member name */
  readonly name: string

  /** Member type */
  readonly type?: string

  /** Member value */
  readonly value: string
}

/**
 * Constant Configuration
 */
export interface ConstantConfig {
  /** Constant name */
  readonly name: string

  /** Whether constant is exported */
  readonly isExported?: boolean

  /** Constant type (optional, can be inferred) */
  readonly type?: string

  /** Constant value expression */
  readonly value: string

  /** JSDoc comment */
  readonly jsdoc?: string
}

// ============================================================================
// Template Context
// ============================================================================

/**
 * Template Context
 *
 * Variables and flags available during template compilation.
 */
export interface TemplateContext {
  /** Class name (PascalCase) */
  readonly className: string

  /** File name (kebab-case) */
  readonly fileName: string

  /** Property name (camelCase) */
  readonly propertyName: string

  /** Constant name (UPPER_SNAKE_CASE) */
  readonly constantName: string

  /** Package scope (e.g., "@myorg") */
  readonly scope: string

  /** Package name (e.g., "@myorg/contract-user") */
  readonly packageName: string

  /** Project name (e.g., "contract-user") */
  readonly projectName: string

  /** Library type */
  readonly libraryType: string

  /** Additional context values (feature flags, options) */
  readonly [key: string]: unknown
}

// ============================================================================
// Compilation Errors
// ============================================================================

/**
 * Template Compilation Error
 */
export interface CompilationError extends Data.Case {
  readonly _tag: "CompilationError"
  readonly templateId: string
  readonly message: string
  readonly diagnostics?: ReadonlyArray<CompilationDiagnostic>
}

/**
 * Compilation Diagnostic
 */
export interface CompilationDiagnostic {
  readonly line: number
  readonly column: number
  readonly message: string
  readonly severity: "error" | "warning"
}

/**
 * Fragment Not Found Error
 */
export interface FragmentNotFoundError extends Data.Case {
  readonly _tag: "FragmentNotFoundError"
  readonly fragmentId: string
}

/**
 * Interpolation Error
 */
export interface InterpolationError extends Data.Case {
  readonly _tag: "InterpolationError"
  readonly variable: string
  readonly message: string
}
