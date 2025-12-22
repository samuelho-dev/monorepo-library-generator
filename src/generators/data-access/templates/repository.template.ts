/**
 * Data Access Repository Template
 *
 * Generates repository.ts file for data-access libraries with full repository implementation.
 *
 * @module monorepo-library-generator/data-access/repository-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { DataAccessTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate repository.ts file for data-access library
 *
 * Creates comprehensive repository implementation including:
 * - Repository Context.Tag with static layers
 * - Live, Test, Dev, and Auto layers
 * - Full CRUD operations with Kysely
 * - Error handling and validation
 */
export function generateRepositoryFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header with architecture notes
  builder.addFileHeader({
    title: `${className} Repository Implementation`,
    description: `Implements the ${className}Repository contract interface.
Fulfills the contract defined in \`${scope}/contract-${fileName}\`.

ARCHITECTURE PATTERN:
1. Import repository tag from contract library (NOT from ./interface.ts)
2. Create implementation that provides all methods
3. Wrap with Layer.effect() for dependency injection

@see ${scope}/contract-${fileName} - Repository contract interface
@see https://effect.website/docs/guides/context-management for layer patterns`,
    module: `${scope}/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Option', 'Layer', 'Stream'] },
    { from: `${scope}/env`, imports: ['env'] },
  ]);
  builder.addBlankLine();

  // Add critical architecture pattern comment
  builder.addSectionComment('CRITICAL: Contract-First Architecture');
  builder.addComment('');
  builder.addComment('ARCHITECTURE PATTERN: Repository interface is defined in contract library,');
  builder.addComment('NOT in data-access. This enforces separation of concerns:');
  builder.addComment('');
  builder.addComment(`1. Contract Library (${scope}/contract-${fileName})`);
  builder.addComment('   ├── Defines repository interface (port)');
  builder.addComment('   ├── Defines domain errors');
  builder.addComment('   └── Defines entity types');
  builder.addComment('');
  builder.addComment(`2. Data-Access Library (${scope}/data-access-${fileName})`);
  builder.addComment('   ├── Implements repository (adapter)');
  builder.addComment('   ├── Uses contract tag for Layer.effect');
  builder.addComment('   └── Provides operational code');
  builder.addComment('');
  builder.addComment('If contract library is not yet configured:');
  builder.addComment(`1. Create: libs/contracts/${fileName}/src/index.ts`);
  builder.addComment(`2. Define ${className}Repository tag with Context.Tag`);
  builder.addComment('3. Export error types and entity types');
  builder.addComment('4. Uncomment imports below and remove fallback imports');
  builder.addBlankLine();

  // Step 1: Import from contract (commented out)
  builder.addSectionComment('STEP 1: Import repository tag from CONTRACT library');
  builder.addComment('');
  builder.addComment('CRITICAL: The repository interface MUST be defined in the contract library.');
  builder.addComment('This enforces Contract-First Architecture where:');
  builder.addComment('1. Contract library defines the interface (port)');
  builder.addComment('2. Data-access library implements the interface (adapter)');
  builder.addComment('');
  builder.addComment('BEFORE YOU CAN USE THIS FILE:');
  builder.addComment(`1. Ensure contract library exists: libs/contract/${fileName}`);
  builder.addComment('2. Uncomment the import below');
  builder.addComment('3. Remove the FALLBACK section');
  builder.addComment(`4. Verify contract exports ${className}Repository tag`);
  builder.addBlankLine();

  builder.addRaw(`// TODO: Uncomment when contract library is configured
// import { ${className}Repository } from "${scope}/contract-${fileName}";
// import type { ${className}RepositoryError } from "${scope}/contract-${fileName}";`);
  builder.addBlankLine();

  // Fallback local types
  builder.addSectionComment('FALLBACK: Local types (remove when contract is configured)');
  builder.addComment('');
  builder.addComment('WARNING: This fallback implementation violates Contract-First Architecture!');
  builder.addComment('It exists only to allow the generated code to compile initially.');
  builder.addComment('Replace with actual contract imports as soon as possible.');
  builder.addBlankLine();

  builder.addImports([{ from: 'effect', imports: ['Context'] }]);

  builder.addImports([
    {
      from: './shared/types',
      imports: [`${className}`, `${className}CreateInput`, `${className}UpdateInput`],
      isTypeOnly: true,
    },
    {
      from: './shared/errors',
      imports: [`${className}RepositoryError`],
      isTypeOnly: true,
    },
    {
      from: './shared/errors',
      imports: [
        `${className}InternalError`,
        `${className}NotFoundError`,
        `${className}ConflictError`,
      ],
    },
  ]);
  builder.addBlankLine();

  // Create Context.Tag definition
  builder.addRaw(`// TEMPORARY: Local Context.Tag definition
// TODO: Remove this and import from ${scope}/contract-${fileName} instead
//
// NOTE: Interface aligns with contract port definition
// - findById returns Option to handle not found
// - findAll uses filters, pagination, sort pattern
// - create (not save) for consistency
// - exists method for boolean checks
export class ${className}Repository extends Context.Tag(
  "${scope}/data-access-${fileName}/${className}Repository"
)<
  ${className}Repository,
  {
    readonly findById: (
      id: string
    ) => Effect.Effect<Option.Option<${className}>, ${className}RepositoryError>;
    readonly findAll: (
      filters?: Record<string, unknown>,
      pagination?: { limit: number; offset: number },
      sort?: { field: string; direction: "asc" | "desc" }
    ) => Effect.Effect<
      { items: readonly ${className}[]; total: number; limit: number; offset: number; hasMore: boolean },
      ${className}RepositoryError
    >;
    readonly count: (
      filters?: Record<string, unknown>
    ) => Effect.Effect<number, ${className}RepositoryError>;
    readonly create: (
      input: ${className}CreateInput
    ) => Effect.Effect<${className}, ${className}RepositoryError>;
    readonly update: (
      id: string,
      input: ${className}UpdateInput
    ) => Effect.Effect<${className}, ${className}RepositoryError>;
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError>;
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, ${className}RepositoryError>;
  }
>() {`);
  builder.addBlankLine();

  // Add static Live layer
  builder.addRaw(`  /**
   * Live Layer - Production implementation
   *
   * Effect 3.0+ Pattern: Static members on Context.Tag
   * Access via: ${className}Repository.Live
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Import and yield actual dependencies
      // Import from ${scope}/provider-kysely/server:
      // import { KyselyService } from "${scope}/provider-kysely/server";
      // const database = yield* KyselyService;

      // Optional: Import LoggingService for query logging
      // import { LoggingService } from "${scope}/infra-logging/server";
      // const logger = yield* LoggingService;

      // For now, create repository with placeholder database
      const placeholderDb: DatabaseService = {
        query: <T>(_fn: (db: KyselyDatabase) => Promise<T>): Effect.Effect<T, never, never> =>
          Effect.dieMessage(
            "Database not configured. Import and provide KyselyService from ${scope}/provider-kysely"
          ),
      };
      return create${className}Repository(placeholderDb, undefined);
    })
  );`);
  builder.addBlankLine();

  // Add static Test layer
  builder.addRaw(`  /**
   * Test Layer - In-memory implementation
   *
   * Access via: ${className}Repository.Test
   */
  static readonly Test = Layer.succeed(
    this,
    (() => {
      const store = new Map<string, ${className}>();
      let idCounter = 0;

      return {
        findById: (id: string) =>
          Effect.succeed(
            Option.fromNullable(store.get(id))
          ),
        findAll: (
          filters?: Record<string, unknown>,
          pagination?: { limit: number; offset: number },
        ) =>
          Effect.succeed({
            items: Array.from(store.values()),
            total: store.size,
            limit: pagination?.limit ?? 50,
            offset: pagination?.offset ?? 0,
            hasMore: false,
          }),
        count: () => Effect.succeed(store.size),
        create: (entity: ${className}CreateInput) =>
          Effect.succeed(
            (() => {
              const id = String(++idCounter);
              const now = new Date();
              const saved = { ...entity, id, createdAt: now, updatedAt: now };
              store.set(id, saved);
              return saved;
            })(),
          ),
        update: (id: string, updates: ${className}UpdateInput) =>
          Effect.gen(function* () {
            if (!store.has(id)) {
              return yield* Effect.fail(${className}NotFoundError.create(id));
            }
            const existing = store.get(id);
            const updated = {
              ...(typeof existing === "object" && existing !== null ? existing : {}),
              ...updates,
              updatedAt: new Date()
            };
            store.set(id, updated);
            return updated;
          }),
        delete: (id: string) =>
          Effect.sync(() => {
            store.delete(id);
          }),
        exists: (id: string) => Effect.succeed(store.has(id)),
        streamAll: (options?: { batchSize?: number }) => {
          const batchSize = options?.batchSize ?? 100;
          const allItems = Array.from(store.values());

          return Stream.paginateEffect(0, (page) =>
            Effect.succeed([
              allItems.slice(page * batchSize, (page + 1) * batchSize),
              (page + 1) * batchSize < allItems.length
                ? Option.some(page + 1)
                : Option.none()
            ] as const)
          ).pipe(
            Stream.flatMap((batch) => Stream.fromIterable(batch))
          );
        },
      };
    })(),
  );`);
  builder.addBlankLine();

  // Add static Dev layer
  builder.addRaw(`  /**
   * Dev Layer - Development implementation with logging
   *
   * Access via: ${className}Repository.Dev
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Import and yield actual dependencies
      // Same as Live layer but with console logging wrapper
      const placeholderDb: DatabaseService = {
        query: <T>(_fn: (db: KyselyDatabase) => Promise<T>): Effect.Effect<T, never, never> =>
          Effect.dieMessage(
            "Database not configured. Import and provide KyselyService from ${scope}/provider-kysely"
          ),
      };
      const repo = create${className}Repository(placeholderDb, undefined);

      // Wrap with logging
      return {
        findById: (id: string) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] findById", { id });
            const result = yield* repo.findById(id);
            yield* Effect.logDebug("[${className}Repository] findById result:", Option.isSome(result) ? "found" : "not found");
            return result;
          }),
        findAll: (filters, pagination, sort) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] findAll", { filters, pagination, sort });
            const result = yield* repo.findAll(filters, pagination, sort);
            yield* Effect.logDebug("[${className}Repository] findAll result count:", result.items.length);
            return result;
          }),
        count: (filters) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] count", { filters });
            const result = yield* repo.count(filters);
            yield* Effect.logDebug("[${className}Repository] count result:", result);
            return result;
          }),
        create: (input) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] create", { input });
            const result = yield* repo.create(input);
            yield* Effect.logDebug("[${className}Repository] create result:", result);
            return result;
          }),
        update: (id, input) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] update", { id, input });
            const result = yield* repo.update(id, input);
            yield* Effect.logDebug("[${className}Repository] update result:", result);
            return result;
          }),
        delete: (id) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] delete", { id });
            yield* repo.delete(id);
            yield* Effect.logDebug("[${className}Repository] delete success");
          }),
        exists: (id) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Repository] exists", { id });
            const result = yield* repo.exists(id);
            yield* Effect.logDebug("[${className}Repository] exists result:", result);
            return result;
          }),
        streamAll: (options) =>
          Effect.logDebug("[${className}Repository] streamAll", { options }).pipe(
            Effect.andThen(
              repo.streamAll(options).pipe(
                Stream.tap((item) =>
                  Effect.logDebug("[${className}Repository] streamAll item:", item)
                )
              )
            )
          ),
      };
    }),
  );`);
  builder.addBlankLine();

  // Add static Auto layer
  builder.addRaw(`  /**
   * Auto Layer - Environment-based selection
   *
   * Access via: ${className}Repository.Auto
   */
  static readonly Auto = (() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}Repository.Test;
      case "development":
        return ${className}Repository.Dev;
      default:
        return ${className}Repository.Live;
    }
  })();
}`);
  builder.addBlankLine();

  // Repository Implementation
  builder.addSectionComment('Repository Implementation');
  builder.addBlankLine();

  // Create repository factory function
  builder.addRaw(`// TODO: Import actual types when dependencies are configured:
// import type { KyselyService } from "${scope}/provider-kysely/server";
// import type { LoggingService } from "${scope}/infra-logging/server";

/**
 * Kysely database query builder interface
 * Replace with actual Kysely.Selectable<DB['${fileName}']> from your schema
 */
interface KyselyDatabase {
  selectFrom: <T extends string>(table: T) => {
    selectAll: () => QueryBuilder;
    select: <R>(fn: (eb: ExpressionBuilder) => R) => QueryBuilder;
  };
  insertInto: <T extends string>(table: T) => {
    values: (data: Record<string, unknown>) => {
      returningAll: () => { executeTakeFirstOrThrow: () => Promise<Record<string, unknown>> };
    };
  };
  updateTable: <T extends string>(table: T) => {
    set: (data: Record<string, unknown>) => {
      where: (col: string, op: string, val: unknown) => {
        returningAll: () => { executeTakeFirstOrThrow: () => Promise<Record<string, unknown>> };
      };
    };
  };
  deleteFrom: <T extends string>(table: T) => {
    where: (col: string, op: string, val: unknown) => {
      executeTakeFirst: () => Promise<{ numDeletedRows: bigint }>;
    };
  };
}

interface QueryBuilder {
  where: (col: string, op: string, val: unknown) => QueryBuilder;
  orderBy: (field: string, direction: "asc" | "desc") => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  offset: (n: number) => QueryBuilder;
  execute: () => Promise<readonly unknown[]>;
  executeTakeFirst: () => Promise<unknown | undefined>;
  executeTakeFirstOrThrow: () => Promise<Record<string, unknown>>;
}

interface ExpressionBuilder {
  fn: {
    countAll: <T>() => { as: (alias: string) => T };
  };
}

/**
 * Database service interface for Effect-based queries
 */
interface DatabaseService {
  query: <T>(fn: (db: KyselyDatabase) => Promise<T>) => Effect.Effect<T, never, never>;
}

/**
 * Logging service interface
 */
interface LoggingService {
  debug: (message: string, context?: Record<string, unknown>) => Effect.Effect<void, never, never>;
  info: (message: string, context?: Record<string, unknown>) => Effect.Effect<void, never, never>;
}

/**
 * Create ${className} Repository with Kysely Integration
 *
 * This factory creates a repository implementation using Kysely for type-safe queries.
 * Kysely is accessed through DatabaseService from ${scope}/provider-kysely.
 *
 * @param database - KyselyService from provider-kysely
 * @param logger - Optional LoggingService for query logging
 * @returns Repository implementation with Kysely queries
 */
function create${className}Repository(
  database: DatabaseService,
  logger?: LoggingService,
) {
  return {
    findAll: (
      filters?: Record<string, unknown>,
      pagination?: { limit: number; offset: number },
      sort?: { field: string; direction: "asc" | "desc" }
    ) =>
      Effect.gen(function* () {
        try {
          const limit = pagination?.limit ?? 50;
          const offset = pagination?.offset ?? 0;

          // Get total count first
          const countResult = yield* database.query((db) => {
            let queryBuilder = db
              .selectFrom('${fileName}')
              .select((eb) => eb.fn.countAll<number>().as('count'));

            // TODO: Apply filters from filters object
            // Example:
            // if (filters?.status) {
            //   queryBuilder = queryBuilder.where('status', '=', filters.status);
            // }

            return queryBuilder.executeTakeFirstOrThrow();
          });

          const total = Number(countResult.count);

          // Get paginated results
          const results = yield* database.query((db) => {
            // Build type-safe query with Kysely
            let queryBuilder = db
              .selectFrom('${fileName}')
              .selectAll();

            // TODO: Apply filters from filters object
            // Example:
            // if (filters?.status) {
            //   queryBuilder = queryBuilder.where('status', '=', filters.status);
            // }

            // Apply sorting
            if (sort) {
              queryBuilder = queryBuilder.orderBy(sort.field, sort.direction);
            }

            // Apply pagination
            queryBuilder = queryBuilder.limit(limit).offset(offset);

            // Execute query
            return queryBuilder.execute();
          });

          // Optional: Log query results
          if (logger) {
            yield* logger.debug("${className} findAll", {
              count: results.length,
              total,
              limit,
              offset,
            });
          }

          return {
            items: results,
            total,
            limit,
            offset,
            hasMore: offset + results.length < total,
          };
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              "Failed to find all ${className}",
              error,
            ),
          );
        }
      }),

    findById: (id: string) =>
      Effect.gen(function* () {
        // NOTE: Error observability with tapErrorTag
        // Add logging/metrics without altering error flow:
        //
        // const result = yield* database.query((db) =>
        //   db.selectFrom('${fileName}')
        //     .selectAll()
        //     .where('id', '=', id)
        //     .executeTakeFirst()
        // ).pipe(
        //   Effect.tapErrorTag("DatabaseConnectionError", (error) =>
        //     logger.error("DB connection lost", { operation: "findById", id, error })
        //   ),
        //   Effect.tapErrorTag("QueryTimeoutError", (error) =>
        //     metrics.increment("database.query.timeout", { table: "${fileName}" })
        //   )
        // );

        try {
          // ✅ KYSELY PATTERN: Query single row with executeTakeFirst()
          const result = yield* database.query((db) =>
            db
              .selectFrom('${fileName}')
              .selectAll()
              .where('id', '=', id)
              .executeTakeFirst()
          );

          // Return Option to handle not found case
          return result ? Option.some(result) : Option.none();
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              \`Failed to find ${className} with id '\${id}'\`,
              error,
            ),
          );
        }
      }),

    create: (input: ${className}CreateInput) =>
      Effect.gen(function* () {
        try {
          // TODO: Validate input before creating
          // const validated = yield* validate${className}CreateInput(input);

          // ✅ KYSELY PATTERN: Insert with returningAll() to get created entity
          const result = yield* database.query((db) =>
            db
              .insertInto('${fileName}')
              .values({
                ...input,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .returningAll()
              .executeTakeFirstOrThrow()
          );

          if (logger) {
            yield* logger.info("${className} created", { id: result.id });
          }

          return result;
        } catch (error) {
          // Handle unique constraint violations
          if (
            error instanceof Error &&
            error.message.includes("unique constraint")
          ) {
            return yield* Effect.fail(${className}ConflictError.create());
          }

          return yield* Effect.fail(
            ${className}InternalError.create(
              "Failed to create ${className}",
              error,
            ),
          );
        }
      }),

    update: (id: string, updates: ${className}UpdateInput) =>
      Effect.gen(function* () {
        try {
          // Check if entity exists first
          const existing = yield* database.query((db) =>
            db
              .selectFrom('${fileName}')
              .select('id')
              .where('id', '=', id)
              .executeTakeFirst()
          );

          if (!existing) {
            return yield* Effect.fail(${className}NotFoundError.create(id));
          }

          // TODO: Validate update payload
          // const validated = yield* validate${className}UpdateInput(updates);

          // ✅ KYSELY PATTERN: Update with returningAll() to get updated entity
          const result = yield* database.query((db) =>
            db
              .updateTable('${fileName}')
              .set({
                ...updates,
                updated_at: new Date(),
              })
              .where('id', '=', id)
              .returningAll()
              .executeTakeFirstOrThrow()
          );

          if (logger) {
            yield* logger.info("${className} updated", { id });
          }

          return result;
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              \`Failed to update ${className} with id '\${id}'\`,
              error,
            ),
          );
        }
      }),

    delete: (id: string) =>
      Effect.gen(function* () {
        try {
          // ✅ KYSELY PATTERN: Delete with executeTakeFirst() to check affected rows
          const result = yield* database.query((db) =>
            db
              .deleteFrom('${fileName}')
              .where('id', '=', id)
              .executeTakeFirst()
          );

          // Check if a row was actually deleted
          if (result.numDeletedRows === 0n) {
            return yield* Effect.fail(${className}NotFoundError.create(id));
          }

          if (logger) {
            yield* logger.info("${className} deleted", { id });
          }
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              \`Failed to delete ${className} with id '\${id}'\`,
              error,
            ),
          );
        }
      }),

    count: (filters?: Record<string, unknown>) =>
      Effect.gen(function* () {
        try {
          // ✅ KYSELY PATTERN: Count with type-safe aggregate function
          const result = yield* database.query((db) => {
            let queryBuilder = db
              .selectFrom('${fileName}')
              .select((eb) => eb.fn.countAll<number>().as('count'));

            // Apply filters from filters object
            // TODO: Customize filters based on your domain
            // Example filters (same as findAll):
            // if (filters?.status) {
            //   queryBuilder = queryBuilder.where('status', '=', filters.status);
            // }
            // if (filters?.userId) {
            //   queryBuilder = queryBuilder.where('user_id', '=', filters.userId);
            // }

            return queryBuilder.executeTakeFirstOrThrow();
          });

          return Number(result.count);
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              "Failed to count ${className}",
              error,
            ),
          );
        }
      }),

    exists: (id: string) =>
      Effect.gen(function* () {
        try {
          // ✅ KYSELY PATTERN: Check existence with COUNT
          const result = yield* database.query((db) =>
            db
              .selectFrom('${fileName}')
              .select((eb) => eb.fn.countAll<number>().as('count'))
              .where('id', '=', id)
              .executeTakeFirstOrThrow()
          );

          return Number(result.count) > 0;
        } catch (error) {
          return yield* Effect.fail(
            ${className}InternalError.create(
              \`Failed to check existence of ${className} with id '\${id}'\`,
              error,
            ),
          );
        }
      }),

    /**
     * Stream all entities with pagination
     *
     * ✅ STREAM PATTERN: Constant-memory processing of large datasets
     *
     * Uses Stream.paginateEffect for automatic pagination with backpressure.
     * Perfect for processing 1000+ entities without loading all into memory.
     *
     * @param options - Configuration options
     * @param options.batchSize - Number of items per page (default: 100)
     *
     * @returns Stream of entities
     *
     * @example
     * \`\`\`typescript
     * // Process all entities with constant memory
     * yield* repo.streamAll({ batchSize: 100 }).pipe(
     *   Stream.mapEffect((entity) => processEntity(entity)),
     *   Stream.runDrain
     * );
     *
     * // Count total items
     * const total = yield* repo.streamAll().pipe(Stream.runCount);
     *
     * // Export to file
     * yield* repo.streamAll().pipe(
     *   Stream.map((entity) => JSON.stringify(entity)),
     *   Stream.intersperse("\\n"),
     *   Stream.run(Sink.file("export.ndjson"))
     * );
     * \`\`\`
     */
    streamAll: (options?: { batchSize?: number }) =>
      Stream.paginateEffect(0, (page) =>
        Effect.gen(function* () {
          try {
            const batchSize = options?.batchSize ?? 100;

            // ✅ KYSELY PATTERN: Paginated query with LIMIT/OFFSET
            const results = yield* database.query((db) =>
              db
                .selectFrom('${fileName}')
                .selectAll()
                .limit(batchSize)
                .offset(page * batchSize)
                .execute()
            );

            // Stream.paginateEffect expects [data, Option<nextState>]
            // Return Some(nextPage) if we got a full batch (more data likely exists)
            // Return None if we got less than batchSize (reached the end)
            return [
              results,
              results.length === batchSize
                ? Option.some(page + 1)
                : Option.none()
            ] as const;
          } catch (error) {
            return yield* Effect.fail(
              ${className}InternalError.create(
                "Failed to stream ${className} entities",
                error,
              ),
            );
          }
        })
      ).pipe(
        // Flatten the arrays into individual items
        Stream.flatMap((batch) => Stream.fromIterable(batch))
      ),
  };
}
`);

  return builder.toString();
}
