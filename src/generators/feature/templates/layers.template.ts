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

  builder.addFileHeader({
    title: `${className} Layers`,
    description: `Layer composition for ${name} feature.
Provides different layer implementations for different environments.`,
  });

  builder.addImports([
    { from: 'effect', imports: ['Layer'] },
    { from: './service', imports: [`${className}Service`] },
    { from: `${scope}/env`, imports: ['env'] },
  ]);
  builder.addBlankLine();

  builder.addRaw(`/**
 * Live layer for production
 *
 * Pre-wired with ${className}Repository dependency.
 * Requires repository layer to be provided.
 */
export const ${className}ServiceLive = ${className}Service.Live;

/**
 * Full layer for production
 *
 * Includes all dependencies (Repository, DatabaseService).
 */
export const ${className}ServiceLayer = ${className}Service.Layer;

/**
 * Test layer for testing
 *
 * Uses DatabaseService.Test for in-memory database.
 */
export const ${className}ServiceTestLayer = ${className}Service.TestLayer;

/**
 * Auto layer - automatically selects based on NODE_ENV
 */
export const ${className}ServiceAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return ${className}ServiceTestLayer;
    default:
      return ${className}ServiceLayer;
  }
});`);
  builder.addBlankLine();

  return builder.toString();
}
