/**
 * Shared Types Template
 *
 * Generates shared/types.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/types-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { FeatureTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate shared/types.ts file for feature library
 *
 * Creates shared type definitions for the domain.
 */
export function generateTypesFile(options: FeatureTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} Types`,
    description: `Shared type definitions for ${name} domain.`,
    module: `@custom-repo/feature-${name}/shared/types`,
  });

  // Add TODO comment
  builder.addComment('TODO: Add domain types');

  // Add Config interface
  builder.addInterface({
    exported: true,
    name: `${className}Config`,
    properties: [],
    jsdoc: 'TODO: Add configuration fields',
  });
  builder.addBlankLine();

  // Add Result interface
  builder.addInterface({
    exported: true,
    name: `${className}Result`,
    properties: [],
    jsdoc: 'TODO: Add result fields',
  });
  builder.addBlankLine();

  return builder.toString();
}
