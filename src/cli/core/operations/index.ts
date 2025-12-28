/**
 * Core Operations
 *
 * Re-exports all operation modules.
 *
 * @module monorepo-library-generator/cli/core/operations
 */

export { executeGeneration, GenerationError, type GenerationInput } from './execution'

export {
  buildFileTree,
  countFiles,
  getCreationDescription,
  getFilePreview,
  getTargetDirectory
} from './preview'
export {
  VALIDATION_PATTERNS,
  validateExternalService,
  validateName,
  validateSubModules
} from './validation'
export { detectWorkspace, detectWorkspaceSync, detectWorkspaceType } from './workspace'
