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

  builder.addImports([{ from: "effect", imports: ["Effect", "Duration"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}UpdateInput`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}NotFoundError`, `${className}TimeoutError`]
    }
  ])
  builder.addBlankLine()

  // Import infrastructure services
  builder.addComment("Infrastructure services - Database for persistence")
  builder.addRaw(`import { DatabaseService } from "@custom-repo/infra-database";`)
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
  );
}`)
  builder.addBlankLine()

  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Live update operations implementation
 *
 * Uses DatabaseService for persistence with type-safe database queries
 *
 * PRODUCTION INTEGRATION:
 * - DatabaseService for database access via Kysely
 * - Effect.log* methods for observability
 * - Proper error handling for not found cases
 * - Timeout protection and distributed tracing
 */
export const updateOperations: Update${className}Operations = {
  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Updating ${className} with id: \${id}\`);

      const updated = yield* database.query((db) =>
        db
          .updateTable("${fileName}s")
          .set({
            ...input,
            updated_at: new Date(),
          })
          .where("id", "=", id)
          .returningAll()
          .executeTakeFirst()
      );

      if (!updated) {
        yield* Effect.logWarning(\`${className} not found: \${id}\`);
        return yield* Effect.fail(${className}NotFoundError.create(id));
      }

      yield* Effect.logInfo(\`${className} updated successfully (id: \${id})\`);

      return updated;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("update", 30000)
      }),
      Effect.withSpan("${className}Repository.update")
    ),
};`)

  return builder.toString()
}
