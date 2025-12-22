/**
 * Data Access Layers Template
 *
 * Generates server/layers.ts file for data-access libraries with Effect layer compositions.
 *
 * @module monorepo-library-generator/data-access/layers-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { DataAccessTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate server/layers.ts file for data-access library
 *
 * Creates Effect layer compositions with infrastructure dependencies
 */
export function generateLayersFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Data Access Layers`,
    description: `Effect layer compositions for dependency injection of ${domainName} repositories.

@see https://effect.website/docs/guides/context-management for layer composition`,
    module: `${scope}/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  builder.addImports([
    { from: 'effect', imports: ['Layer'] },
    { from: '../repository', imports: [`${className}Repository`] },
    { from: `${scope}/infra-database`, imports: ['DatabaseService'] },
  ]);
  builder.addBlankLine();

  builder.addSectionComment('Layer Compositions');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Repository Live Layer
 *
 * Production layer with DatabaseService dependency.
 * Compose with DatabaseService.Live for production use.
 *
 * @example
 * \`\`\`typescript
 * const RepositoryLayer = ${className}RepositoryLive.pipe(
 *   Layer.provide(DatabaseService.Live)
 * );
 * \`\`\`
 */
export const ${className}RepositoryLive = ${className}Repository.Live;

/**
 * ${className} Repository with Database Layer
 *
 * Fully composed layer for production use.
 * Includes DatabaseService.Live dependency.
 */
export const ${className}RepositoryLayer = ${className}Repository.Live.pipe(
  Layer.provide(DatabaseService.Live)
);

/**
 * ${className} Repository Test Layer
 *
 * For testing, compose with DatabaseService.Test:
 *
 * @example
 * \`\`\`typescript
 * const TestLayer = ${className}Repository.Live.pipe(
 *   Layer.provide(DatabaseService.Test)
 * );
 *
 * it.scoped("should work", () =>
 *   Effect.gen(function* () {
 *     const repo = yield* ${className}Repository;
 *     // test operations
 *   }).pipe(Effect.provide(TestLayer))
 * );
 * \`\`\`
 */
export const ${className}RepositoryTestLayer = ${className}Repository.Live.pipe(
  Layer.provide(DatabaseService.Test)
);`);
  builder.addBlankLine();

  return builder.toString();
}
