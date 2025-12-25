/**
 * Layer Template Factory
 *
 * Factory functions for generating Effect layer compositions from configuration objects.
 * Provides standardized layer patterns for infrastructure, domain, and auto-selecting layers.
 *
 * @module monorepo-library-generator/generators/shared/factories/layer-factory
 *
 * @example
 * ```typescript
 * import { createInfrastructureLayers, createDomainLayers } from './layer-factory';
 *
 * const builder = new TypeScriptBuilder()
 *
 * createInfrastructureLayers({
 *   services: ['DatabaseService', 'LoggingService', 'MetricsService', 'CacheService'],
 *   scope: '@myorg',
 * })(builder)
 *
 * createDomainLayers({
 *   className: 'User',
 *   domainServices: ['Repository', 'Cache'],
 *   environments: ['Live', 'Test', 'Dev'],
 *   libraryType: 'data-access',
 * })(builder)
 * ```
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { LayerFactoryConfig } from "./types"

// ============================================================================
// Service to Package Mapping
// ============================================================================

/**
 * Map service name to its infra package name
 *
 * Most services follow the pattern: ServiceName -> infra-{lowercase}
 * But some services are consolidated into unified packages:
 * - LoggingService, MetricsService -> infra-observability
 *
 * @param serviceName - The service name (e.g., 'LoggingService')
 * @returns The package suffix (e.g., 'observability')
 */
export function getInfraPackageName(serviceName: string) {
  // Observability consolidation: logging and metrics are in infra-observability
  if (serviceName === "LoggingService" || serviceName === "MetricsService") {
    return "observability"
  }
  // Default: extract from service name (e.g., 'DatabaseService' -> 'database')
  return serviceName.replace("Service", "").toLowerCase()
}

// ============================================================================
// Layer Presets
// ============================================================================

/**
 * Standard infrastructure services by library type
 */
export const INFRASTRUCTURE_SERVICES = {
  /** Data-access uses core infrastructure */
  dataAccess: ["DatabaseService", "LoggingService", "MetricsService", "CacheService"] as const,

  /** Feature uses core infrastructure plus messaging */
  feature: [
    "DatabaseService",
    "LoggingService",
    "MetricsService",
    "CacheService",
    "PubsubService",
    "QueueService"
  ] as const,

  /** Minimal infrastructure for providers */
  provider: ["LoggingService"] as const
} as const

/**
 * Standard domain services by library type
 */
export const DOMAIN_SERVICES = {
  /** Data-access has Repository */
  dataAccess: (className: string) => [`${className}Repository`],

  /** Feature has Service and Repository */
  feature: (className: string) => [
    `${className}Service`,
    `${className}Repository`
  ]
} as const

// ============================================================================
// Infrastructure Layer Factory
// ============================================================================

/**
 * Configuration for infrastructure layer generation
 */
export interface InfrastructureLayerConfig {
  /** Infrastructure service names (e.g., 'DatabaseService', 'LoggingService') */
  readonly services: ReadonlyArray<string>
  /** NPM scope for imports (e.g., '@myorg') */
  readonly scope: string
  /** Include Dev layer (default: true) */
  readonly includeDev?: boolean
}

/**
 * Create infrastructure layer compositions
 *
 * Generates InfrastructureLive, InfrastructureTest, and InfrastructureDev layers
 * that merge multiple infrastructure services.
 *
 * @param config - Infrastructure layer configuration
 * @returns Factory function that generates layer code
 *
 * @example
 * ```typescript
 * createInfrastructureLayers({
 *   services: ['DatabaseService', 'LoggingService', 'MetricsService', 'CacheService'],
 *   scope: '@myorg',
 * })(builder)
 * ```
 */
