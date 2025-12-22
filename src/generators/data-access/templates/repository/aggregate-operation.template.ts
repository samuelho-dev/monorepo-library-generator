/**
 * Repository Aggregate Operations Template
 *
 * Generates repository/operations/aggregate.ts file with aggregate operations
 *
 * @module monorepo-library-generator/data-access/repository/aggregate-operation-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { DataAccessTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate repository/operations/aggregate.ts file
 */
export function generateRepositoryAggregateOperationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Aggregate Operations`,
    description: `Implements aggregate operations (count, exists) for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { aggregateOperations } from '@scope/data-access-${fileName}/repository/operations/aggregate'`,
    module: `${scope}/data-access-${fileName}/repository/operations`,
  });
  builder.addBlankLine();

  builder.addImports([{ from: 'effect', imports: ['Effect', 'Duration'] }]);
  builder.addBlankLine();

  builder.addImports([
    {
      from: '../../shared/types',
      imports: [`${className}Filter`],
      isTypeOnly: true,
    },
    {
      from: '../../shared/errors',
      imports: [`${className}TimeoutError`],
      isTypeOnly: false,
    },
  ]);
  builder.addBlankLine();

  // Import infrastructure services
  builder.addComment('Infrastructure services - Database for persistence');
  builder.addRaw(`import { DatabaseService } from "${scope}/infra-database";`);
  builder.addBlankLine();

  builder.addSectionComment('Aggregate Operations');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Aggregate operations for ${className} repository
 *
 * Uses DatabaseService for persistence with efficient database-level aggregation.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * \`\`\`typescript
 * const count = yield* aggregateOperations.count({ search: "test" });
 * \`\`\`
 */
export const aggregateOperations = {
  /**
   * Count ${className} entities matching filter
   */
  count: (filter?: ${className}Filter) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(\`Counting ${className} entities (filter: \${JSON.stringify(filter)})\`);

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

      yield* Effect.logDebug(\`Counted \${count} ${className} entities\`);

      return count;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("count", 30000)
      }),
      Effect.withSpan("${className}Repository.count")
    ),

  /**
   * Check if ${className} entity exists by ID
   */
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
        onTimeout: () => ${className}TimeoutError.create("exists", 30000)
      }),
      Effect.withSpan("${className}Repository.exists")
    ),
} as const;

/**
 * Type alias for the aggregate operations object
 */
export type Aggregate${className}Operations = typeof aggregateOperations;`);

  return builder.toString();
}
