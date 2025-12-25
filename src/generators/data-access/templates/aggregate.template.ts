/**
 * Data-Access Aggregate Root Template
 *
 * Generates aggregate.ts for data-access with sub-module coordination.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * The aggregate root coordinates all sub-module repositories and provides
 * a unified interface for cross-sub-module operations.
 *
 * @module monorepo-library-generator/data-access/aggregate-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { createNamingVariants } from "../../../utils/naming"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface AggregateTemplateOptions {
  /** Domain name (e.g., 'order') */
  name: string
  /** Domain class name (e.g., 'Order') */
  className: string
  /** Domain file name (e.g., 'order') */
  fileName: string
  /** Package name (e.g., '@scope/data-access-order') */
  packageName: string
  /** Array of sub-module names (e.g., ['cart', 'checkout', 'management']) */
  subModuleNames: Array<string>
}

/**
 * Generate aggregate.ts for a data-access library with sub-modules
 *
 * Creates an aggregate root service that coordinates all sub-module repositories
 */
export function generateAggregateFile(options: AggregateTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName, subModuleNames } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Convert sub-module names to class names
  const subModules = subModuleNames.map((name) => ({
    name,
    className: createNamingVariants(name).className,
    propertyName: createNamingVariants(name).propertyName
  }))

  builder.addFileHeader({
    title: `${className} Aggregate Root`,
    description: `Aggregate root service that coordinates all ${className} sub-module repositories.

The aggregate root pattern provides:
- Unified access to all sub-module repositories
- Cross-sub-module transaction coordination
- Domain-level invariant enforcement

Sub-modules:
${subModules.map((s) => `- ${s.className}Repository: ${s.name} operations`).join("\n")}`,
    module: `${packageName}/aggregate`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Context", "Effect", "Layer"] }])
  builder.addBlankLine()

  builder.addSectionComment("Sub-Module Repository Imports")
  for (const subModule of subModules) {
    builder.addRaw(
      `import { ${subModule.className}Repository, ${subModule.className}RepositoryLive } from "./${subModule.name}";`
    )
  }
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Imports")
  builder.addRaw(`import { DatabaseService } from "${scope}/infra-database";
import { LoggingService } from "${scope}/infra-observability";`)
  builder.addBlankLine()

  builder.addSectionComment("Aggregate Interface")
  builder.addBlankLine()

  const repoTypes = subModules
    .map((s) => `    readonly ${s.propertyName}: Context.Tag.Service<typeof ${s.className}Repository>;`)
    .join("\n")

  builder.addRaw(`/**
 * ${className}Aggregate interface
 *
 * Provides unified access to all ${className} sub-module repositories.
 * Use this for operations that span multiple sub-modules.
 */
export interface ${className}AggregateInterface {
${repoTypes}

  /**
   * Execute operation across all repositories within a transaction
   *
   * @example
   * \`\`\`typescript
   * const aggregate = yield* ${className}Aggregate;
   * yield* aggregate.withTransaction((repos) =>
   *   Effect.gen(function*() {
   *     yield* repos.cart.clear(cartId);
   *     yield* repos.management.create({ ... });
   *   })
   * );
   * \`\`\`
   */
  readonly withTransaction: <R, E, A>(
    fn: (repos: Omit<${className}AggregateInterface, "withTransaction">) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag Definition")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className}Aggregate Context.Tag
 *
 * Use this to access the aggregate root in your Effect programs:
 * \`\`\`typescript
 * const aggregate = yield* ${className}Aggregate;
 * const cart = yield* aggregate.cart.getById(cartId);
 * \`\`\`
 */
export class ${className}Aggregate extends Context.Tag("${className}Aggregate")<
  ${className}Aggregate,
  ${className}AggregateInterface
>() {}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Layer Implementation")
  builder.addBlankLine()

  const yieldStatements = subModules.map((s) => `    const ${s.propertyName} = yield* ${s.className}Repository;`).join(
    "\n"
  )

  const repoAssignments = subModules.map((s) => `      ${s.propertyName},`).join("\n")

  builder.addRaw(`/**
 * ${className}AggregateLive Layer
 *
 * Live implementation that yields all sub-module repositories.
 * Provides transaction support via withTransaction method.
 */
export const ${className}AggregateLive = Layer.effect(
  ${className}Aggregate,
  Effect.gen(function*() {
    const logger = yield* LoggingService;
${yieldStatements}

    yield* logger.debug("${className}Aggregate initialized", {
      subModules: [${subModules.map((s) => `"${s.name}"`).join(", ")}],
    });

    return {
${repoAssignments}

      withTransaction: (fn) =>
        Effect.gen(function*() {
          yield* logger.debug("${className}Aggregate.withTransaction started");

          // TODO: Wrap in actual database transaction when available
          // For now, execute sequentially
          const result = yield* fn({
${repoAssignments}
          });

          yield* logger.debug("${className}Aggregate.withTransaction completed");
          return result;
        }),
    };
  })
);`)
  builder.addBlankLine()

  builder.addSectionComment("Composed Layers")
  builder.addBlankLine()

  const layerProvides = subModules.map((s) => `  Layer.provide(${s.className}RepositoryLive),`).join("\n")

  builder.addRaw(`/**
 * Full ${className}Aggregate layer with all dependencies
 *
 * Includes all sub-module repository layers.
 */
export const ${className}AggregateLayer = ${className}AggregateLive.pipe(
${layerProvides}
  Layer.provide(DatabaseService.Live),
  Layer.provide(LoggingService.Live)
);

/**
 * Test layer with mocked infrastructure
 */
export const ${className}AggregateTestLayer = ${className}AggregateLive.pipe(
${layerProvides.replace(/\.Live/g, ".Test")}
  Layer.provide(DatabaseService.Test),
  Layer.provide(LoggingService.Test)
);`)
  builder.addBlankLine()

  return builder.toString()
}
