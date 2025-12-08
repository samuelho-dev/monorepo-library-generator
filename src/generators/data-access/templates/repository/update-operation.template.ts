/**
 * Repository Update Operations Template
 *
 * Generates repository/operations/update.ts file with update operations
 *
 * @module monorepo-library-generator/data-access/repository/update-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/update.ts file
 */
export function generateRepositoryUpdateOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Update Operations`,
    description: `Implements update operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { updateOperations } from '@scope/data-access-${fileName}/repository/operations/update'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Effect"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}`, `${className}UpdateInput`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}RepositoryError`, `${className}NotFoundError`]
    }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Update Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`export interface Update${className}Operations {
  /**
   * Update ${className} entity by ID
   *
   * @param id - Entity identifier
   * @param input - Partial update data
   * @returns Effect that succeeds with updated entity or fails if not found
   */
  update(
    id: string,
    input: ${className}UpdateInput
  ): Effect.Effect<${className}, ${className}RepositoryError>;
}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`export const updateOperations: Update${className}Operations = {
  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function* () {
      // TODO: Implement database update
      // const database = yield* KyselyService;
      // const result = yield* database.query((db) =>
      //   db.updateTable("${fileName}s")
      //     .set({
      //       ...input,
      //       updatedAt: new Date()
      //     })
      //     .where("id", "=", id)
      //     .returningAll()
      //     .executeTakeFirst()
      // );
      //
      // if (!result) {
      //   return yield* Effect.fail(${className}NotFoundError.create(id));
      // }
      //
      // return result;

      return yield* Effect.dieMessage("Update operation not implemented");
    }),
};`)
  builder.addBlankLine()

  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`import { testStore } from "./create";

export const testUpdateOperations: Update${className}Operations = {
  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function* () {
      const existing = testStore.get(id);
      if (!existing) {
        return yield* Effect.fail(${className}NotFoundError.create(id));
      }

      const updated = {
        ...existing,
        ...input,
        updatedAt: new Date(),
      };
      testStore.set(id, updated);
      return updated;
    }),
};`)

  return builder.toString()
}
