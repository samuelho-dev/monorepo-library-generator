import { UserConflictError, UserInternalError, UserNotFoundError } from "./shared/errors";
import { Context, Effect, Layer, Option } from "effect";
import type { UserRepositoryError } from "./shared/errors";
import type { UserCreateInput, UserUpdateInput } from "./shared/types";

/**
 * User Repository Implementation
 *
 * Implements the UserRepository contract interface.
Fulfills the contract defined in `@custom-repo/contract-user`.

ARCHITECTURE PATTERN:
1. Import repository tag from contract library (NOT from ./interface.ts)
2. Create implementation that provides all methods
3. Wrap with Layer.effect() for dependency injection

TODO: Customize this file:
1. Import from actual contract library: `@custom-repo/contract-user`
2. Implement database access using Kysely queries
3. Add error handling and retry logic
4. Implement caching strategies if needed
5. Add performance optimizations (batching, indexing)
6. Implement transaction support for composite operations

@see @custom-repo/contract-user - Repository contract interface
@see https://effect.website/docs/guides/context-management for layer patterns
 *
 * @module @custom-repo/data-access-user/server
 */



// ============================================================================
// CRITICAL: Contract-First Architecture
// ============================================================================

// 

// ARCHITECTURE PATTERN: Repository interface is defined in contract library,

// NOT in data-access. This enforces separation of concerns:

// 

// 1. Contract Library (@custom-repo/contract-user)

//    ├── Defines repository interface (port)

//    ├── Defines domain errors

//    └── Defines entity types

// 

// 2. Data-Access Library (@custom-repo/data-access-user)

//    ├── Implements repository (adapter)

//    ├── Uses contract tag for Layer.effect

//    └── Provides operational code

// 

// If contract library is not yet configured:

// 1. Create: libs/contracts/user/src/index.ts

// 2. Define UserRepository tag with Context.Tag

// 3. Export error types and entity types

// 4. Uncomment imports below and remove fallback imports


// ============================================================================
// STEP 1: Import repository tag from CONTRACT library
// ============================================================================

// 

// CRITICAL: The repository interface MUST be defined in the contract library.

// This enforces Contract-First Architecture where:

// 1. Contract library defines the interface (port)

// 2. Data-access library implements the interface (adapter)

// 

// BEFORE YOU CAN USE THIS FILE:

// 1. Ensure contract library exists: libs/contract/user

// 2. Uncomment the import below

// 3. Remove the FALLBACK section

// 4. Verify contract exports UserRepository tag


// TODO: Uncomment when contract library is configured
// import { UserRepository } from "@custom-repo/contract-user";
// import type { UserRepositoryError } from "@custom-repo/contract-user";

// ============================================================================
// FALLBACK: Local types (remove when contract is configured)
// ============================================================================

// 

// WARNING: This fallback implementation violates Contract-First Architecture!

// It exists only to allow the generated code to compile initially.

// Replace with actual contract imports as soon as possible.



// TEMPORARY: Local Context.Tag definition
// TODO: Remove this and import from @custom-repo/contract-user instead
//
// NOTE: Interface aligns with contract port definition
// - findById returns Option to handle not found
// - findAll uses filters, pagination, sort pattern
// - create (not save) for consistency
// - exists method for boolean checks
export class UserRepository extends Context.Tag(
  "@custom-repo/data-access-user/UserRepository"
)<
  UserRepository,
  {
    readonly findById: (
      id: string
    ) => Effect.Effect<Option.Option<unknown>, UserRepositoryError>;
    readonly findAll: (
      filters?: Record<string, unknown>,
      pagination?: { limit: number; offset: number },
      sort?: { field: string; direction: "asc" | "desc" }
    ) => Effect.Effect<
      { items: readonly unknown[]; total: number; limit: number; offset: number; hasMore: boolean },
      UserRepositoryError
    >;
    readonly count: (
      filters?: Record<string, unknown>
    ) => Effect.Effect<number, UserRepositoryError>;
    readonly create: (
      input: UserCreateInput
    ) => Effect.Effect<unknown, UserRepositoryError>;
    readonly update: (
      id: string,
      input: UserUpdateInput
    ) => Effect.Effect<unknown, UserRepositoryError>;
    readonly delete: (
      id: string
    ) => Effect.Effect<void, UserRepositoryError>;
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, UserRepositoryError>;
  }
