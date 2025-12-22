/**
 * Database Service Template
 *
 * Generates the database infrastructure service that delegates to the Kysely provider.
 * The Kysely provider handles the actual SDK integration.
 *
 * Architecture:
 *   prisma-effect-kysely → generates DB types
 *   @scope/provider-kysely → wraps Kysely SDK
 *   @scope/infra-database → this service (delegates to provider)
 *   @scope/data-access-* → uses DatabaseService
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate database service file that delegates to Kysely provider
 */
export function generateDatabaseServiceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Service`,
    description: `Database infrastructure service that delegates to the Kysely provider.

This service wraps the Kysely provider to expose a simplified database API.
Types come from prisma-effect-kysely; the Kysely provider handles SDK integration.

Architecture:
  prisma-effect-kysely → generates DB types
  ${scope}/provider-kysely → wraps Kysely SDK (Kysely Context.Tag)
  ${scope}/infra-database → this service (DatabaseService)

Usage:
  const database = yield* DatabaseService;
  const users = yield* database.query((db) =>
    db.selectFrom("users").selectAll().execute()
  );`,
    module: `${scope}/infra-${fileName}/service`,
    see: ['EFFECT_PATTERNS.md for database patterns'],
  });

  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Layer'] },
    { from: `${scope}/provider-kysely`, imports: ['Kysely'] },
    {
      from: './errors',
      imports: [`${className}InternalError`, `${className}ConnectionError`],
    },
    { from: './errors', imports: [`${className}Error`], isTypeOnly: true },
  ]);

  builder.addSectionComment('Re-export Database Types from Provider');

  builder.addRaw(`/**
 * Re-export Database type from provider for convenience
 *
 * In production, extend this with your prisma-effect-kysely types:
 *
 * @example
 * \`\`\`typescript
 * import type { DB } from "@myorg/prisma-types";
 *
 * declare module "${scope}/infra-database" {
 *   interface Database extends DB {}
 * }
 * \`\`\`
 */
export type { Database } from "${scope}/provider-kysely"
`);

  builder.addSectionComment('Service Context.Tag Definition');

  builder.addRaw(`/**
 * ${className} Service
 *
 * Database infrastructure that delegates to the Kysely provider.
 * Provides a simplified API for data-access libraries.
 *
 * @example
 * \`\`\`typescript
 * import { ${className}Service } from "${scope}/infra-database";
 *
 * const program = Effect.gen(function* () {
 *   const database = yield* ${className}Service;
 *
 *   // Simple query
 *   const users = yield* database.query((db) =>
 *     db.selectFrom("users").selectAll().execute()
 *   );
 *
 *   // Query with filtering
 *   const activeUsers = yield* database.query((db) =>
 *     db.selectFrom("users")
 *       .selectAll()
 *       .where("status", "=", "active")
 *       .execute()
 *   );
 *
 *   // Transaction
 *   yield* database.transaction((db) =>
 *     Effect.gen(function* () {
 *       const user = yield* database.query(() =>
 *         db.insertInto("users")
 *           .values({ name: "John" })
 *           .returningAll()
 *           .executeTakeFirstOrThrow()
 *       );
 *       yield* database.query(() =>
 *         db.insertInto("audit_logs")
 *           .values({ userId: user.id, action: "created" })
 *           .execute()
 *       );
 *       return user;
 *     })
 *   );
 * });
 *
 * // Provide layers
 * const runnable = program.pipe(
 *   Effect.provide(${className}Service.Live),
 *   Effect.provide(Kysely.makeLive(kyselyInstance))
 * );
 * \`\`\`
 */
