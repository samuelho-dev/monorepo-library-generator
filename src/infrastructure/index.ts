/**
 * Infrastructure Module
 *
 * Unified infrastructure for all generator interfaces (MCP, CLI, Nx)
 *
 * This module consolidates:
 * - Execution: createExecutor, executeGenerator, GeneratorResult, CoreGeneratorFn
 * - Metadata: computeMetadata, LibraryMetadata, LibraryType, MetadataInput
 * - Output: formatOutput, formatErrorResponse, formatValidationError
 * - Validation: Schema classes and decoders for all generator inputs
 * - Workspace: createWorkspaceContext, WorkspaceContext, InterfaceType
 *
 * @module monorepo-library-generator/infrastructure
 */

// Execution - Generator execution pipeline
export {
  type CoreGeneratorFn,
  createExecutor,
  executeGenerator,
  GeneratorExecutionError,
  type GeneratorExecutor,
  type GeneratorResult
} from "./execution"

// Metadata - Library metadata computation
export {
  computeMetadata,
  computeSimpleMetadata,
  type LibraryMetadata,
  type LibraryType,
  type MetadataInput
} from "./metadata"

// Output - Result formatting for different interfaces
export {
  formatErrorResponse,
  formatOutput,
  formatValidationError,
  type McpResponse,
  type NxGeneratorCallback
} from "./output"

// Validation - Input validation schemas
export {
  type ContractInput,
  ContractInputSchema,
  type DataAccessInput,
  DataAccessInputSchema,
  decodeContractInput,
  decodeDataAccessInput,
  decodeFeatureInput,
  decodeInfraInput,
  decodeProviderInput,
  type FeatureInput,
  FeatureInputSchema,
  type InfraInput,
  InfraInputSchema,
  type ProviderInput,
  ProviderInputSchema
} from "./validation"

// Workspace - Workspace context detection
export {
  createWorkspaceContext,
  createWorkspaceContextExplicit,
  type InterfaceType,
  type PackageManager,
  type WorkspaceContext,
  WorkspaceContextSchema,
  WorkspaceDetectionError,
  type WorkspaceType
} from "./workspace"

// Metrics - Generator observability
export {
  filesGenerated,
  generatorDuration,
  generatorErrors,
  generatorExecutions,
  infrastructureDuration,
  taggedFilesGenerated,
  taggedGeneratorDuration,
  taggedGeneratorError,
  taggedGeneratorExecution,
  taggedTemplateDuration,
  templateCompilations,
  templateDuration
} from "./metrics"
