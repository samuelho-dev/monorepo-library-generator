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
  builder.addImports([{ from: "effect", imports: ["Effect", "Duration"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}CreateInput`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}TimeoutError`],
      isTypeOnly: false
    }
  ])
  builder.addBlankLine()

  // Import infrastructure services
  builder.addComment("Infrastructure services - Database for persistence")
  builder.addRaw(`import { DatabaseService } from "@custom-repo/infra-database";`)
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
  );

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
  );
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Live create operations implementation
 *
 * Uses DatabaseService for persistence with type-safe database queries
 *
 * PRODUCTION INTEGRATION:
 * - DatabaseService for database access via Kysely
 * - Effect.log* methods for observability
 * - Transaction support for batch operations
 * - Timeout protection and distributed tracing
 */
export const createOperations: Create${className}Operations = {
  create: (input: ${className}CreateInput) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Creating ${className}: \${JSON.stringify(input)}\`);

      const entity = yield* database.query((db) =>
        db
          .insertInto("${fileName}s")
          .values({
            ...input,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirstOrThrow()
      );

      yield* Effect.logInfo(\`${className} created successfully (id: \${entity.id})\`);

      return entity;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("create", 30000)
      }),
      Effect.withSpan("${className}Repository.create")
    ),

  createMany: (inputs: ReadonlyArray<${className}CreateInput>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Creating \${inputs.length} ${className} entities\`);

      const entities = yield* database.query((db) =>
        db
          .insertInto("${fileName}s")
          .values(
            inputs.map((input) => ({
              ...input,
              created_at: new Date(),
              updated_at: new Date(),
            }))
          )
          .returningAll()
          .execute()
      );

      yield* Effect.logInfo(\`Created \${entities.length} ${className} entities successfully\`);

      return entities;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("createMany", 30000)
      }),
      Effect.withSpan("${className}Repository.createMany")
    ),
};`)

  return builder.toString()
}
