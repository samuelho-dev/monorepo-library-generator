/**
 * Fragments Module
 *
 * Reusable template components for Effect-TS code generation.
 *
 * @module monorepo-library-generator/templates/fragments
 */

// Error fragments
export {
  alreadyExistsErrorFragment,
  databaseErrorFragment,
  domainErrorFragments,
  notFoundErrorFragment,
  permissionErrorFragment,
  renderTaggedErrorFragment,
  repositoryErrorFragments,
  validationErrorFragment
} from "./error-fragment"
// Layer fragments
export {
  composedLayerFragment,
  infrastructureLayerFragment,
  liveRepositoryLayerFragment,
  liveServiceLayerFragment,
  renderLayerFragment,
  testRepositoryLayerFragment
} from "./layer-fragment"
// Registry (Effect Service Pattern)
export { FragmentNotFoundError, FragmentRegistry } from "./registry"
// Schema fragments
export {
  brandedIdFragment,
  commonSchemaFields,
  createInputSchemaFragment,
  entitySchemaFragment,
  renderSchemaFragment,
  updateInputSchemaFragment
} from "./schema-fragment"
// Service fragments
export {
  projectionRepositoryFragment,
  renderContextTagFragment,
  repositoryFragment,
  serviceFragment
} from "./service-fragment"
// Types
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
} from "./types"