export function createInfrastructureLayers(config: InfrastructureLayerConfig) {
  const { includeDev = true, services } = config

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Infrastructure Layer Compositions")
    builder.addBlankLine()

    // Generate Live layer (no trailing comma on last service)
    const liveServicesList = services.map((s, i) => i < services.length - 1 ? `${s}.Live,` : `${s}.Live`)
    const liveServices = liveServicesList.join("\n  ")
    builder.addRaw(`/**
 * Live Infrastructure Layer
 *
 * Production infrastructure for data access.
 */
export const InfrastructureLive = Layer.mergeAll(
  ${liveServices}
)`)
    builder.addBlankLine()

    // Generate Test layer (no trailing comma on last service)
    const testServicesList = services.map((s, i) => i < services.length - 1 ? `${s}.Test,` : `${s}.Test`)
    const testServices = testServicesList.join("\n  ")
    builder.addRaw(`/**
 * Test Infrastructure Layer
 *
 * Testing infrastructure with in-memory implementations.
 */
export const InfrastructureTest = Layer.mergeAll(
  ${testServices}
)`)
    builder.addBlankLine()

    // Generate Dev layer if requested (no trailing comma on last service)
    if (includeDev) {
      const devServicesList = services.map((s, i) => i < services.length - 1 ? `${s}.Dev,` : `${s}.Dev`)
      const devServices = devServicesList.join("\n  ")
      builder.addRaw(`/**
 * Dev Infrastructure Layer
 *
 * Development infrastructure with local services.
 */
export const InfrastructureDev = Layer.mergeAll(
  ${devServices}
)`)
      builder.addBlankLine()
    }
  }
}

// ============================================================================
// Domain Layer Factory
// ============================================================================

/**
 * Configuration for domain layer generation
 */
export interface DomainLayerConfig {
  /** Class name (e.g., 'User') */
  readonly className: string
  /** Domain service names (e.g., ['UserRepository', 'UserCache']) */
  readonly domainServices: ReadonlyArray<string>
  /** Library type for naming convention */
  readonly libraryType: "data-access" | "feature"
  /** Include Dev layer (default: true) */
  readonly includeDev?: boolean
  /** Sub-module layers to include */
  readonly subModuleLayers?: {
    readonly live: ReadonlyArray<string>
    readonly test: ReadonlyArray<string>
  }
}

/**
 * Create domain layer compositions
 *
 * Generates domain-specific layers (e.g., UserDataAccessLive, UserFeatureLive)
 * that merge domain services and provide infrastructure.
 *
 * @param config - Domain layer configuration
 * @returns Factory function that generates layer code
 *
 * @example
 * ```typescript
 * createDomainLayers({
 *   className: 'User',
 *   domainServices: ['UserRepository.Live', 'UserCache.Live'],
 *   libraryType: 'data-access',
 * })(builder)
 * ```
 */
