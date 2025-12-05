/**
 * Repository Delete Operations Template
 *
 * Generates repository/operations/delete.ts file with delete operations
 *
 * @module monorepo-library-generator/data-access/repository/delete-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/delete.ts file
 */
export function generateRepositoryDeleteOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Delete Operations`,
    description: `Implements delete operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { deleteOperations } from '@scope/data-access-${fileName}/repository/operations/delete'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Effect"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/errors",
      imports: [`${className}RepositoryError`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Delete Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`export interface Delete${className}Operations {
  /**
   * Delete ${className} entity by ID
   *
   * @param id - Entity identifier
   * @returns Effect that succeeds when entity is deleted
   */
  delete(id: string): Effect.Effect<void, ${className}RepositoryError>;

  /**
   * Delete multiple ${className} entities by IDs
   *
   * @param ids - Array of entity identifiers
   * @returns Effect that succeeds when all entities are deleted
   */
  deleteMany(
    ids: ReadonlyArray<string>
  ): Effect.Effect<void, ${className}RepositoryError>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`export const deleteOperations: Delete${className}Operations = {
  delete: (_id: string) =>
    Effect.gen(function () {
      // TODO: Implement database delete
      // const database = yield* KyselyService;
      // yield* database.query((db) =>
      //   db.deleteFrom("${fileName}s")
      //     .where("id", "=", id)
      //     .execute()
      // );

      return Effect.dieMessage("Delete operation not implemented");
    }),

  deleteMany: (_ids: ReadonlyArray<string>) =>
    Effect.gen(function () {
      // TODO: Implement batch delete
      // const database = yield* KyselyService;
      // yield* database.query((db) =>
      //   db.deleteFrom("${fileName}s")
      //     .where("id", "in", ids)
      //     .execute()
      // );

      return Effect.dieMessage("DeleteMany operation not implemented");
    }),
};`)
  builder.addBlankLine()

  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`import { testStore } from "./create";

export const testDeleteOperations: Delete${className}Operations = {
  delete: (id: string) =>
    Effect.sync(() => {
      testStore.delete(id);
    }),

  deleteMany: (ids: ReadonlyArray<string>) =>
    Effect.sync(() => {
      ids.forEach((id) => testStore.delete(id));
    }),
};`)

  return builder.toString()
}
