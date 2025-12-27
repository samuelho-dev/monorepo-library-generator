/**
 * Template Registry
 *
 * Central registry for template lookup and generation.
 *
 * @module monorepo-library-generator/templates/registry
 */

export type { GeneratorError } from './generator'
// Generator
export {
  ContextValidationError,
  GenerationError,
  generate,
  generateDomain,
  generateFile,
  generateLibrary,
  TemplateNotFoundError
} from './generator'
// Registry
export {
  createTemplateRegistry,
  getAvailableFileTypes,
  getRegisteredLibraryTypes,
  getTemplate,
  getTemplateRegistry,
  hasTemplate,
  validateContext
} from './registry'
// Types
export type {
  FileType,
  GeneratedFile,
  GenerationResult,
  GeneratorOptions,
  LibraryType,
  TemplateKey,
  TemplateMetadata,
  TemplateRegistry,
  TemplateRegistryEntry
} from './types'
