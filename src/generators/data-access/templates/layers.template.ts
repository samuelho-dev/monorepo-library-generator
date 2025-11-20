/**
 * Data Access Layers Template
 *
 * Generates server/layers.ts file for data-access libraries with Effect layer compositions.
 *
 * @module monorepo-library-generator/data-access/layers-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { DataAccessTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate server/layers.ts file for data-access library
 *
 * Creates Effect layer compositions including:
 * - Live layer (production)
 * - Test layer (in-memory)
 * - Dev layer (with logging)
 * - Auto layer (environment-based selection)
 */
export function generateLayersFile(options: DataAccessTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addFileHeader({
    title: `${className} Data Access Layers`,
    description: `Effect layer compositions for dependency injection of ${domainName} repositories.
Provides Live, Test, Dev, and Auto environment-based layer selection.

TODO: Customize this file:
1. Update imports to match actual repository implementation location
2. Compose with infrastructure layers (database, cache, etc.)
3. Add repository-specific configuration if needed
4. Define layer composition order and dependencies
5. Add error handling wrapping if needed

@see https://effect.website/docs/guides/context-management for layer composition`,
    module: `@custom-repo/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Layer'] },
    { from: '../repository.js', imports: [`${className}Repository`] },
  ]);
  builder.addBlankLine();

  // Environment-Specific Layers
  builder.addSectionComment('Environment-Specific Layers');
  builder.addBlankLine();

  // Live Layer
  builder.addRaw(`/**
 * ${className} Data Access Live Layer
 *
 * Production environment layer using real database connections.
 * Provides ${className}Repository for data access operations.
 *
 * TODO: Compose with infrastructure layers
 * Example:
 * \`\`\`typescript
 * export const ${className}DataAccessLive = Layer.mergeAll(
 *   ${className}Repository.Live,
 *   DatabaseLayer,
 *   CacheLayer,
 * ).pipe(Layer.provide(InfrastructureLayer));
 * \`\`\`
 */
export const ${className}DataAccessLive = Layer.mergeAll(
  ${className}Repository.Live,
  // TODO: Add infrastructure dependencies
  // Example: DatabaseLayer, CacheLayer, LoggingLayer
);`);
  builder.addBlankLine();

  // Test Layer
  builder.addRaw(`/**
 * ${className} Data Access Test Layer
 *
 * Testing environment layer using in-memory storage.
 * Provides isolated ${className}Repository for test cases.
 *
 * Usage in tests:
 * \`\`\`typescript
 * import { ${className}DataAccessTest } from "@custom-repo/data-access-${fileName}/server";
 *
 * describe("${className} Repository", () => {
 *   it("should find entity by id", () =>
 *     Effect.gen(function* () {
 *       const repo = yield* ${className}Repository;
 *       // ... test operations
 *     }).pipe(Effect.provide(${className}DataAccessTest))
 *   );
 * });
 * \`\`\`
 */
export const ${className}DataAccessTest = Layer.mergeAll(
  ${className}Repository.Test,
  // TODO: Add test-specific layers if needed
);`);
  builder.addBlankLine();

  // Dev Layer
  builder.addRaw(`/**
 * ${className} Data Access Dev Layer
 *
 * Development environment layer with logging and debugging.
 * Useful for local development and debugging repository operations.
 *
 * Features:
 * - Operation logging and timing
 * - Error details and stack traces
 * - Query inspection
 */
export const ${className}DataAccessDev = Layer.mergeAll(
  ${className}Repository.Dev,
  // TODO: Add development-specific layers
  // Example: DetailedLoggingLayer, PerformanceMonitoringLayer
);`);
  builder.addBlankLine();

  // Auto Layer
  builder.addRaw(`/**
 * ${className} Data Access Auto Layer
 *
 * Automatically selects appropriate layer based on NODE_ENV.
 * - test: Uses in-memory layer for test isolation
 * - development: Uses layer with debugging/logging
 * - production: Uses live layer with real infrastructure
 *
 * Usage:
 * \`\`\`typescript
 * // Automatically picks correct layer based on environment
 * Effect.provide(${className}DataAccessAuto)
 * \`\`\`
 */
export const ${className}DataAccessAuto = (() => {
  const env = process.env["NODE_ENV"] || "production";

  switch (env) {
    case "test":
      return ${className}DataAccessTest;
    case "development":
      return ${className}DataAccessDev;
    default:
      return ${className}DataAccessLive;
  }
})();`);
  builder.addBlankLine();

  // Add TODO comment for additional layer compositions
  builder.addRaw(`// TODO: Export specific composition for common scenarios
//
// export const ${className}DataAccessWithCache = Layer.mergeAll(
//   ${className}DataAccessLive,
//   CacheLayer,
// );
//
// export const ${className}DataAccessWithTracing = Layer.mergeAll(
//   ${className}DataAccessLive,
//   DistributedTracingLayer,
// );
`);

  return builder.toString();
}
