/**
 * Repository Read Operations Template
 *
 * Generates repository/operations/read.ts file with read/query operations
 *
 * @module monorepo-library-generator/data-access/repository/read-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder";
import type { DataAccessTemplateOptions } from "../../../../utils/shared/types";

/**
 * Generate repository/operations/read.ts file
 *
 * Creates implementation for entity read/query operations
 */
export function generateRepositoryReadOperationFile(
  options: DataAccessTemplateOptions
) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;

  builder.addFileHeader({
    title: `${className} Read Operations`,
    description: `Implements read/query operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { readOperations } from '@scope/data-access-${fileName}/repository/operations/read'`,
    module: `@custom-repo/data-access-${fileName}/repository/operations`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Option", "Duration"] },
  ]);
  builder.addBlankLine();

  builder.addImports([
    {
      from: "../../shared/types",
      imports: [
        `${className}`,
        `${className}Filter`,
        `PaginationOptions`,
        `PaginatedResponse`,
      ],
      isTypeOnly: true,
    },
    {
      from: "../../shared/errors",
      imports: [
        `${className}RepositoryError`,
        `${className}InternalError`,
        `${className}TimeoutError`,
      ],
      isTypeOnly: false,
    },
  ]);
  builder.addBlankLine();

  // Import infrastructure services
  builder.addComment(
    "Infrastructure services - Cache for performance, Database for persistence"
  );
  builder.addRaw(`import { CacheService } from "@custom-repo/infra-cache";`);
  builder.addRaw(
    `import { DatabaseService } from "@custom-repo/infra-database";`
  );
  builder.addBlankLine();

  // Operation interface
  builder.addSectionComment("Read Operations Interface");
  builder.addBlankLine();

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
  );

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
  );

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
  );
}`);
  builder.addBlankLine();

  // Live implementation
  builder.addSectionComment("Live Implementation");
  builder.addBlankLine();

  builder.addRaw(`/**
 * Live read operations implementation
 *
 * Uses DatabaseService for persistence with cache-aside pattern
 *
 * PRODUCTION INTEGRATION:
 * - DatabaseService for database access via Kysely
 * - CacheService for performance optimization
 * - Effect.log* methods for observability
 * - Timeout protection and distributed tracing
 */
export const readOperations: Read${className}Operations = {
  findById: (id: string) =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Finding ${className} by ID: \${id}\`);

      // Check cache first
      const cacheKey = \`${fileName}:\${id}\`;
      const cached = yield* cache.get(cacheKey);
      if (Option.isSome(cached)) {
        yield* Effect.logDebug(\`Cache hit for ${fileName}:\${id}\`);
        return Option.some(cached.value);
      }

      // Cache miss - query database
      yield* Effect.logDebug(\`Cache miss for ${fileName}:\${id}, querying database\`);

      const entity = yield* database.query((db) =>
        db
          .selectFrom("${fileName}s")
          .selectAll()
          .where("id", "=", id)
          .executeTakeFirst()
      );

      if (entity) {
        // Cache the result
        yield* cache.set(cacheKey, entity);
        yield* Effect.logDebug(\`Cached ${fileName}:\${id}\`);
        return Option.some(entity);
      }

      yield* Effect.logDebug(\`${className} not found: \${id}\`);
      return Option.none();
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("findById", 30000)
      }),
      Effect.withSpan("${className}Repository.findById")
    ),

  findAll: (filter?: ${className}Filter, pagination?: PaginationOptions) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Finding all ${className} entities (filter: \${JSON.stringify(filter)})\`);

      const limit = pagination?.limit ?? 50;
      const skip = pagination?.skip ?? 0;

      // Build query with filtering
      const items = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}s").selectAll();

        // Apply filters (basic search implementation)
        // TODO: Implement proper full-text search or specific field filtering
        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              // Add searchable fields here based on your schema
              eb("name", "ilike", \`%\${filter.search}%\`),
            ])
          );
        }

        return query.limit(limit).offset(skip).execute();
      });

      // Get total count (without pagination)
      const total = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}s").select((eb) => eb.fn.countAll().as("count"));

        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", \`%\${filter.search}%\`),
            ])
          );
        }

        return query.executeTakeFirstOrThrow().then((result) => Number(result.count));
      });

      yield* Effect.logInfo(\`Found \${items.length} ${className} entities (total: \${total})\`);

      return {
        items,
        total,
        limit,
        skip,
        hasMore: skip + items.length < total,
      };
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("findAll", 30000)
      }),
      Effect.withSpan("${className}Repository.findAll")
    ),

  findOne: (filter: ${className}Filter) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logInfo(\`Finding one ${className} entity (filter: \${JSON.stringify(filter)})\`);

      // Build query with filtering
      const entity = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}s").selectAll();

        // Apply filters
        if (filter.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", \`%\${filter.search}%\`),
            ])
          );
        }

        return query.limit(1).executeTakeFirst();
      });

      if (entity) {
        yield* Effect.logDebug(\`Found ${className} matching filter\`);
        return Option.some(entity);
      }

      yield* Effect.logDebug(\`No ${className} found matching filter\`);
      return Option.none();
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          ${className}TimeoutError.create("findOne", 30000)
      }),
      Effect.withSpan("${className}Repository.findOne")
    ),
};`);

  return builder.toString();
}
