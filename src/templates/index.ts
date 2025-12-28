/**
 * Templates Module
 *
 * Type-safe template engine for Effect-TS code generation.
 *
 * @module monorepo-library-generator/templates
 */

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
} from './ast/effect-builders'

// Compiler (Effect Service Pattern)
export { CompilationError, TemplateCompiler } from './core/compiler'

// Resolver
export {
  createContextFromName,
  extractVariables,
  hasInterpolation,
  InterpolationError,
  interpolate,
  interpolateDeep,
  interpolateSync
} from './core/resolver'
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
} from './core/types'
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
} from './fragments'
// Fragments (Effect Service Pattern)
export {
  // Error fragments
  alreadyExistsErrorFragment,
  // Schema fragments
  brandedIdFragment,
  commonSchemaFields,
  // Layer fragments
  composedLayerFragment,
  createInputSchemaFragment,
  databaseErrorFragment,
  domainErrorFragments,
  entitySchemaFragment,
  // Registry
  FragmentNotFoundError,
  FragmentRegistry,
  infrastructureLayerFragment,
  liveRepositoryLayerFragment,
  liveServiceLayerFragment,
  notFoundErrorFragment,
  permissionErrorFragment,
  // Service fragments
  projectionRepositoryFragment,
  renderContextTagFragment,
  renderLayerFragment,
  renderSchemaFragment,
  renderTaggedErrorFragment,
  repositoryErrorFragments,
  repositoryFragment,
  serviceFragment,
  testRepositoryLayerFragment,
  updateInputSchemaFragment,
  validationErrorFragment
} from './fragments'
// Registry types
export type {
  FileType,
  GeneratedFile,
  GenerationResult,
  GeneratorError,
  GeneratorOptions,
  LibraryType,
  TemplateKey,
  TemplateMetadata,
  TemplateRegistry,
  TemplateRegistryEntry
} from './registry'
// Registry
export {
  // Generator functions
  ContextValidationError,
  // Registry functions
  createTemplateRegistry,
  GenerationError,
  generate,
  generateDomain,
  generateFile,
  generateLibrary,
  getAvailableFileTypes,
  getRegisteredLibraryTypes,
  getTemplate,
  getTemplateRegistry,
  hasTemplate,
  TemplateNotFoundError,
  validateContext
} from './registry'
