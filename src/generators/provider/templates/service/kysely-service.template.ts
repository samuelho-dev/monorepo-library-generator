/**
 * Kysely Provider Service Template
 *
 * Specialized template for the Kysely database query builder provider.
 * Generates a type-safe wrapper around Kysely that integrates with Effect.
 *
 * Types come from prisma-effect-kysely which generates:
 * - Database types for Kysely
 * - Effect Schema types for validation
 *
 * @module monorepo-library-generator/provider/service/kysely-service-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../../utils/types';

/**
 * Generate Kysely provider service file
 *
 * Creates a Kysely wrapper with:
 * - Query execution with Effect error handling
 * - Transaction support
 * - Test layer using Kysely's built-in DummyDriver
 * - Live layer factory for Kysely SDK
 */
export function generateKyselyProviderServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, packageName } = options;

  builder.addFileHeader({
    title: `${className} Provider Service`,
    description: `Kysely query builder provider with Effect integration.

Uses types from prisma-effect-kysely for type-safe database access.
The Database type should be imported from your Prisma-generated types.

Architecture:
  prisma-effect-kysely → generates DB types
  provider-kysely → wraps Kysely SDK (this library)
  infra-database → uses this provider, exposes DatabaseService`,
    module: `${packageName}/service`,
    see: ['https://kysely.dev for Kysely documentation'],
  });
  builder.addBlankLine();

  // Imports - use "KyselyDB" alias to avoid conflict with our Context.Tag class
  builder.addImports([{ from: '../errors', imports: [`${className}Error`] }]);
  builder.addImports([{ from: 'effect', imports: ['Context', 'Effect', 'Layer'] }]);
  builder.addRaw(`import {
  Kysely as KyselyDB,
  DummyDriver,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from "kysely"
`);
  builder.addBlankLine();

  // Database type placeholder
  builder.addSectionComment('Database Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Database schema type
 *
 * Import your actual Database type from prisma-effect-kysely generated types:
 *
 * @example
 * \`\`\`typescript
 * import type { DB } from "@myorg/prisma-types";
 * export type Database = DB;
 * \`\`\`
 *
 * For now, using a placeholder that accepts any table structure.
 */
export interface Database {
  [tableName: string]: Record<string, unknown>
}`);
  builder.addBlankLine();

  // Service interface
  builder.addSectionComment('Service Interface');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Service Interface
 *
 * Provides type-safe database query execution using Kysely.
 * Wraps Kysely operations in Effect for proper error handling.
 */
export interface ${className}ServiceInterface {
  /**
   * Execute a database query
   *
   * @param fn - Function that receives Kysely instance and returns a Promise
   * @returns Effect that succeeds with query result or fails with ${className}Error
   *
   * @example
   * \`\`\`typescript
   * const users = yield* kysely.query((db) =>
   *   db.selectFrom("users").selectAll().execute()
   * );
   * \`\`\`
   */
  readonly query: <A>(
    fn: (db: KyselyDB<Database>) => Promise<A>
  ) => Effect.Effect<A, ${className}Error>

