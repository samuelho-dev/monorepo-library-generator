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

  builder.addImports([{ from: "effect", imports: ["Effect", "Duration"] }])
  builder.addBlankLine()

  builder.addImports([
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

  builder.addRaw(`/**
 * Live delete operations implementation
 *
 * Uses DatabaseService for persistence with type-safe database queries
 *
 * PRODUCTION INTEGRATION:
 * - DatabaseService for database access via Kysely
 * - Effect.log* methods for observability
 * - Batch deletion support for deleteMany
 * - Timeout protection and distributed tracing
 */
export const deleteOperations: Delete${className}Operations = {
  delete: (id: string) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Deleting ${className} with id: \${id}\`);

      const result = yield* database.query((db) =>
        db
          .deleteFrom("${fileName}s")
          .where("id", "=", id)
          .executeTakeFirst()
      );

      const deletedCount = Number(result.numDeletedRows);
      if (deletedCount > 0) {
        yield* Effect.logInfo(\`${className} deleted successfully (id: \${id})\`);
      } else {
        yield* Effect.logDebug(\`${className} not found for deletion (id: \${id})\`);
      }
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("delete", 30000)
      }),
      Effect.withSpan("${className}Repository.delete")
    ),

  deleteMany: (ids: ReadonlyArray<string>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Deleting \${ids.length} ${className} entities\`);

      const result = yield* database.query((db) =>
        db
          .deleteFrom("${fileName}s")
          .where("id", "in", ids)
          .executeTakeFirst()
      );

      const deletedCount = Number(result.numDeletedRows);
      yield* Effect.logInfo(\`Deleted \${deletedCount}/\${ids.length} ${className} entities\`);
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("deleteMany", 30000)
      }),
      Effect.withSpan("${className}Repository.deleteMany")
    ),
};`)

  return builder.toString()
}
