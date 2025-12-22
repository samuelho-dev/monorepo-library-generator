/**
 * Feature Service Index Template
 *
 * Generates server/service/index.ts barrel file
 *
 * @module monorepo-library-generator/feature/service/service-index-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate server/service/index.ts file
 *
 * Creates barrel export for service interface
 */
export function generateFeatureServiceIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Full service:
   import { ${className}Service } from '${scope}/feature-${fileName}/server/service'

2. Type-only:
   import type { ${className}ServiceInterface } from '${scope}/feature-${fileName}/server/service'

3. Package barrel (largest):
   import { ${className}Service } from '${scope}/feature-${fileName}/server'`,
    module: `${scope}/feature-${fileName}/server/service`,
  });
  builder.addBlankLine();

  builder.addSectionComment('Re-export service interface and tag');
  builder.addBlankLine();

  builder.addRaw(`export { ${className}Service } from "./service";
export type { ${className}ServiceInterface } from "./service";`);

  return builder.toString();
}
