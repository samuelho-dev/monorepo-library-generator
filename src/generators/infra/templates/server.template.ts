/**
 * Infrastructure Server Export Template
 *
 * Generates server.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { generateStandardErrorExports } from '../../../utils/templates';
import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate server.ts file for infrastructure service
 */
export function generateServerFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // File header
  builder.addFileHeader({
    title: `${scope}/infra-${fileName}/server`,
    description: `Server-side exports for ${className} infrastructure service.\nContains service implementations, layers, and server-specific functionality.`,
    module: `${scope}/infra-${fileName}/server`,
  });

  builder.addRaw(`// Service layers (server-specific)
export {
  ${className}ServiceLive,
  ${className}ServiceTest,
  ${className}ServiceDev,
} from "./lib/layers/server-layers";

// Configuration
export { default${className}Config, get${className}ConfigForEnvironment } from "./lib/service/config";

// Service interface
export { ${className}Service } from "./lib/service/service";

// Memory provider (for testing)
export {
  Memory${className}Provider,
  Memory${className}ProviderLive,
} from "./lib/providers/memory";

// Errors
`);

  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: './lib/service/errors',
      unionTypeSuffix: 'ServiceError',
    }),
  );

  return builder.toString();
}
