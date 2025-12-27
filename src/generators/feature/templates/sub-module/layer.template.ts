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

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

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
  builder.addImports([{ from: 'effect', imports: ['Layer'] }])

  builder.addSectionComment('Service Import')
  builder.addRaw(
    `import { ${subModuleClassName}ServiceLive } from "./service"
`
  )

  builder.addSectionComment('Data Access Import')
  // Data-access libraries don't have sub-modules - use parent repository
  builder.addRaw(
    `import { ${parentClassName}Repository } from "${scope}/data-access-${parentFileName}"
`
  )

  builder.addSectionComment('Infrastructure Imports')
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ['LoggingService', 'MetricsService'] },
    { from: `${scope}/infra-database`, imports: ['DatabaseService'] }
  ])

  builder.addSectionComment('Live Layer Composition')

  builder.addRaw(`/**
 * ${subModuleClassName}Live Layer
 *
 * Full production layer with all dependencies composed:
 * - ${subModuleClassName}Service (business logic)
 * - ${parentClassName}Repository (data access via parent)
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
 *   return yield* service.getById(id)
 * })
 *
 * const result = yield* program.pipe(
 *   Effect.provide(${subModuleClassName}Live)
 * )
 * \`\`\`
 */
export const ${subModuleClassName}Live = ${subModuleClassName}ServiceLive.pipe(
  Layer.provide(${parentClassName}Repository.Live),
  Layer.provide(LoggingService.Live),
  Layer.provide(MetricsService.Live),
  Layer.provide(DatabaseService.Live)
)`)

  builder.addSectionComment('Test Layer Composition')

  builder.addRaw(`/**
 * ${subModuleClassName}Test Layer
 *
 * Test layer with mocked infrastructure:
 * - ${parentClassName}Repository.Test (in-memory store)
 * - LoggingService.Test (test logger)
 * - MetricsService.Test (test metrics)
 *
 * @example
 * \`\`\`typescript
 * import { ${subModuleClassName}Test } from "${scope}/feature-${parentFileName}/server/services/${subModuleName}";
 *
 * const testProgram = Effect.gen(function*() {
 *   const service = yield* ${subModuleClassName}Service;
 *   const result = yield* service.create({ ... })
 *   // assertions
 * })
 *
 * await Effect.runPromise(testProgram.pipe(
 *   Effect.provide(${subModuleClassName}Test)
 * ))
 * \`\`\`
 */
export const ${subModuleClassName}Test = ${subModuleClassName}ServiceLive.pipe(
  Layer.provide(${parentClassName}Repository.Test),
  Layer.provide(LoggingService.Test),
  Layer.provide(MetricsService.Test)
)`)

  builder.addSectionComment('Dependencies Layer (for parent composition)')

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
