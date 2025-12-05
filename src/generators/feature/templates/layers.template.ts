/**
 * Layers Template
 *
 * Generates server/layers.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/layers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate server/layers.ts file for feature library
 *
 * Creates layer composition for different environments.
 */
export function generateLayersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Layers`,
    description: `Layer composition for ${name} feature.
Provides different layer implementations for different environments.`
  })

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer"] },
    { from: "./service", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  // Add Live layer
  builder.addRaw(`/**
 * Live layer for production
 */
export const ${className}ServiceLive = ${className}Service.Live;`)
  builder.addBlankLine()

  // Add Test layer
  builder.addRaw(`/**
 * Test layer with mock implementations
 * Uses Layer.succeed with plain object for deterministic testing
 */
export const ${className}ServiceTest = Layer.succeed(
  ${className}Service,
  {
    exampleOperation: () => Effect.void,
  }
);`)
  builder.addBlankLine()

  // Add Dev layer
  builder.addRaw(`/**
 * Dev layer for development environment
 *
 * Development layer with enhanced logging for debugging.
 * Useful for local development to see operation flow.
 *
 * Uses Layer.effect for dependency injection without cleanup.
 * If your service needs resource cleanup, switch to Layer.scoped.
 */
export const ${className}ServiceDev = Layer.effect(
  ${className}Service,
  Effect.gen(function () {
    // TODO: Inject dependencies as needed
    // const userRepo = yield* UserRepository;
    // const logger = yield* LoggingService;

    console.log("[${className}] Development layer initialized");

    return {
      exampleOperation: () =>
        Effect.gen(function () {
          console.log("[${className}] [DEV] exampleOperation starting");
          console.log("[${className}] [DEV] exampleOperation completed");
          return Effect.void;
        }),
    };
  })
);`)
  builder.addBlankLine()

  // Add Auto layer
  builder.addRaw(`/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * Environment mapping:
 * - test: Uses ${className}ServiceTest (mocks)
 * - development: Uses ${className}ServiceDev (with logging)
 * - production: Uses ${className}ServiceLive (production)
 * - default: Uses ${className}ServiceLive
 */
export const ${className}ServiceAuto = (() => {
  const env = process.env["NODE_ENV"] || "production";

  switch (env) {
    case "test":
      return ${className}ServiceTest;
    case "development":
      return ${className}ServiceDev;
    case "production":
      return ${className}ServiceLive;
    default:
      return ${className}ServiceLive;
  }
})();`)
  builder.addBlankLine()

  return builder.toString()
}
