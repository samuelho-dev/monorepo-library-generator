/**
 * Repository Create Operations Template
 *
 * Generates repository/operations/create.ts file with create operations
 *
 * @module monorepo-library-generator/data-access/repository/create-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate repository/operations/create.ts file
 *
 * Creates implementation for entity creation operations
 */
export function generateRepositoryCreateOperationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Create Operations`,
    description: `Implements create operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { createOperations } from '@scope/data-access-${fileName}/repository/operations/create'`,
    module: `${scope}/data-access-${fileName}/repository/operations`
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
  builder.addRaw(`import { DatabaseService } from "${scope}/infra-database";`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Create Operations")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create operations for ${className} repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * \`\`\`typescript
 * const entity = yield* createOperations.create({ name: "example" });
 * \`\`\`
 */
export const createOperations = {
  /**
   * Create a new ${className} entity
   */
  create: (input: ${className}CreateInput) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(\`Creating ${className}: \${JSON.stringify(input)}\`);

      const entity = yield* database.query((db) =>
        db
          .insertInto("${fileName}")
          .values({
            ...input,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returningAll()
          .executeTakeFirstOrThrow()
      );

      yield* Effect.logDebug("${className} created successfully");

      return entity;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("create", 30000)
      }),
      Effect.withSpan("${className}Repository.create")
    ),

  /**
   * Create multiple ${className} entities in batch
   */
  createMany: (inputs: ReadonlyArray<${className}CreateInput>) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(\`Creating \${inputs.length} ${className} entities\`);

      const entities = yield* database.query((db) =>
        db
          .insertInto("${fileName}")
          .values(
            inputs.map((input) => ({
              ...input,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          )
          .returningAll()
          .execute()
      );

      yield* Effect.logDebug(\`Created \${entities.length} ${className} entities successfully\`);

      return entities;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("createMany", 30000)
      }),
      Effect.withSpan("${className}Repository.createMany")
    ),
} as const;

/**
 * Type alias for the create operations object
 */
export type Create${className}Operations = typeof createOperations;`)

  return builder.toString()
}
