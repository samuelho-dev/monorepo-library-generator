/**
 * Repository Read Operations Template
 *
 * Generates repository/operations/read.ts file with read/query operations
 *
 * @module monorepo-library-generator/data-access/repository/read-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate repository/operations/read.ts file
 *
 * Creates implementation for entity read/query operations
 */
export function generateRepositoryReadOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Read Operations`,
    description: `Implements read/query operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { readOperations } from '@scope/data-access-${fileName}/repository/operations/read'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Effect", "Option"] }])
  builder.addBlankLine()

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [
        `${className}`,
        `${className}Filter`,
        `PaginationOptions`,
        `PaginatedResponse`
      ],
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
  builder.addSectionComment("Read Operations Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Read operations for ${className} repository
 */
export interface Read${className}Operations {
  /**
   * Find ${className} entity by ID
   *
   * @param id - Entity identifier
   * @returns Effect that succeeds with Option containing entity or None if not found
   *
   * @example
   * \`\`\`typescript
   * const repo = yield* ${className}Repository;
   * const maybeEntity = yield* repo.findById("id-123");
   * if (Option.isSome(maybeEntity)) {
   *   const entity = maybeEntity.value;
   * }
   * \`\`\`
   */
  findById(
    id: string
  ): Effect.Effect<Option.Option<${className}>, ${className}RepositoryError>;

  /**
   * Find all ${className} entities matching filters
   *
   * @param filter - Optional filter criteria
   * @param pagination - Optional pagination options
   * @returns Effect that succeeds with paginated response
   *
   * @example
   * \`\`\`typescript
   * const repo = yield* ${className}Repository;
   * const results = yield* repo.findAll(
   *   { search: "query" },
   *   { limit: 20, skip: 0 }
   * );
   * \`\`\`
   */
  findAll(
    filter?: ${className}Filter,
    pagination?: PaginationOptions
  ): Effect.Effect<PaginatedResponse<${className}>, ${className}RepositoryError>;

  /**
   * Find one ${className} entity matching filter
   *
   * @param filter - Filter criteria
   * @returns Effect that succeeds with Option containing first matching entity
   *
   * @example
   * \`\`\`typescript
   * const repo = yield* ${className}Repository;
   * const maybeEntity = yield* repo.findOne({ search: "unique-value" });
   * \`\`\`
   */
  findOne(
    filter: ${className}Filter
  ): Effect.Effect<Option.Option<${className}>, ${className}RepositoryError>;
}`)
  builder.addBlankLine()

  // Live implementation
  builder.addSectionComment("Live Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Live read operations implementation
 *
 * TODO: Implement with actual database queries
 * - Use KyselyService for database access
 * - Implement efficient filtering and pagination
 * - Add query optimization and indexing
 */
export const readOperations: Read${className}Operations = {
  findById: (id: string) =>
    Effect.gen(function* () {
      // TODO: Implement database query
      // const database = yield* KyselyService;
      // const result = yield* database.query((db) =>
      //   db.selectFrom("${fileName}s")
      //     .selectAll()
      //     .where("id", "=", id)
      //     .executeTakeFirst()
      // );
      // return result ? Option.some(result) : Option.none();

      return yield* Effect.dieMessage(
        "FindById operation not implemented. Configure KyselyService and implement query logic."
      );
    }),

  findAll: (filter?: ${className}Filter, pagination?: PaginationOptions) =>
    Effect.gen(function* () {
      // TODO: Implement database query with filters and pagination
      // const database = yield* KyselyService;
      // let query = db.selectFrom("${fileName}s").selectAll();
      //
      // // Apply filters
      // if (filter?.search) {
      //   query = query.where("name", "ilike", \`%\${filter.search}%\`);
      // }
      //
      // // Get total count before pagination
      // const totalResult = yield* database.query((db) =>
      //   query.select((eb) => eb.fn.count("id").as("count")).executeTakeFirst()
      // );
      // const total = Number(totalResult?.count ?? 0);
      //
      // // Apply pagination
      // const limit = pagination?.limit ?? 50;
      // const skip = pagination?.skip ?? 0;
      // query = query.limit(limit).offset(skip);
      //
      // const items = yield* database.query((db) => query.execute());
      //
      // return {
      //   items,
      //   total,
      //   limit,
      //   skip,
      //   hasMore: skip + items.length < total
      // };

      return yield* Effect.dieMessage(
        "FindAll operation not implemented. Configure KyselyService and implement query logic."
      );
    }),

  findOne: (filter: ${className}Filter) =>
    Effect.gen(function* () {
      // TODO: Implement database query
      // const database = yield* KyselyService;
      // let query = db.selectFrom("${fileName}s").selectAll();
      //
      // // Apply filters
      // if (filter.search) {
      //   query = query.where("name", "ilike", \`%\${filter.search}%\`);
      // }
      //
      // const result = yield* database.query((db) =>
      //   query.executeTakeFirst()
      // );
      // return result ? Option.some(result) : Option.none();

      return yield* Effect.dieMessage(
        "FindOne operation not implemented. Configure KyselyService and implement query logic."
      );
    }),
};`)
  builder.addBlankLine()

  // Test implementation
  builder.addSectionComment("Test Implementation")
  builder.addBlankLine()

  builder.addRaw(`// Import shared test store from create operations
import { testStore } from "./create";

/**
 * Test read operations implementation
 *
 * Uses in-memory Map for testing
 */
export const testReadOperations: Read${className}Operations = {
  findById: (id: string) =>
    Effect.sync(() => {
      const entity = testStore.get(id);
      return entity ? Option.some(entity) : Option.none();
    }),

  findAll: (filter?: ${className}Filter, pagination?: PaginationOptions) =>
    Effect.sync(() => {
      let items = Array.from(testStore.values());

      // Apply filters (simple search implementation)
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        items = items.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(searchLower)
        );
      }

      const total = items.length;
      const limit = pagination?.limit ?? 50;
      const skip = pagination?.skip ?? 0;

      // Apply pagination
      const paginatedItems = items.slice(skip, skip + limit);

      return {
        items: paginatedItems,
        total,
        limit,
        skip,
        hasMore: skip + paginatedItems.length < total,
      };
    }),

  findOne: (filter: ${className}Filter) =>
    Effect.sync(() => {
      let items = Array.from(testStore.values());

      // Apply filters
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        items = items.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(searchLower)
        );
      }

      return items.length > 0 ? Option.some(items[0]) : Option.none();
    }),
};`)

  return builder.toString()
}
