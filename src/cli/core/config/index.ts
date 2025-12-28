/**
 * Core Configuration
 *
 * Re-exports all configuration registries.
 *
 * @module monorepo-library-generator/cli/core/config
 */

export {
  getLibraryTypeMetadata,
  getWizardActionMetadata,
  isSingleLibraryType,
  isWizardAction,
  LIBRARY_TYPES,
  requiresExternalService,
  WIZARD_ACTIONS
} from "./library-types"

export {
  getDefaultOptions,
  getOptionsForType,
  getRequiredOptions,
  getVisibleOptions,
  PLATFORM_OPTIONS,
  validateRequiredOptions
} from "./options-registry"
