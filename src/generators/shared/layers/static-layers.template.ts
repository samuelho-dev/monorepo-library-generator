/**
 * Static Layers Template Utilities
 *
 * Generates consistent Live, Test, Dev, and Auto static layers
 * inside Context.Tag classes across all library types.
 *
 * This ensures a consistent layer pattern:
 * - Live: Production implementation
 * - Test: In-memory/mock implementation for testing
 * - Dev: Development with enhanced logging
 * - Auto: Environment-aware layer selection
 *
 * @module monorepo-library-generator/shared/layers/static-layers
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"

/**
 * Configuration for static layer generation
 */
export interface StaticLayerConfig {
  /** Service class name (e.g., "UserRepository", "OrderService") */
  readonly className: string

  /**
   * Layer type - determines how layers are constructed
   * - "succeed": Pure value layer (Layer.succeed)
   * - "effect": Effectful layer with dependencies (Layer.effect)
   * - "sync": Synchronous layer (Layer.sync)
   */
  readonly layerType: "succeed" | "effect" | "sync"

  /**
   * Live layer implementation code
   * This is the body inside the layer constructor
   */
  readonly liveImpl: string

  /**
   * Test layer implementation code
   * If not provided, defaults to same as liveImpl
   */
  readonly testImpl?: string

  /**
   * Dev layer implementation code
   * If not provided, wraps liveImpl with logging
   */
  readonly devImpl?: string

  /**
   * Whether the service depends on external infrastructure
   * that determines test behavior (e.g., DatabaseService)
   *
   * If true: Test = Live (testing done by swapping dependencies)
   * If false: Test has its own in-memory implementation
   */
  readonly testViaDependencies?: boolean

  /**
   * Environment variable key used for Auto layer switching.
   * Must match a key exported by the env library (e.g., "NODE_ENV").
   * The generated code will use `env.${envVar}` pattern.
   * @default "NODE_ENV"
   */
  readonly envVar?: string

  /**
   * Additional imports needed for layers
   */
  readonly additionalImports?: string
}

/**
 * Get the Layer method based on layer type
 */
function getLayerMethod(layerType: string) {
  switch (layerType) {
    case "succeed":
      return "succeed"
    case "sync":
      return "sync"
    default:
      return "effect"
  }
}

/**
 * Generate Live layer static member using TypeScriptBuilder
 */
function buildLiveLayer(builder: TypeScriptBuilder, className: string, layerType: string, impl: string) {
  const layerMethod = getLayerMethod(layerType)

  builder.addRaw(`  /**
   * Live layer - Production implementation
   *
   * Use for production deployments with real external services.
   */
  static readonly Live = Layer.${layerMethod}(
    this,
    ${impl}
  )`)
}

/**
 * Generate Test layer as alias to Live using TypeScriptBuilder
 */
function buildTestLayerAlias(builder: TypeScriptBuilder) {
  builder.addRaw(`  /**
   * Test layer - Same as Live
   *
   * Testing is done by composing with test infrastructure layers
   * (e.g., DatabaseService.Test) rather than a separate implementation.
   */
  static readonly Test = this.Live`)
}

/**
 * Generate Test layer with its own implementation using TypeScriptBuilder
 */
function buildTestLayer(builder: TypeScriptBuilder, className: string, layerType: string, impl: string) {
  const layerMethod = layerType === "effect" ? "sync" : layerType

  builder.addRaw(`  /**
   * Test layer - In-memory implementation for testing
   *
   * Provides isolated, deterministic behavior for unit tests.
   * Each Layer.fresh creates independent state.
   */
  static readonly Test = Layer.${layerMethod}(
    this,
    ${impl}
  )`)
}

/**
 * Generate Dev layer with logging wrapper using TypeScriptBuilder
 */
function buildDevLayer(builder: TypeScriptBuilder, className: string, layerType: string, devImpl: string | undefined) {
  if (devImpl) {
    builder.addRaw(`  /**
   * Dev layer - Development with enhanced logging
   *
   * Wraps operations with detailed request/response logging
   * for debugging during development.
   */
  static readonly Dev = Layer.effect(
    this,
    ${devImpl}
  )`)
  } else {
    // Default: wrap Live with logging (no console.log to satisfy linter)
    builder.addRaw(`  /**
   * Dev layer - Development with enhanced logging
   *
   * Wraps Live layer operations with Effect logging
   * for debugging during development.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function*() {
      const liveService = yield* ${className}.Live.pipe(
        Layer.build,
        Effect.map(Context.unsafeGet(${className}))
      )

      // Return wrapped service with logging
      // TODO: Add method-level logging wrappers using Effect.log()
      return liveService
    })
  )`)
  }
}

