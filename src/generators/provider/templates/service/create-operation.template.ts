/**
 * Provider Create Operation Template
 *
 * Generates service/operations/create.ts with create operations
 *
 * @module monorepo-library-generator/provider/service/create-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/operations/create.ts file
 *
 * Creates the create operation for provider service
 */
export function generateProviderCreateOperationFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, fileName } = options

  builder.addFileHeader({
    title: `${className} Create Operations`,
    description: `Create operations for ${externalService} provider service.

Bundle optimization: Import only this file for create operations (~3-4 KB vs ~18 KB full barrel).

Example:
  import { createOperations } from '@scope/provider-${fileName}/service/operations/create';`,
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

  // Operation interface
  builder.addSectionComment("Create Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create Operations Interface
 */
export interface Create${className}Operations {
  /**
   * Create new resource
   *
   * @param data - Resource creation data
   * @returns Effect with created resource
   */
  readonly create: (
    data: Omit<Resource, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<Resource, ${className}ServiceError>;
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create Operations - Live Implementation
 *
 * TODO: Implement with actual ${externalService} SDK
 */
export const createOperations: Create${className}Operations = {
  create: (_data) =>
    Effect.gen(function () {
      // TODO: Replace with actual ${externalService} SDK call
      // Example:
      // const client = yield* ${externalService}Client;
      // const result = yield* Effect.tryPromise({
      //   try: () => client.create(data),
      //   catch: (error) => map${className}Error(error as Error)
      // });
      // return result;

      return Effect.dieMessage("Create operation not implemented - replace with ${externalService} SDK call");
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
 * Shared test store
 *
 * Exported so other operations can access the same store
 */
let testIdCounter = 0;
export const testStore = new Map<string, Resource>();

/**
 * Create Operations - Test Implementation
 *
 * In-memory implementation for testing
 */
export const testCreateOperations: Create${className}Operations = {
  create: (data) =>
    Effect.sync(() => {
      const id = String(++testIdCounter);
      const resource: Resource = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      testStore.set(id, resource);
      return resource;
    })
};`)

  return builder.toString()
}
