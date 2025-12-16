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
    { from: "./service", imports: [`${className}Service`] },
    { from: "../shared/types", imports: [`${className}Result`], isTypeOnly: true }
  ])
  builder.addBlankLine()

  // Resource Management Documentation
  builder.addRaw("// ".repeat(38))
  builder.addRaw("// Resource Management")
  builder.addRaw("// ".repeat(38))
  builder.addRaw("//")
  builder.addRaw("// Layer.effect: Stateless business logic (default)")
  builder.addRaw("// Layer.scoped: Services managing resources (WebSocket, files, workers)")
  builder.addRaw("//")
  builder.addRaw("// Example with cleanup:")
  builder.addRaw("//   const resource = yield* Effect.acquireRelease(")
  builder.addRaw("//     Effect.sync(() => openConnection()),  // acquire")
  builder.addRaw("//     (r) => Effect.sync(() => r.close())    // release")
  builder.addRaw("//   );")
  builder.addRaw("//")
  builder.addRaw("// See EFFECT_PATTERNS.md for complete examples")
  builder.addRaw("//")
  builder.addRaw("// ".repeat(38))
  builder.addBlankLine()

  // Add Live layer
  builder.addRaw(`/**
 * Live layer for production
 */
export const ${className}ServiceLive = ${className}Service.Live;`)
  builder.addBlankLine()

  // Add comment about Test layer location (Pattern B)
  builder.addRaw(`/**
 * Test Layer Location (Pattern B)
 *
 * The Test layer is defined as a static property on ${className}Service.
 * Import and use it as: ${className}Service.Test
 *
 * This pattern (Pattern B) keeps test implementations co-located with
 * service definitions for better discoverability.
 *
 * See: service/service.ts for the Test layer definition
 * See: TESTING_PATTERNS.md for Pattern B documentation
 */`)
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
  Effect.sync(() => {
    // TODO: Inject dependencies as needed via Effect.gen if you need to yield dependencies
    // Effect.gen(function* () {
    //   const userRepo = yield* UserRepository;
    //   const logger = yield* LoggingService;
    //   ...
    // })

    console.log("[${className}] Development layer initialized");

    return {
      exampleOperation: () =>
        Effect.sync(() => {
          console.log("[${className}] [DEV] exampleOperation starting");
          console.log("[${className}] [DEV] exampleOperation completed");
          return {} as ${className}Result;
        }),
    };
  })
);`)
  builder.addBlankLine()

  // Add Auto layer
  builder.addRaw(`/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * Uses Layer.suspend for lazy evaluation - the layer is selected at runtime
 * when the layer is first used, not at module import time.
 *
 * Environment mapping:
 * - test: Uses ${className}Service.Test (Pattern B - static property)
 * - development: Uses ${className}ServiceDev (with logging)
 * - production: Uses ${className}ServiceLive (production)
 * - default: Uses ${className}ServiceLive
 */
export const ${className}ServiceAuto = Layer.suspend(() => {
  const env = process.env["NODE_ENV"] || "production";

  switch (env) {
    case "test":
      return ${className}Service.Test;
    case "development":
      return ${className}ServiceDev;
    case "production":
      return ${className}ServiceLive;
    default:
      return ${className}ServiceLive;
  }
});`)
  builder.addBlankLine()

  return builder.toString()
}