/**
 * Generate Auto layer for environment-aware selection using TypeScriptBuilder
 *
 * Uses process.env for environment access since NODE_ENV
 * is a standard runtime variable not included in the typed env object.
 */
function buildAutoLayer(builder: TypeScriptBuilder, className: string, envVar: string) {
  builder.addRaw(`  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on process.env.${envVar}:
   * - "test" → Test layer
   * - "development" → Dev layer (with logging)
   * - "production" or other → Live layer (default)
   */
  static readonly Auto = Layer.suspend(() => {
    // biome-ignore lint/style/noProcessEnv: Environment-aware layer selection requires runtime env check
    const env = process.env.${envVar}
    switch (env) {
      case "test":
        return ${className}.Test
      case "development":
        return ${className}.Dev
      default:
        return ${className}.Live
    }
  })`)
}

/**
 * Generate complete static layers code block
 *
 * Returns the code for Live, Test, Dev, and Auto static members
 * to be placed inside a Context.Tag class.
 *
 * @example
 * ```typescript
 * const layerCode = generateStaticLayers({
 *   className: "UserRepository",
 *   layerType: "succeed",
 *   liveImpl: "repositoryImpl",
 *   testViaDependencies: true
 * })
 * ```
 */
export function generateStaticLayers(config: StaticLayerConfig) {
  const {
    className,
    devImpl,
    envVar = "NODE_ENV",
    layerType,
    liveImpl,
    testImpl,
    testViaDependencies = false
  } = config

  const builder = new TypeScriptBuilder()

  // Live layer
  buildLiveLayer(builder, className, layerType, liveImpl)
  builder.addBlankLine()

  // Test layer
  if (testViaDependencies) {
    buildTestLayerAlias(builder)
  } else {
    buildTestLayer(builder, className, layerType, testImpl || liveImpl)
  }
  builder.addBlankLine()

  // Dev layer
  buildDevLayer(builder, className, layerType, devImpl)
  builder.addBlankLine()

  // Auto layer
  buildAutoLayer(builder, className, envVar)

  return builder.toString()
}

/**
 * Generate minimal static layers (just Live and Test)
 *
 * Use for simpler services that don't need Dev/Auto layers.
 */
export function generateMinimalStaticLayers(config: {
  className: string
  layerType: "succeed" | "effect" | "sync"
  liveImpl: string
  testViaDependencies?: boolean
}) {
  const { className, layerType, liveImpl, testViaDependencies = false } = config

  const builder = new TypeScriptBuilder()

  buildLiveLayer(builder, className, layerType, liveImpl)
  builder.addBlankLine()

  if (testViaDependencies) {
    buildTestLayerAlias(builder)
  } else {
    buildTestLayer(builder, className, layerType, liveImpl)
  }

  return builder.toString()
}

/**
 * Generate just the layer JSDoc comment
 *
 * Useful for templates that need custom layer implementations
 * but want consistent documentation.
 */
export function generateLayerDocs(layerName: "Live" | "Test" | "Dev" | "Auto") {
  const builder = new TypeScriptBuilder()

  switch (layerName) {
    case "Live":
      builder.addRaw(`  /**
   * Live layer - Production implementation
   *
   * Use for production deployments with real external services.
   */`)
      break
    case "Test":
      builder.addRaw(`  /**
   * Test layer - In-memory implementation for testing
   *
   * Provides isolated, deterministic behavior for unit tests.
   */`)
      break
    case "Dev":
      builder.addRaw(`  /**
   * Dev layer - Development with enhanced logging
   *
   * Wraps operations with detailed request/response logging.
   */`)
      break
    case "Auto":
      builder.addRaw(`  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects Live, Dev, or Test based on NODE_ENV.
   */`)
      break
  }

  return builder.toString()
}
