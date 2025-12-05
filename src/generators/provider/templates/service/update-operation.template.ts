/**
 * Provider Update Operation Template
 *
 * Generates service/operations/update.ts with update operations
 *
 * @module monorepo-library-generator/provider/service/update-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/operations/update.ts file
 *
 * Creates the update operation for provider service
 */
export function generateProviderUpdateOperationFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, fileName } = options

  builder.addFileHeader({
    title: `${className} Update Operations`,
    description: `Update operations for ${externalService} provider service.

Bundle optimization: Import only this file for update operations (~3 KB vs ~18 KB full barrel).

Example:
  import { updateOperations } from '@scope/provider-${fileName}/service/operations/update';`,
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
      from: "../../types",
      imports: ["Resource"],
      isTypeOnly: true
    },
    {
      from: "../../errors",
      imports: [`${className}ServiceError`]
    }
  ])
  builder.addBlankLine()

  // Import test store from create.ts
  builder.addImport("./create", "testStore")
  builder.addBlankLine()

  // Operation interface
  builder.addSectionComment("Update Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Update Operations Interface
 */
export interface Update${className}Operations {
  /**
   * Update existing resource
   *
   * @param id - Resource identifier
   * @param data - Partial resource data to update
   * @returns Effect with updated resource
   */
  readonly update: (
    id: string,
    data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
  ) => Effect.Effect<Resource, ${className}ServiceError>;
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Update Operations - Live Implementation
 *
 * TODO: Implement with actual ${externalService} SDK
 */
export const updateOperations: Update${className}Operations = {
  update: (_id, _data) =>
    Effect.gen(function () {
      // TODO: Replace with actual ${externalService} SDK call
      // Example:
      // const client = yield* ${externalService}Client;
      // const result = yield* Effect.tryPromise({
      //   try: () => client.update(id, data),
      //   catch: (error) => map${className}Error(error as Error)
      // });
      // return result;

      return Effect.dieMessage("Update operation not implemented - replace with ${externalService} SDK call");
    }).pipe(
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
 * Update Operations - Test Implementation
 *
 * In-memory implementation for testing
 * Uses shared testStore from create.ts
 */
export const testUpdateOperations: Update${className}Operations = {
  update: (id, data) =>
    Effect.gen(function* () {
      const existing = testStore.get(id);
      if (!existing) {
        return yield* Effect.fail({
          _tag: "NotFoundError",
          message: \`Resource \${id} not found\`
        });
      }

      const updated: Resource = {
        ...existing,
        ...data,
        id, // Preserve ID
        createdAt: existing.createdAt, // Preserve createdAt
        updatedAt: new Date()
      };

      testStore.set(id, updated);
      return updated;
    })
};`)

  return builder.toString()
}
