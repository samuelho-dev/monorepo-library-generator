/**
 * Core Operations
 *
 * Re-exports all operation modules.
 *
 * @module monorepo-library-generator/cli/core/operations
 */

export {
  validateExternalService,
  validateName,
  validateSubModules,
  VALIDATION_PATTERNS
} from "./validation"

export {
  buildFileTree,
  countFiles,
  getCreationDescription,
  getFilePreview,
  getTargetDirectory
} from "./preview"

export { detectWorkspace, detectWorkspaceSync, detectWorkspaceType } from "./workspace"

export { executeGeneration, GenerationError, type GenerationInput } from "./execution"
