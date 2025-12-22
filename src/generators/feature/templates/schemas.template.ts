/**
 * Shared Schemas Template
 *
 * Generates shared/schemas.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/schemas-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate shared/schemas.ts file for feature library
 *
 * Creates shared schema definitions using Effect Schema.
 */
export function generateSchemasFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} Schemas`,
    description: 'Shared schema definitions using Effect Schema.',
  });

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);
  builder.addBlankLine();

  // Add Config schema
  builder.addRaw(`export const ${className}ConfigSchema = Schema.Struct({
  // Add configuration schema fields
});`);
  builder.addBlankLine();

  // Add Result schema
  builder.addRaw(`export const ${className}ResultSchema = Schema.Struct({
  // Add result schema fields
});`);
  builder.addBlankLine();

  return builder.toString();
}
