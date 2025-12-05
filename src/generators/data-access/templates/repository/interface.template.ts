/**
 * Repository Interface Template
 *
 * Generates repository/interface.ts file with Context.Tag definition
 *
 * @module monorepo-library-generator/data-access/repository/interface-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/interface.ts file
 *
 * Creates the Context.Tag interface with static layers (Live, Test, Dev, Auto)
 */
export function generateRepositoryInterfaceFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Repository Interface`,
    description: `Context.Tag definition for ${className}Repository.

ARCHITECTURE PATTERN:
- Repository interface defined in contract library (port)
- This file imports and re-exports with static layers (adapter)
- Operations split into separate files for bundle optimization

@see repository/operations/* for implementation details`,
    module: `@custom-repo/data-access-${fileName}/repository`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Context", "Layer", "Effect"] }
  ])
  builder.addBlankLine()

  // Import operation types
  builder.addComment("Import all operation types")
  builder.addImports([
    {
      from: "./operations/create",
      imports: [`Create${className}Operations`],
      isTypeOnly: true
    },
    {
      from: "./operations/read",
      imports: [`Read${className}Operations`],
      isTypeOnly: true
    },
    {
      from: "./operations/update",
      imports: [`Update${className}Operations`],
      isTypeOnly: true
    },
    {
      from: "./operations/delete",
      imports: [`Delete${className}Operations`],
      isTypeOnly: true
    },
    {
      from: "./operations/aggregate",
      imports: [`Aggregate${className}Operations`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Repository interface
  builder.addSectionComment("Repository Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Repository Interface
 *
 * Complete CRUD + aggregate operations for ${className} entities.
 * Operations are split into separate modules for optimal tree-shaking.
 */
export interface ${className}RepositoryInterface
  extends Create${className}Operations,
    Read${className}Operations,
    Update${className}Operations,
    Delete${className}Operations,
    Aggregate${className}Operations {}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Repository Tag
 *
 * Access via: yield* ${className}Repository
 *
 * Static layers available:
 * - ${className}Repository.Live - Production implementation
 * - ${className}Repository.Test - In-memory test implementation
 * - ${className}Repository.Dev - Development with logging
 * - ${className}Repository.Auto - Auto-select based on NODE_ENV
 */
export class ${className}Repository extends Context.Tag("${className}Repository")<
  ${className}Repository,
  ${className}RepositoryInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * Requires: KyselyService for database access
   * Optional: LoggingService for query logging
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Import operation implementations
      const createOps = yield* Effect.promise(() =>
        import("./operations/create").then((m) => m.createOperations)
      );
      const readOps = yield* Effect.promise(() =>
        import("./operations/read").then((m) => m.readOperations)
      );
      const updateOps = yield* Effect.promise(() =>
        import("./operations/update").then((m) => m.updateOperations)
      );
      const deleteOps = yield* Effect.promise(() =>
        import("./operations/delete").then((m) => m.deleteOperations)
      );
      const aggregateOps = yield* Effect.promise(() =>
        import("./operations/aggregate").then((m) => m.aggregateOperations)
      );

      return {
        ...createOps,
        ...readOps,
        ...updateOps,
        ...deleteOps,
        ...aggregateOps,
      };
    })
  );

  /**
   * Test Layer - In-memory implementation
   *
   * Uses Map-based storage for testing
   */
  static readonly Test = Layer.effect(
    this,
    Effect.gen(function* () {
      // Import test implementations
      const createOps = yield* Effect.promise(() =>
        import("./operations/create").then((m) => m.testCreateOperations)
      );
      const readOps = yield* Effect.promise(() =>
        import("./operations/read").then((m) => m.testReadOperations)
      );
      const updateOps = yield* Effect.promise(() =>
        import("./operations/update").then((m) => m.testUpdateOperations)
      );
      const deleteOps = yield* Effect.promise(() =>
        import("./operations/delete").then((m) => m.testDeleteOperations)
      );
      const aggregateOps = yield* Effect.promise(() =>
        import("./operations/aggregate").then((m) => m.testAggregateOperations)
      );

      return {
        ...createOps,
        ...readOps,
        ...updateOps,
        ...deleteOps,
        ...aggregateOps,
      };
    })
  );

  /**
   * Dev Layer - Development with enhanced logging
   */
  static readonly Dev = this.Test;

  /**
   * Auto Layer - Auto-select based on NODE_ENV
   */
  static readonly Auto = Layer.suspend(() =>
    process.env.NODE_ENV === "test" ? this.Test : this.Live
  );
}`)

  return builder.toString()
}
