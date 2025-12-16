/**
 * Provider Delete Operation Template
 *
 * Generates service/operations/delete.ts with delete operations
 *
 * @module monorepo-library-generator/provider/service/delete-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/operations/delete.ts file
 *
 * Creates the delete operation for provider service
 */
export function generateProviderDeleteOperationFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, fileName } = options

  builder.addFileHeader({
    title: `${className} Delete Operations`,
    description: `Delete operations for ${externalService} provider service.

Bundle optimization: Import only this file for delete operations (~2-3 KB vs ~18 KB full barrel).

Example:
  import { deleteOperations } from '@scope/provider-${fileName}/service/operations/delete';`,
    module: `@custom-repo/provider-${fileName}/service/operations`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Schedule", "Duration"] }
  ])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../errors",
      imports: [`${className}ServiceError`],
      isTypeOnly: true
    },
    {
      from: "../../errors",
      imports: [`${className}NotFoundError`, `${className}InternalError`, `${className}TimeoutError`]
    }
  ])
  builder.addBlankLine()

  // Import test store from create.ts
  builder.addImport("./create", "testStore")
  builder.addBlankLine()

  // Operation interface
  builder.addSectionComment("Delete Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Delete Operations Interface
 */
export interface Delete${className}Operations {
  /**
   * Delete resource
   *
   * @param id - Resource identifier
   * @returns Effect with void on success
   */
  readonly delete: (
    id: string
  ) => Effect.Effect<void, ${className}ServiceError>;
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Delete Operations - Live Implementation
 *
 * TODO: Implement with actual ${externalService} SDK
 */
export const deleteOperations: Delete${className}Operations = {
  delete: (id) =>
    Effect.gen(function* () {
      // TODO: Replace with actual ${externalService} SDK call
      // Example:
      // const client = yield* ${externalService}Client;
      // yield* Effect.tryPromise({
      //   try: () => client.delete(id),
      //   catch: (error) => map${className}Error(error as Error)
      // });

      yield* Effect.logWarning(\`Delete operation called for id \${id} but not implemented\`);
      return yield* Effect.fail(
        new ${className}InternalError({
          message: "Delete operation not implemented - replace with ${externalService} SDK call"
        })
      );
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          new ${className}TimeoutError({
            message: "Delete operation timed out",
            timeout: 30000,
          }),
      }),
      Effect.retry(
        Schedule.exponential(Duration.millis(100)).pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      )
    )
};`)
  builder.addBlankLine()

  // Test implementation
  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Delete Operations - Test Implementation
 *
 * In-memory implementation for testing
 * Uses shared testStore from create.ts
 */
export const testDeleteOperations: Delete${className}Operations = {
  delete: (id) =>
    Effect.gen(function* () {
      const exists = testStore.has(id);
      if (!exists) {
        return yield* Effect.fail(
          new ${className}NotFoundError({
            message: \`Resource \${id} not found\`,
            resourceId: id,
            resourceType: "Resource",
          })
        );
      }

      testStore.delete(id);
    })
};`)

  return builder.toString()
}
