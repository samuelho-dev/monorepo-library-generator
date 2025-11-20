/**
 * Infrastructure Client Export Template
 *
 * Generates client.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { generateStandardErrorExports } from '../../../utils/code-generation/barrel-export-utils';
import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { InfraTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate client.ts file for infrastructure service
 */
export function generateClientFile(options: InfraTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeClientServer } = options;

  // Only generate if client/server mode is enabled
  if (!includeClientServer) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `@custom-repo/infra-${fileName}/client`,
    description: `Client-side exports for ${className} infrastructure service.\nContains React hooks, client-specific layers, and browser-safe functionality.`,
    module: `@custom-repo/infra-${fileName}/client`,
  });

  builder.addRaw(`// React hooks
export { use${className} } from "./lib/client/hooks/use-${fileName}";

// Client layers (browser-safe)
export { ${className}ServiceClientLayers } from "./lib/layers/client-layers";

// Service interface
export { ${className}Service } from "./lib/service/interface";

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
