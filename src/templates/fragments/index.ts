/**
 * Fragments Module
 *
 * Reusable template components for Effect-TS code generation.
 *
 * @module monorepo-library-generator/templates/fragments
 */

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

// Registry
export {
  createFragmentRegistry,
  FragmentNotFoundError,
  FragmentRegistry,
  getFragmentRegistry,
  registerFragment
} from "./registry"

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

// Service fragments
export {
  projectionRepositoryFragment,
  renderContextTagFragment,
  repositoryFragment,
  serviceFragment
} from "./service-fragment"

// Schema fragments
export {
  brandedIdFragment,
  commonSchemaFields,
  createInputSchemaFragment,
  entitySchemaFragment,
  renderSchemaFragment,
  updateInputSchemaFragment
} from "./schema-fragment"

// Layer fragments
export {
  composedLayerFragment,
  infrastructureLayerFragment,
  liveRepositoryLayerFragment,
  liveServiceLayerFragment,
  renderLayerFragment,
  testRepositoryLayerFragment
} from "./layer-fragment"

// Import all fragments to register them
import "./error-fragment"
import "./service-fragment"
import "./schema-fragment"
import "./layer-fragment"
