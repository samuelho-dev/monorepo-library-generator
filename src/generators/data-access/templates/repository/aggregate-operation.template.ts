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

  builder.addImports([{ from: "effect", imports: ["Effect"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}Filter`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}RepositoryError`],
      isTypeOnly: true
    }
  ])
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
  count(filter?: ${className}Filter): Effect.Effect<number, ${className}RepositoryError>;

  /**
   * Check if ${className} entity exists by ID
   *
   * @param id - Entity identifier
   * @returns Effect that succeeds with boolean
   */
  exists(id: string): Effect.Effect<boolean, ${className}RepositoryError>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`export const aggregateOperations: Aggregate${className}Operations = {
  count: (_filter?: ${className}Filter) =>
    Effect.gen(function () {
      // TODO: Implement database count
      // const database = yield* KyselyService;
      // let query = db.selectFrom("${fileName}s")
      //   .select((eb) => eb.fn.count("id").as("count"));
      //
      // if (filter?.search) {
      //   query = query.where("name", "ilike", \`%\${filter.search}%\`);
      // }
      //
      // const result = yield* database.query((db) =>
      //   query.executeTakeFirst()
      // );
      //
      // return Number(result?.count ?? 0);

      return Effect.dieMessage("Count operation not implemented");
    }),

  exists: (_id: string) =>
    Effect.gen(function () {
      // TODO: Implement database exists check
      // const database = yield* KyselyService;
      // const result = yield* database.query((db) =>
      //   db.selectFrom("${fileName}s")
      //     .select("id")
      //     .where("id", "=", id)
      //     .executeTakeFirst()
      // );
      //
      // return !!result;

      return Effect.dieMessage("Exists operation not implemented");
    }),
};`)
  builder.addBlankLine()

  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`import { testStore } from "./create";

export const testAggregateOperations: Aggregate${className}Operations = {
  count: (filter?: ${className}Filter) =>
    Effect.sync(() => {
      if (!filter?.search) {
        return testStore.size;
      }

      // Simple search implementation
      const searchLower = filter.search.toLowerCase();
      let count = 0;
      for (const entity of testStore.values()) {
        if (JSON.stringify(entity).toLowerCase().includes(searchLower)) {
          count++;
        }
      }
      return count;
    }),

  exists: (id: string) =>
    Effect.sync(() => testStore.has(id)),
};`)

  return builder.toString()
}
