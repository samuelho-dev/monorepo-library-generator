/**
 * Repository Delete Operations Template
 *
 * Generates repository/operations/delete.ts file with delete operations
 *
 * @module monorepo-library-generator/data-access/repository/delete-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate repository/operations/delete.ts file
 */
export function generateRepositoryDeleteOperationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Delete Operations`,
    description: `Implements delete operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { deleteOperations } from '@scope/data-access-${fileName}/repository/operations/delete'`,
    module: `${scope}/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Duration", "Effect"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] },
    // Domain errors from contract, infrastructure errors from shared
    { from: `${scope}/contract-${fileName}`, imports: [`${className}NotFoundError`] },
    { from: "../../shared/errors", imports: [`${className}TimeoutError`] }
  ])

  builder.addSectionComment("Delete Operations")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Delete operations for ${className} repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * \`\`\`typescript
 * yield* deleteOperations.delete("id-123")
 * \`\`\`
 */
export const deleteOperations = {
  /**
   * Delete ${className} entity by ID
   */
  delete: (id: string) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      yield* Effect.logDebug(\`Deleting ${className} with id: \${id}\`)

      const result = yield* database.query((db) =>
        db
          .deleteFrom("${fileName}")
          .where("id", "=", id)
          .executeTakeFirst()
      )

      const deletedCount = Number(result.numDeletedRows)
      if (deletedCount === 0) {
        // Throw NotFoundError when record doesn't exist
        // This ensures callers can distinguish "deleted" from "nothing to delete"
        return yield* Effect.fail(new ${className}NotFoundError({
          message: \`${className} not found: \${id}\`,
          ${name}Id: id
        }))
      }

      yield* Effect.logDebug(\`${className} deleted successfully (id: \${id})\`)
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("delete", 30000)
      }),
      Effect.withSpan("${className}Repository.delete")
    ),

  /**
   * Delete multiple ${className} entities by IDs
   *
   * Note: This operation is idempotent for batch deletes - it does not fail
   * if some records don't exist. Returns the count of actually deleted records.
   * Use \`delete\` for single-record deletion with strict existence checking.
   *
   * @returns The number of records that were actually deleted
   */
  deleteMany: (ids: readonly string[]) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      if (ids.length === 0) {
        return 0
      }

      yield* Effect.logDebug(\`Deleting \${ids.length} ${className} entities\`)

      const result = yield* database.query((db) =>
        db
          .deleteFrom("${fileName}")
          .where("id", "in", ids)
          .executeTakeFirst()
      )

      const deletedCount = Number(result.numDeletedRows)
      yield* Effect.logDebug(\`Deleted \${deletedCount}/\${ids.length} ${className} entities\`)

      return deletedCount
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("deleteMany", 30000)
      }),
      Effect.withSpan("${className}Repository.deleteMany")
    )
} as const

/**
 * Type alias for the delete operations object
 */
export type Delete${className}Operations = typeof deleteOperations
`)

  return builder.toString()
}
