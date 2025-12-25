/**
 * Feature Sub-Module Layer Template
 *
 * Generates layer.ts for feature sub-modules with proper Effect imports.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * Fixes Gap #5: Includes proper Effect import for layer composition
 *
 * @module monorepo-library-generator/feature/sub-module/layer-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

export interface SubModuleLayerOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Parent file name (e.g., 'order') */
  parentFileName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate layer.ts for a feature sub-module
 *
 * Creates proper Layer composition with all dependencies
 */
export function generateSubModuleLayerFile(options: SubModuleLayerOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentFileName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Layer`,
    description: `Layer composition for ${subModuleName} sub-module within the ${parentName} feature.

Provides Live and Test layers with proper dependency composition.
All infrastructure dependencies are properly wired.`,
    module: `${scope}/feature-${parentFileName}/server/services/${subModuleName}`
  })

  // Fix Gap #5: Include Layer import (Effect is only used in JSDoc examples)
  builder.addImports([{ from: "effect", imports: ["Layer"] }])

  builder.addSectionComment("Service Import")
  builder.addRaw(
    `import { ${subModuleClassName}ServiceLive } from "./service"
`
  )

  builder.addSectionComment("Data Access Import")
  builder.addRaw(
    `import { ${subModuleClassName}RepositoryLive, ${subModuleClassName}RepositoryTest } from "${scope}/data-access-${parentFileName}/${subModuleName}"
`
  )

  builder.addSectionComment("Infrastructure Imports")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] }
  ])

  builder.addSectionComment("Live Layer Composition")

  builder.addRaw(`/**
 * ${subModuleClassName}Live Layer
 *
 * Full production layer with all dependencies composed:
 * - ${subModuleClassName}Service (business logic)
 * - ${subModuleClassName}Repository (data access)
 * - LoggingService (structured logging)
 * - MetricsService (observability)
 * - DatabaseService (persistence)
 *
 * @example
 * \`\`\`typescript
 * import { ${subModuleClassName}Live } from "${scope}/feature-${parentFileName}/server/services/${subModuleName}";
 *
 * const program = Effect.gen(function*() {
 *   const service = yield* ${subModuleClassName}Service;
 *   return yield* service.getById(id);
 * });
 *
 * const result = yield* program.pipe(
 *   Effect.provide(${subModuleClassName}Live)
 * );
 * \`\`\`
 */
export const ${subModuleClassName}Live = ${subModuleClassName}ServiceLive.pipe(
  Layer.provide(${subModuleClassName}RepositoryLive),
  Layer.provide(LoggingService.Live),
  Layer.provide(MetricsService.Live),
  Layer.provide(DatabaseService.Live)
)`)

  builder.addSectionComment("Test Layer Composition")

  builder.addRaw(`/**
 * ${subModuleClassName}Test Layer
 *
 * Test layer with mocked infrastructure:
 * - ${subModuleClassName}RepositoryTest (in-memory store)
 * - LoggingService.Test (test logger)
 * - MetricsService.Test (test metrics)
 *
 * @example
 * \`\`\`typescript
 * import { ${subModuleClassName}Test } from "${scope}/feature-${parentFileName}/server/services/${subModuleName}";
 *
 * const testProgram = Effect.gen(function*() {
 *   const service = yield* ${subModuleClassName}Service;
 *   const result = yield* service.create({ ... });
 *   // assertions
 * });
 *
 * await Effect.runPromise(testProgram.pipe(
 *   Effect.provide(${subModuleClassName}Test)
 * ));
 * \`\`\`
 */
export const ${subModuleClassName}Test = ${subModuleClassName}ServiceLive.pipe(
  Layer.provide(${subModuleClassName}RepositoryTest),
  Layer.provide(LoggingService.Test),
  Layer.provide(MetricsService.Test)
)`)

  builder.addSectionComment("Dependencies Layer (for parent composition)")

  builder.addRaw(`/**
 * ${subModuleClassName}Dependencies Layer
 *
 * Layer that provides just the ${subModuleClassName}Service.
 * Use this when composing with parent service layers.
 *
 * The parent service should provide:
 * - Repository layer
 * - Infrastructure layers
 */
export const ${subModuleClassName}Dependencies = ${subModuleClassName}ServiceLive`)

  return builder.toString()
}