>() {

  /**
   * Live Layer - Production implementation
   *
   * Effect 3.0+ Pattern: Static members on Context.Tag
   * Access via: UserRepository.Live
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Import and yield actual dependencies
      // Import from @custom-repo/provider-kysely/server:
      // import { KyselyService } from "@custom-repo/provider-kysely/server";
      // const database = yield* KyselyService;

      // Optional: Import LoggingService for query logging
      // import { LoggingService } from "@custom-repo/infra-logging/server";
      // const logger = yield* LoggingService;

      // For now, create repository with placeholder database
      // TODO: Replace with actual KyselyService once provider-kysely is configured
      const placeholderDb: DatabaseService = {
        query: <T>(_fn: (db: KyselyDatabase) => Promise<T>): Effect.Effect<T, never, never> =>
          Effect.dieMessage(
            "Database not configured. Import and provide KyselyService from @custom-repo/provider-kysely"
          ),
      };
      return createUserRepository(placeholderDb, undefined);
    })
  );

  /**
   * Test Layer - In-memory implementation
   *
   * Access via: UserRepository.Test
   */
  static readonly Test = Layer.succeed(
    this,
    (() => {
      const store = new Map<string, unknown>();
      let idCounter = 0;

      return {
        findById: (id: string) =>
          Effect.succeed(
            store.has(id) ? Option.some(store.get(id)) : Option.none(),
          ),
        findAll: (
          _filters?: Record<string, unknown>,
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
        create: (entity: UserCreateInput) =>
          Effect.succeed(
            (() => {
              const id = String(++idCounter);
              const now = new Date();
              const saved = { ...entity, id, createdAt: now, updatedAt: now };
              store.set(id, saved);
              return saved;
            })(),
          ),
        update: (id: string, updates: UserUpdateInput) =>
          Effect.gen(function* () {
            if (!store.has(id)) {
              return yield* Effect.fail(UserNotFoundError.create(id));
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
      };
    })(),
  );

  /**
   * Dev Layer - Development implementation with logging
   *
   * Access via: UserRepository.Dev
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Import and yield actual dependencies
      // Same as Live layer but with console logging wrapper
      const placeholderDb: DatabaseService = {
        query: <T>(_fn: (db: KyselyDatabase) => Promise<T>): Effect.Effect<T, never, never> =>
          Effect.dieMessage(
            "Database not configured. Import and provide KyselyService from @custom-repo/provider-kysely"
          ),
      };
      const repo = createUserRepository(placeholderDb, undefined);

      // Wrap with logging
      return {
        findById: (id: string) =>
          Effect.gen(function* () {
            console.log("[UserRepository] findById", { id });
            const result = yield* repo.findById(id);
            console.log("[UserRepository] findById result:", Option.isSome(result) ? "found" : "not found");
            return result;
          }),
        findAll: (filters, pagination, sort) =>
          Effect.gen(function* () {
            console.log("[UserRepository] findAll", { filters, pagination, sort });
            const result = yield* repo.findAll(filters, pagination, sort);
            console.log("[UserRepository] findAll result count:", result.items.length);
            return result;
          }),
        count: (filters) =>
          Effect.gen(function* () {
            console.log("[UserRepository] count", { filters });
            const result = yield* repo.count(filters);
            console.log("[UserRepository] count result:", result);
            return result;
          }),
        create: (input) =>
          Effect.gen(function* () {
            console.log("[UserRepository] create", { input });
            const result = yield* repo.create(input);
            console.log("[UserRepository] create result:", result);
            return result;
          }),
        update: (id, input) =>
          Effect.gen(function* () {
            console.log("[UserRepository] update", { id, input });
            const result = yield* repo.update(id, input);
            console.log("[UserRepository] update result:", result);
            return result;
          }),
        delete: (id) =>
          Effect.gen(function* () {
            console.log("[UserRepository] delete", { id });
            yield* repo.delete(id);
            console.log("[UserRepository] delete success");
          }),
        exists: (id) =>
          Effect.gen(function* () {
            console.log("[UserRepository] exists", { id });
            const result = yield* repo.exists(id);
            console.log("[UserRepository] exists result:", result);
            return result;
          }),
      };
    }),
  );

  /**
   * Auto Layer - Environment-based selection
   *
   * Access via: UserRepository.Auto
   */
  static readonly Auto = (() => {
    const env = process.env["NODE_ENV"] || "production";

    switch (env) {
      case "test":
        return UserRepository.Test;
      case "development":
        return UserRepository.Dev;
      default:
        return UserRepository.Live;
    }
  })();
}

// ============================================================================
// Repository Implementation
// ============================================================================


// TODO: Import actual types when dependencies are configured:
// import type { KyselyService } from "@custom-repo/provider-kysely/server";
// import type { LoggingService } from "@custom-repo/infra-logging/server";

/**
 * Kysely database query builder interface
 * Replace with actual Kysely.Selectable<DB['user']> from your schema
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
 * Create User Repository with Kysely Integration
 *
 * This factory creates a repository implementation using Kysely for type-safe queries.
 * Kysely is accessed through DatabaseService from @custom-repo/provider-kysely.
 *
 * @param database - KyselyService from provider-kysely
 * @param logger - Optional LoggingService for query logging
 * @returns Repository implementation with Kysely queries
 */
function createUserRepository(
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
              .selectFrom('user')
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
              .selectFrom('user')
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
            yield* logger.debug("User findAll", {
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
            UserInternalError.create(
              "Failed to find all User",
              error,
            ),
          );
        }
      }),

    findById: (id: string) =>
      Effect.gen(function* () {
        try {
          // ✅ KYSELY PATTERN: Query single row with executeTakeFirst()
          const result = yield* database.query((db) =>
            db
              .selectFrom('user')
              .selectAll()
              .where('id', '=', id)
              .executeTakeFirst()
          );

          // Return Option to handle not found case
          return result ? Option.some(result) : Option.none();
        } catch (error) {
          return yield* Effect.fail(
            UserInternalError.create(
              `Failed to find User with id '${id}'`,
              error,
            ),
          );
        }
      }),

    create: (input: UserCreateInput) =>
      Effect.gen(function* () {
        try {
          // TODO: Validate input before creating
          // const validated = yield* validateUserCreateInput(input);

          // ✅ KYSELY PATTERN: Insert with returningAll() to get created entity
          const result = yield* database.query((db) =>
            db
              .insertInto('user')
              .values({
                ...input,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .returningAll()
              .executeTakeFirstOrThrow()
          );

          if (logger) {
            yield* logger.info("User created", { id: result.id });
          }

          return result;
        } catch (error) {
          // Handle unique constraint violations
          if (
            error instanceof Error &&
            error.message.includes("unique constraint")
          ) {
            return yield* Effect.fail(UserConflictError.create());
          }

          return yield* Effect.fail(
            UserInternalError.create(
              "Failed to create User",
              error,
            ),
          );
        }
      }),

    update: (id: string, updates: UserUpdateInput) =>
      Effect.gen(function* () {
        try {
          // Check if entity exists first
          const existing = yield* database.query((db) =>
            db
              .selectFrom('user')
              .select('id')
              .where('id', '=', id)
              .executeTakeFirst()
          );

          if (!existing) {
            return yield* Effect.fail(UserNotFoundError.create(id));
          }

          // TODO: Validate update payload
          // const validated = yield* validateUserUpdateInput(updates);

          // ✅ KYSELY PATTERN: Update with returningAll() to get updated entity
          const result = yield* database.query((db) =>
            db
              .updateTable('user')
              .set({
                ...updates,
                updated_at: new Date(),
              })
              .where('id', '=', id)
              .returningAll()
              .executeTakeFirstOrThrow()
          );

          if (logger) {
            yield* logger.info("User updated", { id });
          }

          return result;
        } catch (error) {
          return yield* Effect.fail(
            UserInternalError.create(
              `Failed to update User with id '${id}'`,
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
              .deleteFrom('user')
              .where('id', '=', id)
              .executeTakeFirst()
          );

          // Check if a row was actually deleted
          if (result.numDeletedRows === 0n) {
            return yield* Effect.fail(UserNotFoundError.create(id));
          }

          if (logger) {
            yield* logger.info("User deleted", { id });
          }
        } catch (error) {
          return yield* Effect.fail(
            UserInternalError.create(
              `Failed to delete User with id '${id}'`,
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
              .selectFrom('user')
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
            UserInternalError.create(
              "Failed to count User",
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
              .selectFrom('user')
              .select((eb) => eb.fn.countAll<number>().as('count'))
              .where('id', '=', id)
              .executeTakeFirstOrThrow()
          );

          return Number(result.count) > 0;
        } catch (error) {
          return yield* Effect.fail(
            UserInternalError.create(
              `Failed to check existence of User with id '${id}'`,
              error,
            ),
          );
        }
      }),
  };
}
