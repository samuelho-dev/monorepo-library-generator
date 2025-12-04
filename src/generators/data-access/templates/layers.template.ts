/**
 * Data Access Layers Template
 *
 * Generates server/layers.ts file for data-access libraries with Effect layer compositions.
 *
 * @module monorepo-library-generator/data-access/layers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server/layers.ts file for data-access library
 *
 * Creates Effect layer compositions including:
 * - Live layer (production)
 * - Test layer (in-memory)
 * - Dev layer (with logging)
 * - Auto layer (environment-based selection)
 */
export function generateLayersFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName

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
    module: `@custom-repo/data-access-${fileName}/server`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Layer"] },
    { from: "../repository.js", imports: [`${className}Repository`] }
  ])
  builder.addBlankLine()

  // Environment-Specific Layers
  builder.addSectionComment("Environment-Specific Layers")
  builder.addBlankLine()

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
export const ${className}RepositoryLive = ${className}Repository.Live;`)
  builder.addBlankLine()

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
 * import { ${className}RepositoryTest } from "@custom-repo/data-access-${fileName}/server";
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
export const ${className}RepositoryTest = ${className}Repository.Test;`)
  builder.addBlankLine()

  // Dev Layer
  builder.addRaw(`/**
 * ${className} Repository Dev Layer
 *
 * Development environment layer with enhanced logging and debugging.
 * Useful for local development and debugging repository operations.
 *
 * Features:
 * - Operation logging and timing
 * - Error details and stack traces
 * - Query inspection
 *
 * The Dev repository layer includes enhanced console logging for all operations.
 */
export const ${className}RepositoryDev = ${className}Repository.Dev;`)
  builder.addBlankLine()

  // Auto Layer
  builder.addRaw(`/**
 * ${className} Repository Auto Layer
 *
 * Automatically selects appropriate layer based on NODE_ENV.
 * - test: Uses in-memory layer for test isolation
 * - development: Uses layer with debugging/logging
 * - production: Uses live layer with real infrastructure
 *
 * Usage:
 * \`\`\`typescript
 * // Automatically picks correct layer based on environment
 * Effect.provide(${className}RepositoryAuto)
 * \`\`\`
 */
export const ${className}RepositoryAuto = (() => {
  const env = process.env["NODE_ENV"] || "production";

  switch (env) {
    case "test":
      return ${className}RepositoryTest;
    case "development":
      return ${className}RepositoryDev;
    default:
      return ${className}RepositoryLive;
  }
})();`)
  builder.addBlankLine()

  return builder.toString()
}
