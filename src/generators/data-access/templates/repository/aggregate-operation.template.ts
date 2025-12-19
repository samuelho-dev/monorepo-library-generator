/**
 * Repository Aggregate Operations Template
 *
 * Generates repository/operations/aggregate.ts file with aggregate operations
 *
 * @module monorepo-library-generator/data-access/repository/aggregate-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/aggregate.ts file
 */
export function generateRepositoryAggregateOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Aggregate Operations`,
    description: `Implements aggregate operations (count, exists) for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { aggregateOperations } from '@scope/data-access-${fileName}/repository/operations/aggregate'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Effect", "Duration"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}Filter`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [
        `${className}RepositoryError`,
        `${className}InternalError`,
        `${className}TimeoutError`
      ],
      isTypeOnly: false
    }
  ])
  builder.addBlankLine()

  // Import infrastructure services
  builder.addComment("Infrastructure services - Database for persistence")
  builder.addRaw(`import { DatabaseService } from "@custom-repo/infra-database";`)
  builder.addBlankLine()

  builder.addSectionComment("Aggregate Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`export interface Aggregate${className}Operations {
  /**
   * Count ${className} entities matching filter
   *
   * @param filter - Optional filter criteria
   * @returns Effect that succeeds with count
   */
  count(filter?: ${className}Filter);

  /**
   * Check if ${className} entity exists by ID
   *
   * @param id - Entity identifier
   * @returns Effect that succeeds with boolean
   */
  exists(id: string);
}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Live aggregate operations implementation
 *
 * Uses DatabaseService for persistence with efficient database-level aggregation
 *
 * PRODUCTION INTEGRATION:
 * - DatabaseService for database access via Kysely
 * - Effect.log* methods for observability
 * - Database-level COUNT operations for performance
 * - Timeout protection and distributed tracing
 */
export const aggregateOperations: Aggregate${className}Operations = {
  count: (filter?: ${className}Filter) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Counting ${className} entities (filter: \${JSON.stringify(filter)})\`);

      const count = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}s").select((eb) => eb.fn.countAll().as("count"));

        // Apply filters if provided
        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", \`%\${filter.search}%\`),
            ])
          );
        }

        return query.executeTakeFirstOrThrow().then((result) => Number(result.count));
      });

      yield* Effect.logInfo(\`Counted \${count} ${className} entities\`);

      return count;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("count", 30000)
      }),
      Effect.withSpan("${className}Repository.count")
    ),

  exists: (id: string) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(\`Checking if ${className} exists: \${id}\`);

      const result = yield* database.query((db) =>
        db
          .selectFrom("${fileName}s")
          .select((eb) => eb.fn.countAll().as("count"))
          .where("id", "=", id)
          .executeTakeFirstOrThrow()
          .then((result) => Number(result.count) > 0)
      );

      yield* Effect.logDebug(\`${className} exists check: \${id} = \${result}\`);

      return result;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("exists", 30000)
      }),
      Effect.withSpan("${className}Repository.exists")
    ),
};`)

  return builder.toString()
}
