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
} from "./options.config"
export { validateExternalService, validateName, VALIDATION_PATTERNS, type ValidationResult } from "./validation.config"
