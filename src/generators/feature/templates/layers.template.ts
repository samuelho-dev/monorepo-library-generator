/**
 * Layers Template
 *
 * Generates server/layers.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/layers-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate server/layers.ts file for feature library
 *
 * Creates layer composition for different environments.
 */
export function generateLayersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} Layers`,
    description: `Layer composition for ${name} feature.
Provides different layer implementations for different environments.`,
  });

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Layer'] },
    { from: './service', imports: [`${className}Service`] },
    { from: `${scope}/env`, imports: ['env'] },
  ]);
  builder.addBlankLine();

  // Add Live layer export
  builder.addRaw(`/**
 * Live layer for production
 *
 * Pre-wired with ${className}Repository dependency.
 * Requires repository layer to be provided.
 */
export const ${className}ServiceLive = ${className}Service.Live;`);
  builder.addBlankLine();

  // Add Test layer export
  builder.addRaw(`/**
 * Test layer for testing
 *
 * Uses in-memory mock implementation.
 */
export const ${className}ServiceTest = ${className}Service.Test;`);
  builder.addBlankLine();

  // Add Auto layer
  builder.addRaw(`/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * Uses Layer.suspend for lazy evaluation - the layer is selected at runtime
 * when the layer is first used, not at module import time.
 *
 * Environment mapping:
 * - test: Uses ${className}ServiceTest
 * - production/default: Uses ${className}ServiceLive
 */
export const ${className}ServiceAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return ${className}ServiceTest;
    default:
      return ${className}ServiceLive;
  }
});`);
  builder.addBlankLine();

  return builder.toString();
}
