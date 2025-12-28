/**
 * Core CLI Module
 *
 * Shared business logic, types, and configuration for CLI and TUI.
 *
 * @module monorepo-library-generator/cli/core
 */

// Configuration
export {
  getDefaultOptions,
  getLibraryTypeMetadata,
  getOptionsForType,
  getRequiredOptions,
  getVisibleOptions,
  getWizardActionMetadata,
  isSingleLibraryType,
  isWizardAction,
  LIBRARY_TYPES,
  PLATFORM_OPTIONS,
  requiresExternalService,
  validateRequiredOptions,
  WIZARD_ACTIONS
} from './config'
export type { GenerationInput } from './operations'
// Operations
export {
  buildFileTree,
  countFiles,
  detectWorkspace,
  detectWorkspaceSync,
  detectWorkspaceType,
  executeGeneration,
  GenerationError,
  getCreationDescription,
  getFilePreview,
  getTargetDirectory,
  validateExternalService,
  validateName,
  validateSubModules,
  VALIDATION_PATTERNS
} from './operations'
// Types
export type {
  FilePreview,
  GeneratorOptions,
  InputComponentType,
  LibraryType,
  LibraryTypeMetadata,
  OptionFieldConfig,
  Platform,
  SingleLibraryType,
  ValidationResult,
  WizardAction,
  WizardActionMetadata,
  WizardSelection,
  WorkspaceContext,
  WorkspaceType
} from './types'
export { getEffectiveTags } from './types'