export function createDomainLayers(config: DomainLayerConfig) {
  const { className, domainServices, includeDev = true, libraryType, subModuleLayers } = config

  const layerPrefix = libraryType === "data-access" ? "DataAccess" : "Feature"

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment(`${libraryType === "data-access" ? "Data Access" : "Full Feature"} Layer Compositions`)
    builder.addBlankLine()

    // Build domain service list for Live (no trailing comma on last service)
    const liveServices = domainServices.map((s) => `${s}.Live`)
    if (subModuleLayers?.live) {
      for (const layer of subModuleLayers.live) {
        liveServices.push(layer)
      }
    }
    const liveServiceList = liveServices.map((s, i) => i < liveServices.length - 1 ? `${s},` : s).join("\n  ")

    // Build domain service list for Test (no trailing comma on last service)
    const testServices = domainServices.map((s) => `${s}.Live`) // Note: Usually use .Live for test too
    if (subModuleLayers?.test) {
      for (const layer of subModuleLayers.test) {
        testServices.push(layer)
      }
    }
    const testServiceList = testServices.map((s, i) => i < testServices.length - 1 ? `${s},` : s).join("\n  ")

    // Generate Live layer
    builder.addRaw(`/**
 * ${className} ${layerPrefix} Live Layer
 *
 * Production layer with all services.
 * Includes all infrastructure dependencies.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const repo = yield* ${domainServices[0] || `${className}Repository`}
 *   const entity = yield* repo.findById("id-123")
 * })
 *
 * program.pipe(Effect.provide(${className}${layerPrefix}Live))
 * \`\`\`
 */
export const ${className}${layerPrefix}Live = Layer.mergeAll(
  ${liveServiceList}
).pipe(Layer.provide(InfrastructureLive))`)
    builder.addBlankLine()

    // Generate Test layer
    builder.addRaw(`/**
 * ${className} ${layerPrefix} Test Layer
 *
 * Testing layer with in-memory infrastructure.
 *
 * @example
 * \`\`\`typescript
 * describe("${className}Repository", () => {
 *   it("should create entity", () =>
 *     Effect.gen(function*() {
 *       const repo = yield* ${domainServices[0] || `${className}Repository`}
 *       const result = yield* repo.create({ name: "test" })
 *       expect(result).toBeDefined()
 *     }).pipe(Effect.provide(${className}${layerPrefix}Test))
 *   )
 * })
 * \`\`\`
 */
export const ${className}${layerPrefix}Test = Layer.mergeAll(
  ${testServiceList}
).pipe(Layer.provide(InfrastructureTest))`)
    builder.addBlankLine()

    // Generate Dev layer if requested (reuse liveServices array)
    if (includeDev) {
      const devServiceList = liveServices.map((s, i) => i < liveServices.length - 1 ? `${s},` : s).join("\n  ")
      builder.addRaw(`/**
 * ${className} ${layerPrefix} Dev Layer
 *
 * Development layer with local infrastructure.
 * Verbose logging and debugging enabled.
 */
export const ${className}${layerPrefix}Dev = Layer.mergeAll(
  ${devServiceList}
).pipe(Layer.provide(InfrastructureDev))`)
      builder.addBlankLine()
    }
  }
}

// ============================================================================
// Auto Layer Factory
// ============================================================================

/**
 * Configuration for auto-selecting layer generation
 */
export interface AutoLayerConfig {
  /** Class name (e.g., 'User') */
  readonly className: string
  /** Layer prefix (e.g., 'DataAccess', 'Feature', 'Service') */
  readonly layerPrefix: string
  /** Include Dev layer in auto-selection (default: true) */
  readonly includeDev?: boolean
}

/**
 * Create auto-selecting layer
 *
 * Generates a Layer.suspend that selects appropriate layer based on NODE_ENV.
 *
 * @param config - Auto layer configuration
 * @returns Factory function that generates layer code
 *
 * @example
 * ```typescript
 * createAutoLayer({
 *   className: 'User',
 *   layerPrefix: 'DataAccess',
 * })(builder)
 * ```
 */
export function createAutoLayer(config: AutoLayerConfig) {
  const { className, includeDev = true, layerPrefix } = config
  const baseName = `${className}${layerPrefix}`

  return (builder: TypeScriptBuilder) => {
    builder.addSectionComment("Auto-selecting Layer")
    builder.addBlankLine()

    const devCase = includeDev
      ? `case "development":
      return ${baseName}Dev`
      : ""

    builder.addRaw(`/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * - "test": Uses ${baseName}Test
 * ${includeDev ? `- "development": Uses ${baseName}Dev\n * ` : ""}- "production": Uses ${baseName}Live
 */
export const ${baseName}Auto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return ${baseName}Test
    ${devCase}
    default:
      return ${baseName}Live
  }
})`)
  }
}

// ============================================================================
// Layer Import Factory
// ============================================================================

/**
 * Configuration for layer imports generation
 */
export interface LayerImportsConfig {
  /** NPM scope for imports (e.g., '@myorg') */
  readonly scope: string
  /** Infrastructure services to import */
  readonly infrastructureServices: ReadonlyArray<string>
  /** Class name (e.g., 'User') */
  readonly className: string
  /** File name (e.g., 'user') */
  readonly fileName: string
  /** Library type */
  readonly libraryType: "data-access" | "feature"
  /** Additional local imports */
  readonly localImports?: ReadonlyArray<{ path: string; imports: ReadonlyArray<string> }>
}

