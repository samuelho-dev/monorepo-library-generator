/**
 * Repository Update Operations Template
 *
 * Generates repository/operations/update.ts file with update operations
 *
 * @module monorepo-library-generator/data-access/repository/update-operation-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { DataAccessTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate repository/operations/update.ts file
 */
export function generateRepositoryUpdateOperationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Update Operations`,
    description: `Implements update operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { updateOperations } from '@scope/data-access-${fileName}/repository/operations/update'`,
    module: `${scope}/data-access-${fileName}/repository/operations`,
  });
  builder.addBlankLine();

  builder.addImports([{ from: 'effect', imports: ['Effect', 'Duration'] }]);
  builder.addBlankLine();

  builder.addImports([
    {
      from: '../../shared/types',
      imports: [`${className}UpdateInput`],
      isTypeOnly: true,
    },
    {
      from: '../../shared/errors',
      imports: [`${className}NotFoundError`, `${className}TimeoutError`],
    },
  ]);
  builder.addBlankLine();

  // Import infrastructure services
  builder.addComment('Infrastructure services - Database for persistence');
  builder.addRaw(`import { DatabaseService } from "${scope}/infra-database";`);
  builder.addBlankLine();

  builder.addSectionComment('Update Operations');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Update operations for ${className} repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * \`\`\`typescript
 * const updated = yield* updateOperations.update("id-123", { name: "new name" });
 * \`\`\`
 */
export const updateOperations = {
  /**
   * Update ${className} entity by ID
   */
  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(\`Updating ${className} with id: \${id}\`);

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

      yield* Effect.logDebug(\`${className} updated successfully (id: \${id})\`);

      return updated;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("update", 30000)
      }),
      Effect.withSpan("${className}Repository.update")
    ),
} as const;

/**
 * Type alias for the update operations object
 */
export type Update${className}Operations = typeof updateOperations;`);

  return builder.toString();
}
