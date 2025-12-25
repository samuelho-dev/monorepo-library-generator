/**
 * CQRS Index Template
 *
 * Generates server/cqrs/index.ts barrel export for CQRS module.
 *
 * @module monorepo-library-generator/feature/cqrs/cqrs-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"

/**
 * Generate server/cqrs/index.ts file
 *
 * Creates barrel export for the CQRS module.
 */
export function generateCqrsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  builder.addFileHeader({
    title: `${className} CQRS Index`,
    description: `Barrel export for ${name} CQRS patterns.

CQRS (Command Query Responsibility Segregation) separates
read and write operations for scalability and clarity.

Structure:
- commands/ - Write operations (state changes)
- queries/ - Read operations (data retrieval)
- operations/ - Middleware-enabled execution
- projections/ - Read model maintenance`,
    module: `${options.packageName}/server/cqrs`
  })
  builder.addBlankLine()

  builder.addSectionComment("Commands")
  builder.addRaw(`export { Command, ${className}CommandBus } from "./commands";
export type { CommandBusInterface } from "./commands";`)
  builder.addBlankLine()

  builder.addSectionComment("Queries")
  builder.addRaw(`export { Query, ${className}QueryBus } from "./queries";
export type { QueryBusInterface } from "./queries";`)
  builder.addBlankLine()

  builder.addSectionComment("Operations")
  builder.addRaw(`export {
  ${className}OperationExecutor,
  createValidationMiddleware,
  createRetryMiddleware,
} from "./operations";

export type {
  OperationMetadata,
  OperationExecutorInterface,
  Middleware,
} from "./operations";`)
  builder.addBlankLine()

  builder.addSectionComment("Projections")
  builder.addRaw(`export { ${className}ProjectionBuilder } from "./projections";

export type {
  ProjectionHandler,
  ProjectionDefinition,
  ReadModelStore,
  ProjectionBuilderInterface,
  ${className}ReadModel,
} from "./projections";`)
  builder.addBlankLine()

  // Add unified bus export if sub-modules are present
  if (options.subModules && options.subModules.length > 0) {
    builder.addSectionComment("Unified Sub-Module Bus")
    builder.addRaw(`// Unified command/query buses for sub-module delegation
export {
  ${className}CommandBus as ${className}UnifiedCommandBus,
  ${className}QueryBus as ${className}UnifiedQueryBus,
  ${className}UnifiedBusLayer,
} from "./bus";

export type {
  ${className}CommandBusInterface as ${className}UnifiedCommandBusInterface,
  ${className}QueryBusInterface as ${className}UnifiedQueryBusInterface,
  Command,
  Query,
  CommandHandler,
  QueryHandler,
} from "./bus";`)
  }

  return builder.toString()
}
