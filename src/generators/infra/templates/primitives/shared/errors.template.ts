/**
 * Primitive Errors Template
 *
 * Generates Schema.TaggedError based errors for primitive infrastructure services.
 * Uses modern Effect patterns for serializable, discriminated error types.
 *
 * @module monorepo-library-generator/infra-templates/primitives/shared
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate errors.ts file for primitive infrastructure services
 */
export function generatePrimitiveErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Errors`,
    description: `Error types for ${className} infrastructure service.

Uses Schema.TaggedError for:
- Serializable errors (can cross process boundaries)
- Discriminated union types (pattern matching)
- Runtime type validation`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ['Effect documentation for Schema.TaggedError patterns'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Schema'],
    },
  ]);

  builder.addSectionComment('Base Error Type');

  builder.addRaw(`/**
 * Base error class for ${className} service
 *
 * All ${className} errors extend this tagged error type.
 * The _tag field enables pattern matching and type narrowing.
 */
export class ${className}ServiceError extends Schema.TaggedError<${className}ServiceError>()(
  "${className}ServiceError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}
`);

  builder.addSectionComment('Specific Error Types');

  builder.addRaw(`/**
 * Internal error - unexpected failures
 *
 * Use for errors that indicate bugs or unexpected conditions.
 */
export class ${className}InternalError extends Schema.TaggedError<${className}InternalError>()(
  "${className}InternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Configuration error - invalid or missing configuration
 */
export class ${className}ConfigError extends Schema.TaggedError<${className}ConfigError>()(
  "${className}ConfigError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String)
  }
) {}

/**
 * Connection error - failure to connect to backing service
 */
export class ${className}ConnectionError extends Schema.TaggedError<${className}ConnectionError>()(
  "${className}ConnectionError",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Timeout error - operation exceeded time limit
 */
export class ${className}TimeoutError extends Schema.TaggedError<${className}TimeoutError>()(
  "${className}TimeoutError",
  {
    message: Schema.String,
    timeoutMs: Schema.optional(Schema.Number)
  }
) {}
`);

  builder.addSectionComment('Error Type Union');

  builder.addRaw(`/**
 * Union of all ${className} error types
 *
 * Use for comprehensive error handling:
 * @example
 * \`\`\`typescript
 * Effect.catchTag("${className}InternalError", (err) => ...)
 * Effect.catchTag("${className}TimeoutError", (err) => ...)
 * \`\`\`
 */
export type ${className}Error =
  | ${className}ServiceError
  | ${className}InternalError
  | ${className}ConfigError
  | ${className}ConnectionError
  | ${className}TimeoutError
`);

  return builder.toString();
}
