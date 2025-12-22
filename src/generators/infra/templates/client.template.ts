/**
 * Infrastructure Client Export Template
 *
 * Generates client.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { generateStandardErrorExports } from '../../../utils/templates';
import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate client.ts file for infrastructure service
 */
export function generateClientFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeClientServer } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Only generate if client/server mode is enabled
  if (!includeClientServer) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `${scope}/infra-${fileName}/client`,
    description: `Client-side exports for ${className} infrastructure service.\nContains React hooks, client-specific layers, and browser-safe functionality.`,
    module: `${scope}/infra-${fileName}/client`,
  });

  builder.addRaw(`// React hooks
export { use${className} } from "./lib/client/hooks/use-${fileName}";

// Client layers (browser-safe)
export { ${className}ServiceClientLayers } from "./lib/layers/client-layers";

// Service interface
export { ${className}Service } from "./lib/service/service";

// Errors (universal)
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