  /**
   * Execute queries within a transaction
   *
   * @param fn - Function that receives Kysely transaction and returns Effect
   * @returns Effect that succeeds with transaction result
   *
   * @example
   * \`\`\`typescript
   * yield* kysely.transaction((trx) =>
   *   Effect.gen(function* () {
   *     const user = yield* kysely.query((db) =>
   *       trx.insertInto("users").values({ name: "John" }).returningAll().executeTakeFirstOrThrow()
   *     );
   *     yield* kysely.query((db) =>
   *       trx.insertInto("audit").values({ userId: user.id, action: "created" }).execute()
   *     );
   *     return user;
   *   })
   * );
   * \`\`\`
   */
  readonly transaction: <A, E, R>(
    fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | ${className}Error, R>

  /**
   * Get raw Kysely instance for advanced operations
   *
   * Prefer query() and transaction() for most use cases.
   * Use this only when you need direct Kysely access.
   */
  readonly getInstance: () => Effect.Effect<KyselyDB<Database>, ${className}Error>

  /**
   * Health check - verifies database connectivity
   */
  readonly healthCheck: () => Effect.Effect<boolean, ${className}Error>
}`);
  builder.addBlankLine();

  // Context.Tag
  builder.addSectionComment('Context.Tag');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Create a "cold" Kysely instance using DummyDriver
 *
 * This is Kysely's built-in approach for testing - creates a real Kysely
 * instance that compiles queries but returns empty results without
 * connecting to a database.
 *
 * @see https://kysely.dev/docs/recipes/splitting-query-building-and-execution
 */
function createDummyKysely(): KyselyDB<Database> {
  return new KyselyDB<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler()
    }
  })
}

/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}
 *
 * Static layers:
 * - ${className}.makeLive(kyselyInstance) - Production with real Kysely instance
 * - ${className}.Test - Test layer using Kysely's DummyDriver
 * - ${className}.Dev - Development with query logging
 */
export class ${className} extends Context.Tag("${className}")<
  ${className},
  ${className}ServiceInterface
>() {
  /**
   * Create Live layer with a Kysely instance
   *
   * @param kyselyInstance - Configured Kysely instance
   * @returns Layer providing ${className}ServiceInterface
   *
   * @example
   * \`\`\`typescript
   * import { Kysely, PostgresDialect } from "kysely";
   * import { Pool } from "pg";
   * import type { DB } from "@myorg/prisma-types";
   *
   * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   * const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
   *
   * const ${className}Live = ${className}.makeLive(db);
   * \`\`\`
   */
  static makeLive(kyselyInstance: KyselyDB<Database>) {
    return Layer.succeed(${className}, {
      query: <A>(fn: (db: KyselyDB<Database>) => Promise<A>) =>
        Effect.tryPromise({
          try: () => fn(kyselyInstance),
          catch: (error) => new ${className}Error({
            message: "Query execution failed",
            cause: error
          })
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        fn(kyselyInstance).pipe(
          Effect.mapError((error) => {
            if (error instanceof ${className}Error) return error
            return new ${className}Error({
              message: "Transaction failed",
              cause: error
            })
          })
        ),

      getInstance: () => Effect.succeed(kyselyInstance),

      healthCheck: () =>
        Effect.tryPromise({
          try: async () => {
            await kyselyInstance.selectFrom("_prisma_migrations").selectAll().limit(1).execute()
            return true
          },
          catch: (error) => new ${className}Error({
            message: "Database health check failed",
            cause: error
          })
        })
    })
  }

  /**
   * Test layer using Kysely's built-in DummyDriver
   *
   * Creates a "cold" Kysely instance that compiles queries correctly
   * but returns empty results without connecting to a database.
   * This is Kysely's recommended approach for testing query building logic.
   *
   * @see https://kysely.dev/docs/recipes/splitting-query-building-and-execution
   *
   * For integration tests with data, use makeLive() with a test database
   * or an in-memory database like SQLite/pglite.
   */
  static readonly Test = Layer.sync(${className}, () => {
    const db = createDummyKysely()

    return {
      query: <A>(fn: (kyselyDb: KyselyDB<Database>) => Promise<A>) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => new ${className}Error({
            message: "Query execution failed",
            cause: error
          })
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        fn(db).pipe(
          Effect.mapError((error) => {
            if (error instanceof ${className}Error) return error
            return new ${className}Error({
              message: "Transaction failed",
              cause: error
            })
          })
        ),

      getInstance: () => Effect.succeed(db),

      healthCheck: () => Effect.succeed(true)
    }
  })

  /**
   * Dev layer - Development with query logging
   *
   * Uses DummyDriver for local development without database connection.
   * Logs all query operations for debugging.
   */
  static readonly Dev = Layer.sync(${className}, () => {
    const db = createDummyKysely()

    return {
      query: <A>(fn: (kyselyDb: KyselyDB<Database>) => Promise<A>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug("[${className}] [DEV] Executing query")
          const result = yield* Effect.tryPromise({
            try: () => fn(db),
            catch: (error) => new ${className}Error({
              message: "Query execution failed",
              cause: error
            })
          })
          yield* Effect.logDebug("[${className}] [DEV] Query completed")
          return result
        }),

      transaction: <A, E, R>(fn: (trx: KyselyDB<Database>) => Effect.Effect<A, E, R>) =>
        Effect.gen(function* () {
          yield* Effect.logDebug("[${className}] [DEV] Starting transaction")
          const result = yield* fn(db).pipe(
            Effect.mapError((error) => {
              if (error instanceof ${className}Error) return error
              return new ${className}Error({
                message: "Transaction failed",
                cause: error
              })
            })
          )
          yield* Effect.logDebug("[${className}] [DEV] Transaction completed")
          return result
        }),

      getInstance: () => Effect.succeed(db),

      healthCheck: () => Effect.succeed(true)
    }
  })

  /**
   * Live layer placeholder
   *
   * In production, use makeLive() with a configured Kysely instance.
   * This placeholder fails with a helpful message.
   */
  static readonly Live = Layer.fail(
    new ${className}Error({
      message: "${className} Live layer not configured. Use ${className}.makeLive(kyselyInstance) instead."
    })
  )
}`);

  return builder.toString();
}
