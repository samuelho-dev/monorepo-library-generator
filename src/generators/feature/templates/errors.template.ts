/**
 * Shared Errors Template
 *
 * Generates shared/errors.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/errors-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate shared/errors.ts file for feature library
 *
 * Creates domain-specific error classes using Data.TaggedError pattern.
 */
export function generateErrorsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} Errors`,
    description: 'Domain errors using Data.TaggedError pattern.',
    module: `${scope}/feature-${name}/shared/errors`,
  });

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Data'] }]);
  builder.addBlankLine();

  // Add main error class
  builder.addClass({
    exported: true,
    className: `${className}Error`,
    extends: `Data.TaggedError("${className}Error")<{
  readonly message: string;
  readonly cause?: unknown;
}>`,
  });
  builder.addBlankLine();

  // Add TODO comments for additional errors
  builder.addComment('TODO: Add domain-specific errors');
  builder.addComment('Example:');
  builder.addComment(
    `// export class ${className}NotFoundError extends Data.TaggedError("${className}NotFoundError")<{`,
  );
  builder.addComment('//   readonly id: string;');
  builder.addComment('// }> {}');
  builder.addBlankLine();

  return builder.toString();
}