export class ${className}Service extends Context.Tag(
  "${scope}/infra-${fileName}/${className}Service"
)<
  ${className}Service,
  {
    /**
     * Execute a database query
     *
     * Delegates to the Kysely provider's query method.
     *
     * @param fn - Query builder function that receives the Kysely instance
     * @returns Effect that succeeds with the query result
     */
    readonly query: <A>(
      fn: (db: import("kysely").Kysely<import("${scope}/provider-kysely").Database>) => Promise<A>
    ) => Effect.Effect<A, ${className}Error>

    /**
     * Execute multiple queries in a transaction
     *
     * All queries within the transaction share the same connection.
     * If any query fails, the entire transaction is rolled back.
     *
     * @param fn - Effect that performs database operations within transaction scope
     * @returns Effect that succeeds with the transaction result
     */
    readonly transaction: <A, E, R>(
      fn: (db: import("kysely").Kysely<import("${scope}/provider-kysely").Database>) => Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E | ${className}Error, R>

    /**
     * Health check for database connection
     *
     * @returns Effect that succeeds with true if database is healthy
     */
    readonly healthCheck: () => Effect.Effect<boolean, ${className}Error>
  }
>() {
  // ===========================================================================
  // Static Live Layer - Delegates to Kysely Provider
  // ===========================================================================

  /**
   * Live Layer - Delegates to the Kysely provider
   *
   * Requires Kysely layer to be provided.
   *
   * @example
   * \`\`\`typescript
   * import { Kysely, PostgresDialect } from "kysely";
   * import { Pool } from "pg";
   * import { Kysely as KyselyProvider } from "${scope}/provider-kysely";
   *
   * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   * const kyselyInstance = new Kysely({ dialect: new PostgresDialect({ pool }) });
   *
   * const program = myProgram.pipe(
   *   Effect.provide(${className}Service.Live),
   *   Effect.provide(KyselyProvider.makeLive(kyselyInstance))
   * );
   * \`\`\`
   */
  static readonly Live = Layer.effect(
    ${className}Service,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          kysely.query(fn).pipe(
            Effect.mapError((error) =>
              new ${className}InternalError({
                message: error.message,
                cause: error
              })
            ),
            Effect.withSpan("${className}Service.query")
          ),

        transaction: (fn) =>
          kysely.transaction(fn).pipe(
            Effect.mapError((error) =>
              new ${className}InternalError({
                message: "Transaction failed",
                cause: error
              })
            ),
            Effect.withSpan("${className}Service.transaction")
          ),

        healthCheck: () =>
          kysely.healthCheck().pipe(
            Effect.mapError((error) =>
              new ${className}ConnectionError({
                message: "Health check failed",
                endpoint: "database",
                cause: error
              })
            ),
            Effect.withSpan("${className}Service.healthCheck")
          )
      }
    })
  )

  // ===========================================================================
  // Static Test Layer - Delegates to Kysely Provider Test Layer
  // ===========================================================================

  /**
   * Test Layer - Uses the Kysely provider's Test layer
   *
   * Provides an in-memory mock database for testing.
   * No external database connection required.
   */
  static readonly Test = Layer.effect(
    ${className}Service,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          kysely.query(fn).pipe(
            Effect.mapError((error) =>
              new ${className}InternalError({
                message: error.message,
                cause: error
              })
            )
          ),

        transaction: (fn) =>
          kysely.transaction(fn).pipe(
            Effect.mapError((error) =>
              new ${className}InternalError({
                message: "Transaction failed",
                cause: error
              })
            )
          ),

        healthCheck: () =>
          kysely.healthCheck().pipe(
            Effect.mapError((error) =>
              new ${className}ConnectionError({
                message: "Health check failed",
                endpoint: "database",
                cause: error
              })
            )
          )
      }
    })
  ).pipe(Layer.provide(Kysely.Test))

  // ===========================================================================
  // Static Dev Layer - Uses Kysely Provider with Logging
  // ===========================================================================

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Uses the Kysely provider's Test layer with debug logging enabled.
   */
  static readonly Dev = Layer.effect(
    ${className}Service,
    Effect.gen(function* () {
      const kysely = yield* Kysely

      return {
        query: (fn) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Service] [DEV] Executing query")
            const result = yield* kysely.query(fn).pipe(
              Effect.mapError((error) =>
                new ${className}InternalError({
                  message: error.message,
                  cause: error
                })
              )
            )
            yield* Effect.logDebug("[${className}Service] [DEV] Query completed")
            return result
          }),

        transaction: (fn) =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Service] [DEV] Starting transaction")
            const result = yield* kysely.transaction(fn).pipe(
              Effect.mapError((error) =>
                new ${className}InternalError({
                  message: "Transaction failed",
                  cause: error
                })
              )
            )
            yield* Effect.logDebug("[${className}Service] [DEV] Transaction completed")
            return result
          }),

        healthCheck: () =>
          Effect.gen(function* () {
            yield* Effect.logDebug("[${className}Service] [DEV] Health check")
            return yield* kysely.healthCheck().pipe(
              Effect.mapError((error) =>
                new ${className}ConnectionError({
                  message: "Health check failed",
                  endpoint: "database",
                  cause: error
                })
              )
            )
          })
      }
    })
  ).pipe(Layer.provide(Kysely.Dev))
}
`);

  return builder.toString();
}
