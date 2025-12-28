/**
 * Core Operations
 *
 * Re-exports all operation modules.
 *
 * @module monorepo-library-generator/cli/core/operations
 */

export { executeGeneration, GenerationError, type GenerationInput } from './execution'

export { buildFileTree, countFiles, getCreationDescription, getFilePreview, getTargetDirectory } from './preview'
export { validateExternalService, validateName, validateSubModules, VALIDATION_PATTERNS } from './validation'
export { detectWorkspace, detectWorkspaceSync, detectWorkspaceType } from './workspace'
