/**
 * Infrastructure Edge Export Template
 *
 * Generates edge.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import { generateStandardErrorExports } from '../../../utils/templates';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate edge.ts file for infrastructure service
 */
export function generateEdgeFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeEdge } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Only generate if edge mode is enabled
  if (!includeEdge) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `${scope}/infra-${fileName}/edge`,
    description: `Edge runtime exports for ${className} infrastructure service.\nContains edge-specific layers and functionality for edge runtime environments.`,
    module: `${scope}/infra-${fileName}/edge`,
  });

  builder.addRaw(`// Edge layers (edge runtime-safe)
export { ${className}ServiceEdgeLayers } from "./lib/layers/edge-layers";

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
