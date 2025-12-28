/**
 * Template Factories
 *
 * Factory functions for generating templates from configuration objects.
 * Provides standardized, reusable template generation across all library types.
 *
 * @module monorepo-library-generator/generators/shared/factories
 *
 * @example
 * ```typescript
 * import {
 *   createErrorFactory,
 *   createContractReExports,
 *   ERROR_DEFINITIONS,
 *   ERROR_SETS,
 * } from './factories';
 *
 * // Generate data-access errors
 * const builder = new TypeScriptBuilder()
 *
 * createContractReExports({
 *   className: 'User',
 *   scope: '@myorg',
 *   fileName: 'user',
 * })(builder)
 *
 * createErrorFactory({
 *   className: 'User',
 *   style: 'data',
 *   errors: ERROR_SETS.dataAccess('User'),
 *   includeUnionType: true,
 * })(builder)
 * ```
 */

export type { ContractDomainErrorConfig, DataAccessContractReExportConfig } from './error-factory'

// Error factory
export {
  createContractCombinedErrorType,
  createContractDomainErrors,
  createContractReExports,
  createContractRepositoryErrors,
  createDataAccessContractReExports,
  createErrorFactory,
  generateErrorFile,
  getErrorNames,
  validateErrorFactoryConfig
} from './error-factory'
export type {
  AutoLayerConfig,
  DomainLayerConfig,
  InfrastructureLayerConfig,
  LayerImportsConfig
} from './layer-factory'
// Layer factory
export {
  createAutoLayer,
  createDomainLayers,
  createInfrastructureLayers,
  createLayerImports,
  DOMAIN_SERVICES,
  generateLayersFile,
  getInfraPackageName,
  INFRASTRUCTURE_SERVICES
} from './layer-factory'
// Presets
export { ERROR_DEFINITIONS, ERROR_SETS, getInfrastructureErrorNames } from './presets'
// Types
export type {
  ComposedLayerConfig,
  ContractReExportConfig,
  // Field definitions
  DataFieldDef,
  // Error factory types
  ErrorDefinition,
  ErrorFactoryConfig,
  // Common types
  ErrorStyle,
  // Index factory types
  ExportDefinition,
  ExportSection,
  // Factory function types
  FactoryFn,
  // Validation types
  FactoryValidationError,
  IndexFactoryConfig,
  InfrastructureConfig,
  LayerDefinition,
  LayerFactoryConfig,
  LayerName,
  // Layer factory types
  LayerType,
  LibraryType,
  ProviderType,
  SchemaFieldDef,
  ServiceFactoryConfig,
  // Service factory types
  ServiceMethodDef,
  StaticMethodDef,
  StringFactory,
  ValidationResult
} from './types'
