/**
 * RPC Errors Template
 *
 * Generates rpc/errors.ts file for feature libraries.
 * Re-exports from shared/errors for RPC consumers.
 *
 * @module monorepo-library-generator/feature/rpc-errors-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate rpc/errors.ts file for feature library
 *
 * Re-exports errors from shared/errors.ts for RPC consumers.
 * All errors use Schema.TaggedError so they work at RPC boundaries.
 */
export function generateRpcErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Errors`,
    description: `Re-exports errors from shared/errors for RPC consumers.

All errors use Schema.TaggedError - no separate RPC error types needed.
This ensures a single source of truth for error definitions.`,
  });

  // Re-export from shared errors
  builder.addRaw(`// Re-export all errors from shared/errors
// All errors use Schema.TaggedError for RPC compatibility
export { ${className}Error, ${className}ErrorCodes } from "../shared/errors";
export type { ${className}ErrorCode } from "../shared/errors";`);
  builder.addBlankLine();

  return builder.toString();
}
