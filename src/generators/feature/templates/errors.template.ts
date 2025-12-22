/**
 * Shared Errors Template
 *
 * Generates shared/errors.ts file for feature libraries.
 *
 * Uses Schema.TaggedError for all errors - works both internally
 * and at RPC boundaries without error mapping.
 *
 * @module monorepo-library-generator/feature/errors-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate shared/errors.ts file for feature library
 *
 * Creates domain-specific error classes using Schema.TaggedError pattern.
 * Schema.TaggedError is used because:
 * - It's serializable (works at RPC boundaries)
 * - It works as domain errors internally
 * - It eliminates error mapping between layers
 */
export function generateErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} Errors`,
    description: `Domain errors using Schema.TaggedError pattern.

Schema.TaggedError is used for all errors because:
- Serializable at RPC boundaries
- Works as internal domain errors
- No error mapping needed between layers`,
    module: `${scope}/feature-${name}/shared/errors`,
  });

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);
  builder.addBlankLine();

  // Add main error class using Schema.TaggedError
  builder.addRaw(`/**
 * ${className} Error
 *
 * Primary error type for ${name} operations.
 * Uses Schema.TaggedError for RPC serialization compatibility.
 */
export class ${className}Error extends Schema.TaggedError<${className}Error>()(
  "${className}Error",
  {
    message: Schema.String,
    code: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Error codes for ${name} operations
 *
 * Use these codes with ${className}Error for type-safe error handling:
 * - NOT_FOUND: Entity not found
 * - VALIDATION_ERROR: Invalid input data
 * - CONFLICT: Operation conflicts with existing state
 * - INTERNAL_ERROR: Unexpected internal error
 */
export const ${className}ErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ${className}ErrorCode = (typeof ${className}ErrorCodes)[keyof typeof ${className}ErrorCodes];`);
  builder.addBlankLine();

  return builder.toString();
}
