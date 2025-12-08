/**
 * Repository Create Operations Template
 *
 * Generates repository/operations/create.ts file with create operations
 *
 * @module monorepo-library-generator/data-access/repository/create-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/create.ts file
 *
 * Creates implementation for entity creation operations
 */
export function generateRepositoryCreateOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Create Operations`,
    description: `Implements create operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { createOperations } from '@scope/data-access-${fileName}/repository/operations/create'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Effect"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}`, `${className}CreateInput`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}RepositoryError`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Operation interface
  builder.addSectionComment("Create Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create operations for ${className} repository
 */
export interface Create${className}Operations {
  /**
   * Create a new ${className} entity
   *
   * @param input - Entity creation data
   * @returns Effect that succeeds with created entity or fails with repository error
   *
   * @example
   * \`\`\`typescript
   * const repo = yield* ${className}Repository;
   * const newEntity = yield* repo.create({
   *   // ...entity data
   * });
   * \`\`\`
   */
  create(
    input: ${className}CreateInput
  ): Effect.Effect<${className}, ${className}RepositoryError>;

  /**
   * Create multiple ${className} entities in batch
   *
   * @param inputs - Array of entity creation data
   * @returns Effect that succeeds with created entities or fails with repository error
   *
   * @example
   * \`\`\`typescript
   * const repo = yield* ${className}Repository;
   * const entities = yield* repo.createMany([
   *   { name: "entity 1" },
   *   { name: "entity 2" }
   * ]);
   * \`\`\`
   */
  createMany(
    inputs: ReadonlyArray<${className}CreateInput>
  ): Effect.Effect<ReadonlyArray<${className}>, ${className}RepositoryError>;
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Live create operations implementation
 *
 * TODO: Implement with actual database operations
 * - Use KyselyService for database access
 * - Add validation and error handling
 * - Implement transaction support for createMany
 */
export const createOperations: Create${className}Operations = {
  create: (input: ${className}CreateInput) =>
    Effect.gen(function* () {
      // TODO: Implement database insert
      // const database = yield* KyselyService;
      // const result = yield* database.query((db) =>
      //   db.insertInto("${fileName}s")
      //     .values({
      //       ...input,
      //       id: randomUUID(),
      //       createdAt: new Date(),
      //       updatedAt: new Date()
      //     })
      //     .returningAll()
      //     .executeTakeFirstOrThrow()
      // );
      // return result;

      return yield* Effect.dieMessage(
        "Create operation not implemented. Configure KyselyService and implement database logic."
      );
    }),

  createMany: (inputs: ReadonlyArray<${className}CreateInput>) =>
    Effect.gen(function* () {
      // TODO: Implement batch insert with transaction
      // const database = yield* KyselyService;
      // const results = yield* database.query((db) =>
      //   db.transaction().execute(async (trx) => {
      //     const inserted = [];
      //     for (const input of inputs) {
      //       const result = await trx
      //         .insertInto("${fileName}s")
      //         .values({
      //           ...input,
      //           id: randomUUID(),
      //           createdAt: new Date(),
      //           updatedAt: new Date()
      //         })
      //         .returningAll()
      //         .executeTakeFirstOrThrow();
      //       inserted.push(result);
      //     }
      //     return inserted;
      //   })
      // );
      // return results;

      return yield* Effect.dieMessage(
        "CreateMany operation not implemented. Configure KyselyService and implement batch logic."
      );
    }),
};`)
  builder.addBlankLine()

  // Test implementation
  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`// Shared test storage
const testStore = new Map<string, ${className}>();
let testIdCounter = 0;

/**
 * Test create operations implementation
 *
 * Uses in-memory Map for testing
 */
export const testCreateOperations: Create${className}Operations = {
  create: (input: ${className}CreateInput) =>
    Effect.sync(() => {
      const id = String(++testIdCounter);
      const now = new Date();
      const entity: ${className} = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
      };
      testStore.set(id, entity);
      return entity;
    }),

  createMany: (inputs: ReadonlyArray<${className}CreateInput>) =>
    Effect.sync(() => {
      return inputs.map((input) => {
        const id = String(++testIdCounter);
        const now = new Date();
        const entity: ${className} = {
          ...input,
          id,
          createdAt: now,
          updatedAt: now,
        };
        testStore.set(id, entity);
        return entity;
      });
    }),
};

/**
 * Export test store for use by other operation modules
 */
export { testStore };`)

  return builder.toString()
}
