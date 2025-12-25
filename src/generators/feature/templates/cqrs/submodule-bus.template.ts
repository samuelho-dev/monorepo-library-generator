/**
 * CQRS Sub-Module Bus Template
 *
 * Generates a unified command/query bus that delegates to sub-module handlers.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * The unified bus provides:
 * - Single entry point for all sub-module commands/queries
 * - Prefix-based routing (e.g., Cart.AddItem -> CartCommandHandler)
 * - Merged layer composition for all sub-module handlers
 *
 * @module monorepo-library-generator/feature/cqrs/submodule-bus-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { createNamingVariants } from "../../../../utils/naming"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate unified CQRS bus file
 *
 * Creates a single command/query bus that delegates to all sub-module handlers
 * with prefix-based routing for unified API access.
 */
export function generateSubModuleCqrsBusFile(options: FeatureTemplateOptions) {
  if (!options.subModules || options.subModules.length === 0) {
    return "" // No bus needed without sub-modules
  }

  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()
  const subModules = options.subModules.map((s) => ({
    name: s,
    className: createNamingVariants(s).className
  }))

  builder.addFileHeader({
    title: `${className} Unified CQRS Bus`,
    description: `Unified command/query bus for ${name} domain with sub-module delegation.

Sub-modules:
${subModules.map((s) => `- ${s.className}: ${s.name} commands/queries`).join("\n")}

All commands/queries are prefixed with their sub-module name:
${subModules.map((s) => `- ${s.className}.*: ${s.name} operations`).join("\n")}

This bus provides a single entry point while maintaining separation of concerns.`,
    module: `${scope}/feature-${fileName}/server/cqrs/bus`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer", "Match"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Sub-Module Service Imports")
  builder.addBlankLine()

  // Generate imports for each sub-module's service
  for (const subModule of subModules) {
    builder.addRaw(
      `import { ${subModule.className}Service } from "../services/${subModule.name}"`
    )
  }
  builder.addBlankLine()

  builder.addSectionComment("Command/Query Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Base command interface
 */
export interface Command<TPayload, TResult> {
  readonly _tag: string
  readonly payload: TPayload
}

/**
 * Base query interface
 */
export interface Query<TPayload, TResult> {
  readonly _tag: string
  readonly payload: TPayload
}

/**
 * Command handler type
 */
export type CommandHandler<TPayload, TResult, E, R> = (
  payload: TPayload
) => Effect.Effect<TResult, E, R>

/**
 * Query handler type
 */
export type QueryHandler<TPayload, TResult, E, R> = (
  payload: TPayload
) => Effect.Effect<TResult, E, R>`)
  builder.addBlankLine()

  builder.addSectionComment("Unified Command Bus")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Command Bus Interface
 *
 * Routes commands to the appropriate sub-module handler based on prefix.
 */
export interface ${className}CommandBusInterface {
  /**
   * Dispatch a command to the appropriate handler
   *
   * @param tag - Command tag (e.g., "Cart.AddItem", "Checkout.Initiate")
   * @param payload - Command payload
   */
  readonly dispatch: <TPayload, TResult>(
    tag: string,
    payload: TPayload
  ) => Effect.Effect<TResult, Error, never>
}

/**
 * ${className} Command Bus Context Tag
 *
 * Provides unified command dispatch with sub-module routing.
 */
export class ${className}CommandBus extends Context.Tag("${className}CommandBus")<
  ${className}CommandBus,
  ${className}CommandBusInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const logger = yield* LoggingService;
${subModules.map((s) => `      const ${s.name.replace(/-/g, "")}Service = yield* ${s.className}Service`).join("\n")}

      yield* logger.debug("${className}CommandBus initialized", {
        subModules: [${subModules.map((s) => `"${s.name}"`).join(", ")}]
      })

      return {
        dispatch: (tag, payload) =>
          Effect.gen(function*() {
            yield* logger.debug("${className}CommandBus.dispatch", { tag })

            // Extract sub-module prefix
            const prefix = tag.split(".")[0]

            // Route to appropriate sub-module
            // TODO: Implement actual routing based on prefix
            // This is a placeholder that should be customized per domain
            yield* logger.info(\`Routing command to \${prefix} sub-module\`, { tag, payload })

            return {} as never
          }).pipe(Effect.withSpan("${className}CommandBus.dispatch", { attributes: { tag } }))
      }
    })
  )

  static readonly Test = this.Live
}`)
  builder.addBlankLine()

  builder.addSectionComment("Unified Query Bus")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Query Bus Interface
 *
 * Routes queries to the appropriate sub-module handler based on prefix.
 */
export interface ${className}QueryBusInterface {
  /**
   * Execute a query through the appropriate handler
   *
   * @param tag - Query tag (e.g., "Cart.GetContents", "Management.ListOrders")
   * @param payload - Query payload
   */
  readonly execute: <TPayload, TResult>(
    tag: string,
    payload: TPayload
  ) => Effect.Effect<TResult, Error, never>
}

/**
 * ${className} Query Bus Context Tag
 *
 * Provides unified query execution with sub-module routing.
 */
export class ${className}QueryBus extends Context.Tag("${className}QueryBus")<
  ${className}QueryBus,
  ${className}QueryBusInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const logger = yield* LoggingService;
${subModules.map((s) => `      const ${s.name.replace(/-/g, "")}Service = yield* ${s.className}Service`).join("\n")}

      yield* logger.debug("${className}QueryBus initialized", {
        subModules: [${subModules.map((s) => `"${s.name}"`).join(", ")}]
      })

      return {
        execute: (tag, payload) =>
          Effect.gen(function*() {
            yield* logger.debug("${className}QueryBus.execute", { tag })

            // Extract sub-module prefix
            const prefix = tag.split(".")[0]

            // Route to appropriate sub-module
            // TODO: Implement actual routing based on prefix
            // This is a placeholder that should be customized per domain
            yield* logger.info(\`Routing query to \${prefix} sub-module\`, { tag, payload })

            return {} as never
          }).pipe(Effect.withSpan("${className}QueryBus.execute", { attributes: { tag } }))
      }
    })
  )

  static readonly Test = this.Live
}`)
  builder.addBlankLine()

  builder.addSectionComment("Composed Bus Layers")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className}UnifiedBusLayer
 *
 * Provides both command and query buses in a single layer.
 *
 * @example
 * \`\`\`typescript
 * import { ${className}UnifiedBusLayer } from "${scope}/feature-${fileName}/server/cqrs/bus";
 *
 * const appLayer = Layer.mergeAll(
 *   ${className}UnifiedBusLayer,
 *   ${className}FeatureLive,
 * )
 * \`\`\`
 */
export const ${className}UnifiedBusLayer = Layer.mergeAll(
  ${className}CommandBus.Live,
  ${className}QueryBus.Live
)`)
  builder.addBlankLine()

  return builder.toString()
}
