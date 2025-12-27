/**
 * Interactive Config Module
 *
 * Barrel export for presentation configuration.
 *
 * @module monorepo-library-generator/cli/interactive/config
 */

export {
  type BooleanOptionConfig,
  getOptionsForType,
  type OptionConfig,
  PLATFORM_OPTIONS,
  type PlatformOption,
  type SelectOptionConfig,
  type TextOptionConfig
} from './options.config'
export {
  VALIDATION_PATTERNS,
  type ValidationResult,
  validateExternalService,
  validateName
} from './validation.config'
