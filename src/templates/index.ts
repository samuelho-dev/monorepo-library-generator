/**
 * Templates Module
 *
 * Type-safe template engine for Effect-TS code generation.
 *
 * @module monorepo-library-generator/templates
 */

// Core types
export type {
  ClassConfig,
  ClassContent,
  CompilationDiagnostic,
  CompilationError as CompilationErrorType,
  ConditionalContent,
  ConstantConfig,
  ConstantContent,
  ContentDefinition,
  ContextTagConfig,
  ContextTagContent,
  FieldDefinition,
  FragmentNotFoundError,
  FragmentReference,
  ImportDefinition,
  InterfaceConfig,
  InterfaceContent,
  InterpolationError as InterpolationErrorType,
  LayerConfig,
  MethodConfig,
  MethodSignature,
  ParameterDefinition,
  PropertyDefinition,
  RawContent,
  RpcConfig,
  RpcDefinitionContent,
  RpcPayloadConfig,
  SchemaConfig,
  SchemaContent,
  SchemaFieldDefinition,
  SectionDefinition,
  StaticMemberConfig,
  TaggedErrorConfig,
  TaggedErrorContent,
  TemplateContext,
  TemplateDefinition,
  TemplateMeta
} from "./core/types"

// Compiler
export {
  CompilationError,
  createCompiler,
  getCompiler,
  TemplateCompiler
} from "./core/compiler"

// Resolver
export {
  createContextFromName,
  extractVariables,
  hasInterpolation,
  interpolate,
  interpolateDeep,
  InterpolationError,
  interpolateSync
} from "./core/resolver"

// AST Builders
export {
  addConstExport,
  addContextTagClass,
  addEffectImports,
  addImport,
  addJsDocComment,
  addSchemaDefinition,
  addSectionComment,
  addTaggedErrorClass,
  addTypeAlias,
  addTypeImport
} from "./ast/effect-builders"

// Fragments
export {
  // Registry
  createFragmentRegistry,
  FragmentNotFoundError,
  FragmentRegistry,
  getFragmentRegistry,
  registerFragment,
  // Error fragments
  alreadyExistsErrorFragment,
  databaseErrorFragment,
  domainErrorFragments,
  notFoundErrorFragment,
  permissionErrorFragment,
  renderTaggedErrorFragment,
  repositoryErrorFragments,
  validationErrorFragment,
  // Service fragments
  projectionRepositoryFragment,
  renderContextTagFragment,
  repositoryFragment,
  serviceFragment,
  // Schema fragments
  brandedIdFragment,
  commonSchemaFields,
  createInputSchemaFragment,
  entitySchemaFragment,
  renderSchemaFragment,
  updateInputSchemaFragment,
  // Layer fragments
  composedLayerFragment,
  infrastructureLayerFragment,
  liveRepositoryLayerFragment,
  liveServiceLayerFragment,
  renderLayerFragment,
  testRepositoryLayerFragment
} from "./fragments"

// Fragment types
export type {
  AnyFragmentConfig,
  ContextTagFragmentConfig,
  ErrorField,
  ErrorStaticMethod,
  FragmentConfig,
  FragmentDefinition,
  FragmentRegistryEntry,
  FragmentRenderer,
  ImportFragmentConfig,
  LayerComposition,
  LayerFragmentConfig,
  MethodParam,
  SchemaAnnotations,
  SchemaField,
  SchemaFragmentConfig,
  SectionCommentFragmentConfig,
  ServiceMethod,
  StaticLayer,
  TaggedErrorFragmentConfig
} from "./fragments"
