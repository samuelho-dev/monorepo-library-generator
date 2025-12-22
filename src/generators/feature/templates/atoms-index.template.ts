/**
 * Atoms Index Template
 *
 * Generates client/atoms/index.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/atoms-index-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate client/atoms/index.ts file for feature library
 *
 * Creates barrel export for client atoms.
 */
export function generateAtomsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: 'Client Atoms Barrel Export',
    description: 'Barrel export for client-side state atoms',
    module: `${scope}/feature-${fileName}/client/atoms`,
  });

  // Add export
  builder.addRaw(`export * from "./${fileName}-atoms";`);
  builder.addBlankLine();

  return builder.toString();
}
