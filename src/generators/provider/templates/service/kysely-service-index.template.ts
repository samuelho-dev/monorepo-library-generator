/**
 * Kysely Provider Service Index Template
 *
 * Generates service/index.ts barrel file for Kysely provider.
 * Includes Database type export in addition to service exports.
 *
 * @module monorepo-library-generator/provider/service/kysely-service-index-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate Kysely service/index.ts file
 *
 * Creates barrel export for service interface, operations, and Database type
 */
export function generateKyselyProviderServiceIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Service barrel exports for Kysely query builder provider.

Import options:

1. Service tag with query/transaction methods:
   import { ${className} } from '@scope/provider-${fileName}'

2. Type-only for type annotations:
   import type { Database, ${className}ServiceInterface } from '@scope/provider-${fileName}'

3. Direct service import:
   import { ${className} } from '@scope/provider-${fileName}/service'`,
    module: `${scope}/provider-${fileName}/service`,
  });
  builder.addBlankLine();

  builder.addSectionComment('Re-export service interface, tag, and Database type');
  builder.addBlankLine();

  builder.addRaw(`export { ${className} } from "./service";
export type { ${className}ServiceInterface, Database } from "./service";`);

  return builder.toString();
}
