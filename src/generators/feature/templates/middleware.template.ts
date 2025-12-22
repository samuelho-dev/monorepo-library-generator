/**
 * Middleware Template
 *
 * Generates edge/middleware.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/middleware-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate edge/middleware.ts file for feature library
 *
 * Creates edge middleware for Vercel Edge, Cloudflare Workers, etc.
 */
export function generateMiddlewareFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name, propertyName } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} Edge Middleware`,
    description: `Edge runtime middleware for ${name} feature.
Compatible with Vercel Edge, Cloudflare Workers, etc.`,
  });

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Effect'] }]);
  builder.addBlankLine();

  // Add middleware
  builder.addRaw(`/**
 * Edge middleware for ${name}
 *
 * TODO: Implement edge middleware logic
 */
export const ${propertyName}Middleware = Effect.gen(function* () {
  // TODO: Implement middleware logic
  // Example: authentication, rate limiting, request validation

  yield* Effect.logInfo("${className} edge middleware executed");
});`);
  builder.addBlankLine();

  return builder.toString();
}