/**
 * Create layer imports
 *
 * Generates import statements for layer files.
 *
 * @param config - Layer imports configuration
 * @returns Factory function that generates imports
 */
export function createLayerImports(config: LayerImportsConfig) {
  const { className, fileName, infrastructureServices, libraryType, localImports = [], scope } = config

  return (builder: TypeScriptBuilder) => {
    // Effect import
    builder.addImports([{ from: "effect", imports: ["Layer"] }])
    builder.addBlankLine()

    // Local imports (repository, service)
    if (libraryType === "data-access") {
      builder.addSectionComment("Repository")
      builder.addImports([
        { from: "../repository", imports: [`${className}Repository`] }
      ])
    } else {
      builder.addSectionComment("Service Layer")
      builder.addImports([
        { from: "./service", imports: [`${className}Service`] }
      ])
      builder.addBlankLine()

      builder.addSectionComment("Data Access Layer")
      builder.addImports([
        { from: `${scope}/data-access-${fileName}`, imports: [`${className}Repository`] }
      ])
    }
    builder.addBlankLine()

    // Infrastructure imports (group by package to avoid duplicate imports)
    builder.addSectionComment("Infrastructure Layers")
    const packageToServices = new Map<string, Array<string>>()
    for (const service of infrastructureServices) {
      const packageName = getInfraPackageName(service)
      const existing = packageToServices.get(packageName) ?? []
      existing.push(service)
      packageToServices.set(packageName, existing)
    }
    for (const [packageName, services] of packageToServices.entries()) {
      builder.addImports([
        { from: `${scope}/infra-${packageName}`, imports: services.sort() }
      ])
    }
    builder.addBlankLine()

    // Environment config import
    builder.addSectionComment("Environment Configuration")
    builder.addImports([
      { from: `${scope}/env`, imports: ["env"] }
    ])
    builder.addBlankLine()

    // Additional local imports
    for (const localImport of localImports) {
      builder.addImports([
        { from: localImport.path, imports: [...localImport.imports] }
      ])
    }
    if (localImports.length > 0) {
      builder.addBlankLine()
    }
  }
}

// ============================================================================
// Complete Layer File Factory
// ============================================================================

/**
 * Generate a complete layers file
 *
 * Convenience function that generates a complete layers file with:
 * - File header
 * - Imports
 * - Infrastructure layers
 * - Domain layers
 * - Auto-selecting layer
 *
 * @param config - Layer factory configuration
 * @returns Complete file content
 */
export function generateLayersFile(config: LayerFactoryConfig) {
  const builder = new TypeScriptBuilder()
  const {
    className,
    domainServices,
    fileName,
    includeDev = true,
    infrastructureServices,
    libraryType,
    scope,
    subModuleLayers
  } = config

  const layerPrefix = libraryType === "data-access" ? "DataAccess" : "Feature"
  const propertyName = fileName.replace(/-/g, "")

  // File header
  builder.addFileHeader({
    title: `${className} ${layerPrefix} Layers`,
    description: `Effect layer compositions for ${propertyName} ${
      libraryType === "data-access" ? "data access" : "feature"
    }.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Dev: Development with local infrastructure
- Test: Testing with in-memory/mock infrastructure
- Auto: Automatically selects based on NODE_ENV

Infrastructure included:
${infrastructureServices.map((s) => `- ${s}`).join("\n")}`,
    module: `${scope}/${libraryType}-${fileName}/server`
  })
  builder.addBlankLine()

  // Imports
  createLayerImports({
    scope,
    infrastructureServices,
    className,
    fileName,
    libraryType
  })(builder)

  // Infrastructure layers
  createInfrastructureLayers({
    services: infrastructureServices,
    scope,
    includeDev
  })(builder)

  // Domain layers
  createDomainLayers({
    className,
    domainServices,
    libraryType,
    includeDev,
    subModuleLayers
  })(builder)

  // Auto layer
  createAutoLayer({
    className,
    layerPrefix,
    includeDev
  })(builder)

  return builder.toString()
}
