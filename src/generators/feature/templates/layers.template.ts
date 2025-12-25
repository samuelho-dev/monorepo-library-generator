/**
 * Layers Template
 *
 * Generates server/layers.ts file for feature libraries.
 * Uses the layer factory pattern for consistent, maintainable layer generation.
 *
 * @module monorepo-library-generator/feature/layers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { createNamingVariants } from "../../../utils/naming"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import {
  createAutoLayer,
  createInfrastructureLayers,
  getInfraPackageName,
  INFRASTRUCTURE_SERVICES
} from "../../shared/factories"

/**
 * Generate server/layers.ts file for feature library
 *
 * Creates layer composition for different environments.
 *
 * Event/job publishing is handled IN the service implementation using helpers:
 * - withEventPublishing: Wraps individual Effects with event publishing
 * - withJobEnqueuing: Wraps individual Effects with job enqueuing
 */
export function generateLayersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Build sub-module layer lists if provided
  const subModuleLiveLayers = options.subModules
    ? options.subModules.map((s) => `${createNamingVariants(s).className}Live`)
    : []
  const subModuleTestLayers = options.subModules
    ? options.subModules.map((s) => `${createNamingVariants(s).className}Test`)
    : []

  // File header
  builder.addFileHeader({
    title: `${className} Layers`,
    description: `Layer composition for ${name} feature.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Test: Testing with in-memory infrastructure
- Dev: Development with local infrastructure
- Auto: Automatically selects based on NODE_ENV

Event publishing is done IN the service implementation using helpers:
- withEventPublishing(effect, buildEvent, topic)
- withJobEnqueuing(effect, buildJob, queue)`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([{ from: "effect", imports: ["Layer"] }])
  builder.addBlankLine()

  builder.addSectionComment("Service Layer")
  builder.addRaw(`import { ${className}Service } from "./service";`)
  builder.addBlankLine()

  // Add sub-module service imports if subModules are provided
  // Sub-modules are in sibling directories: ./authentication/, ./profile/, etc.
  if (options.subModules && options.subModules.length > 0) {
    builder.addSectionComment("Sub-Module Service Layers")
    for (const subModule of options.subModules) {
      const subClassName = createNamingVariants(subModule).className
      builder.addRaw(
        `import { ${subClassName}Live, ${subClassName}Test } from "./${subModule}";`
      )
    }
    builder.addBlankLine()
  }

  builder.addSectionComment("Data Access Layer")
  builder.addRaw(`import { ${className}Repository } from "${scope}/data-access-${fileName}";`)
  builder.addBlankLine()

  // Infrastructure imports (grouped by package to avoid duplicate imports)
  builder.addSectionComment("Infrastructure Layers")
  const packageToServices = new Map<string, Array<string>>()
  for (const service of INFRASTRUCTURE_SERVICES.feature) {
    const packageName = getInfraPackageName(service)
    const existing = packageToServices.get(packageName) ?? []
    existing.push(service)
    packageToServices.set(packageName, existing)
  }
  const infraImports = Array.from(packageToServices.entries())
    .map(([packageName, services]) => {
      return `import { ${services.join(", ")} } from "${scope}/infra-${packageName}";`
    })
    .join("\n")
  builder.addRaw(infraImports)
  builder.addBlankLine()

  // Environment config import
  builder.addSectionComment("Environment Configuration")
  builder.addRaw(`import { env } from "${scope}/env";`)
  builder.addBlankLine()

  // Service layer notes
  builder.addSectionComment("Service Layer Notes")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Service Layer Pattern:
 *
 * Event/job publishing is handled INSIDE the service implementation
 * using the withEventPublishing/withJobEnqueuing helpers. This keeps
 * the layer composition simple and the event logic explicit.
 *
 * @see ${className}Service.Live - service implementation with events
 */`)
  builder.addBlankLine()

  // Generate infrastructure layers using factory
  builder.addSectionComment("Composed Infrastructure Layers")
  builder.addBlankLine()

  createInfrastructureLayers({
    services: [...INFRASTRUCTURE_SERVICES.feature],
    scope,
    includeDev: true
  })(builder)

  // Generate feature layers with sub-module support
  builder.addSectionComment("Full Feature Layers")
  builder.addBlankLine()

  const subModuleComment = options.subModules
    ? `\n * - Sub-module services: ${options.subModules.map((s) => createNamingVariants(s).className).join(", ")}`
    : ""

  // Live layer with sub-modules
  const liveServices = [
    `${className}Service.Live`,
    `${className}Repository.Live`,
    ...subModuleLiveLayers
  ]

  builder.addRaw(`/**
 * Full Live Layer for production
 *
 * Includes all ${name} feature layers with live infrastructure:
 * - ${className}Service.Live (event publishing in service implementation)
 * - ${className}Repository.Live${subModuleComment}
 * - All infrastructure services
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* ${className}Service;
 *   const entity = yield* service.create({ name: "test" });
 * });
 *
 * program.pipe(Effect.provide(${className}FeatureLive));
 * \`\`\`
 */
export const ${className}FeatureLive = Layer.mergeAll(
  ${liveServices.join(",\n  ")}
).pipe(Layer.provide(InfrastructureLive));`)
  builder.addBlankLine()

  // Test layer
  const testServices = [
    `${className}Service.Live`,
    `${className}Repository.Live`,
    ...subModuleTestLayers
  ]

  builder.addRaw(`/**
 * Full Test Layer for testing
 *
 * Uses ${className}Service.Live directly (no event publishing) for isolated unit tests.
 * Events are NOT published in test mode.
 *
 * @example
 * \`\`\`typescript
 * describe("${className}Service", () => {
 *   it("should create entity", () =>
 *     Effect.gen(function*() {
 *       const service = yield* ${className}Service;
 *       const result = yield* service.create({ name: "test" });
 *       // No events published - isolated unit test
 *       expect(result).toBeDefined();
 *     }).pipe(Effect.provide(${className}FeatureTest))
 *   );
 * });
 * \`\`\`
 */
export const ${className}FeatureTest = Layer.mergeAll(
  ${testServices.join(",\n  ")}
).pipe(Layer.provide(InfrastructureTest));`)
  builder.addBlankLine()

  // Dev layer
  builder.addRaw(`/**
 * Full Dev Layer for development
 *
 * Uses local services with verbose logging and debugging enabled.
 */
export const ${className}FeatureDev = Layer.mergeAll(
  ${liveServices.join(",\n  ")}
).pipe(Layer.provide(InfrastructureDev));`)
  builder.addBlankLine()

  // Auto layer using factory
  createAutoLayer({
    className,
    layerPrefix: "Feature",
    includeDev: true
  })(builder)

  return builder.toString()
}
