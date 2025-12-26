/**
 * Template Registry
 *
 * Central registry for template lookup and generation.
 *
 * @module monorepo-library-generator/templates/registry
 */

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
} from "./types"

// Registry
export {
  createTemplateRegistry,
  getAvailableFileTypes,
  getRegisteredLibraryTypes,
  getTemplate,
  getTemplateRegistry,
  hasTemplate,
  validateContext
} from "./registry"

// Generator
export {
  ContextValidationError,
  generate,
  generateDomain,
  generateFile,
  generateLibrary,
  GenerationError,
  TemplateNotFoundError
} from "./generator"
export type { GeneratorError } from "./generator"
