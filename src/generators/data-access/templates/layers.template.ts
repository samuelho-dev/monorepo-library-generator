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
 * Creates Effect layer compositions including:
 * - Live layer (production)
 * - Test layer (in-memory)
 * - Auto layer (environment-based selection)
 */
export function generateLayersFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} Data Access Layers`,
    description: `Effect layer compositions for dependency injection of ${domainName} repositories.
Provides Live, Test, and Auto environment-based layer selection.

@see https://effect.website/docs/guides/context-management for layer composition`,
    module: `${scope}/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: '../repository', imports: [`${className}Repository`] },
    { from: `${scope}/env`, imports: ['env'] },
  ]);
  builder.addBlankLine();

  // Environment-Specific Layers
  builder.addSectionComment('Environment-Specific Layers');
  builder.addBlankLine();

  // Live Layer
  builder.addRaw(`/**
 * ${className} Repository Live Layer
 *
 * Production environment layer.
 * Provides ${className}Repository with all required dependencies.
 *
 * If your repository implementation needs infrastructure services
 * (like KyselyService or LoggingService), uncomment the dependencies
 * in the repository.template.ts file and ensure they're provided when
 * using this layer in your application.
 */
export const ${className}RepositoryLive = ${className}Repository.Live;`);
  builder.addBlankLine();

  // Test Layer
  builder.addRaw(`/**
 * ${className} Repository Test Layer
 *
 * Testing environment layer using in-memory storage.
 * Provides isolated ${className}Repository for test cases.
 *
 * This layer is self-contained and requires no additional dependencies.
 *
 * Usage in tests:
 * \`\`\`typescript
 * import { ${className}RepositoryTest } from "${scope}/data-access-${fileName}/server";
 *
 * describe("${className} Repository", () => {
 *   it("should find entity by id", () =>
 *     Effect.gen(function* () {
 *       const repo = yield* ${className}Repository;
 *       // ... test operations
 *     }).pipe(Effect.provide(${className}RepositoryTest))
 *   );
 * });
 * \`\`\`
 */
export const ${className}RepositoryTest = ${className}Repository.Test;`);
  builder.addBlankLine();

  // Auto Layer
  builder.addRaw(`/**
 * ${className} Repository Auto Layer
 *
 * Automatically selects appropriate layer based on NODE_ENV.
 * - test: Uses in-memory layer for test isolation
 * - production/development: Uses live layer with real infrastructure
 *
 * Usage:
 * \`\`\`typescript
 * // Automatically picks correct layer based on environment
 * Effect.provide(${className}RepositoryAuto)
 * \`\`\`
 */
export const ${className}RepositoryAuto = (() => {
  switch (env.NODE_ENV) {
    case "test":
      return ${className}RepositoryTest;
    default:
      return ${className}RepositoryLive;
  }
})();`);
  builder.addBlankLine();

  return builder.toString();
}
