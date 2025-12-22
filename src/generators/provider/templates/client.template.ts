/**
 * Provider Client Export Template
 *
 * Generates client.ts export file for provider libraries.
 *
 * @module monorepo-library-generator/provider-templates
 */

import { generateStandardErrorExports } from '../../../utils/templates';
import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../utils/types';

/**
 * Generate client.ts file for provider service
 */
export function generateClientFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, packageName } = options;

  // File header
  builder.addFileHeader({
    title: `${packageName}/client`,
    description: `Client-side exports for ${className} provider.\nContains browser-compatible service implementations and types.`,
    module: `${packageName}/client`,
  });

  builder.addRaw(`// Service implementation (client-compatible)
export { ${className} } from "./lib/service";

// Client-safe types only (no Node.js dependencies)
export type * from "./lib/types";

// Errors
`);

  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: './lib/errors',
      unionTypeSuffix: 'ServiceError',
    }),
  );

  return builder.toString();
}
