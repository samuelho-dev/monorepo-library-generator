/**
 * Kysely Provider Errors Template
 *
 * Specialized error types for the Kysely database query builder provider.
 *
 * @module monorepo-library-generator/provider/kysely-errors-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../utils/types';

/**
 * Generate Kysely provider errors file
 */
export function generateKyselyErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, packageName } = options;

  builder.addFileHeader({
    title: `${className} Provider Errors`,
    description: `Error types for ${className} database provider using Schema.TaggedError.`,
    module: `${packageName}/errors`,
  });
  builder.addBlankLine();

  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);
  builder.addBlankLine();

  builder.addSectionComment('Error Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Base ${className} error
 *
 * All ${className}-specific errors extend this type.
 */
export class ${className}Error extends Schema.TaggedError<${className}Error>()(
  "${className}Error",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Connection error - failure to connect to database
 */
export class ${className}ConnectionError extends Schema.TaggedError<${className}ConnectionError>()(
  "${className}ConnectionError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Query error - query execution failed
 */
export class ${className}QueryError extends Schema.TaggedError<${className}QueryError>()(
  "${className}QueryError",
  {
    message: Schema.String,
    query: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Transaction error - transaction failed
 */
export class ${className}TransactionError extends Schema.TaggedError<${className}TransactionError>()(
  "${className}TransactionError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

/**
 * Constraint error - database constraint violation
 */
export class ${className}ConstraintError extends Schema.TaggedError<${className}ConstraintError>()(
  "${className}ConstraintError",
  {
    message: Schema.String,
    constraint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown)
  }
) {}`);
  builder.addBlankLine();

  builder.addSectionComment('Error Type Union');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Union of all ${className} error types
 */
export type ${className}ProviderError =
  | ${className}Error
  | ${className}ConnectionError
  | ${className}QueryError
  | ${className}TransactionError
  | ${className}ConstraintError`);

  return builder.toString();
}
