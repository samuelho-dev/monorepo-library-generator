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
    { from: "effect", imports: ["Context", "Layer", "Effect", "Stream", "Option"] }
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
    Aggregate${className}Operations {

  // ==========================================================================
  // Stream-Based Operations for Large Datasets
  // ==========================================================================
  //
  // Stream provides constant-memory processing for large/unbounded datasets.
  // Use when processing 1000+ items or when memory constraints are critical.

  /**
   * Stream all entities with pagination
   *
   * Provides constant-memory processing of large datasets using Stream.paginateEffect.
   * Automatically handles pagination and backpressure.
   *
   * @param options - Configuration options
   * @param options.batchSize - Number of items per page (default: 100)
   *
   * @returns Stream of entities with constant memory usage
   *
   * @example
   * \`\`\`typescript
   * // Stream all entities
   * const repo = yield* ${className}Repository;
   * yield* repo.streamAll({ batchSize: 100 }).pipe(
   *   Stream.mapEffect((entity) => processEntity(entity)),
   *   Stream.runDrain
   * );
   *
   * // Count total items with constant memory
   * const count = yield* repo.streamAll().pipe(
   *   Stream.runCount
   * );
   *
   * // Export to CSV with constant memory
   * yield* repo.streamAll().pipe(
   *   Stream.map((entity) => toCsvRow(entity)),
   *   Stream.run(Sink.file("export.csv"))
   * );
   * \`\`\`
   */
  readonly streamAll: (options?: {
    readonly batchSize?: number;
  }) => Stream.Stream<${className}, ${className}RepositoryError, never>;

  // ==========================================================================
  // TODO: Additional Stream Operations (Optional)
  // ==========================================================================
  //
  // Add these if your use case requires filtering or custom streaming:
  //
  // readonly streamByCriteria: (
  //   criteria: Partial<${className}>,
  //   options?: { batchSize?: number }
  // ) => Stream.Stream<${className}, ${className}RepositoryError, never>;
  //
  // Usage examples:
  //
  // // Stream with Sink for aggregation
  // const total = yield* repo.streamByCriteria({ status: "active" }).pipe(
  //   Stream.map(item => item.amount),
  //   Stream.run(Sink.sum) // Constant memory aggregation
  // );
  //
  // // Batch processing with backpressure
  // yield* repo.streamAll().pipe(
  //   Stream.grouped(50), // Process 50 at a time
  //   Stream.mapEffect((batch) => processBatch(batch)),
  //   Stream.runDrain
  // );
  //
  // See EFFECT_PATTERNS.md "Streaming & Queuing Patterns" for comprehensive examples.
  // See DATA-ACCESS.md for repository-specific Stream integration patterns.
}`)
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
   * Uses Layer.succeed for deterministic testing.
   * No dynamic imports - all operations are plain functions for proper Layer.fresh isolation.
   *
   * IMPORTANT: This provides minimal stub implementations.
   * Customize these stubs based on your testing needs.
   */
  static readonly Test = Layer.succeed(
    this,
    {
      // Create operations
      create: (input) => Effect.succeed({ id: "test-id-1", ...input } as any),
      createMany: (inputs) => Effect.succeed(
        inputs.map((input, i) => ({ id: \`test-id-\${i + 1}\`, ...input })) as any
      ),

      // Read operations
      findById: (id) => Effect.succeed({ id, name: "test-entity" } as any),
      findMany: (ids) => Effect.succeed(
        ids.map(id => ({ id, name: "test-entity" })) as any
      ),
      findAll: () => Effect.succeed([{ id: "test-id-1", name: "test-entity" }] as any),
      findByCriteria: () => Effect.succeed([{ id: "test-id-1", name: "test-entity" }] as any),

      // Update operations
      update: (id, input) => Effect.succeed({ id, ...input } as any),
      updateMany: (updates) => Effect.succeed(
        updates.map(({ id, data }) => ({ id, ...data })) as any
      ),

      // Delete operations
      delete: () => Effect.void,
      deleteMany: () => Effect.void,

      // Aggregate operations
      count: () => Effect.succeed(1),
      exists: () => Effect.succeed(true),
    }
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
