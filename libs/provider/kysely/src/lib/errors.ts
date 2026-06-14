import { Schema } from 'effect'

/**
 * Database Provider Errors
 *
 * Error types for Kysely database provider using Schema.TaggedError.
 *
 * @module @samuelho-dev/provider-kysely/errors
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Connection error - failure to connect to database
 *
 * Named `KyselyConnectionError` (not `DatabaseConnectionError`) so the provider's
 * connection-failure tag does not collide with `infra-database`'s public
 * `DatabaseConnectionError`. `Effect.catchTag('DatabaseConnectionError')` against
 * a kysely effect would otherwise match whichever class happened to be imported
 * first at the call site. See `infra-database/service.ts` which catches the tag
 * below and remaps to its own `DatabaseConnectionError`.
 */
export class KyselyConnectionError extends Schema.TaggedErrorClass<KyselyConnectionError>()(
  'KyselyConnectionError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
    host: Schema.optional(Schema.String),
    port: Schema.optional(Schema.Number),
    database: Schema.optional(Schema.String)
  }
) {}

/**
 * Query error — query execution failed. `pgCode` and `pgConstraint` are
 * promoted from the underlying pg driver error at construction time.
 */
export class DatabaseQueryError extends Schema.TaggedErrorClass<DatabaseQueryError>()(
  'DatabaseQueryError',
  {
    operation: Schema.String,
    message: Schema.String,
    query: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect),
    /** Postgres SQLSTATE code surfaced by the `pg` driver on constraint/data errors. */
    pgCode: Schema.optional(Schema.String),
    /** Name of the pg constraint that fired, when the error was a constraint violation. */
    pgConstraint: Schema.optional(Schema.String)
  }
) {}

/**
 * Postgres SQLSTATE code for unique-constraint violation.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_UNIQUE_VIOLATION_CODE = '23505'

/**
 * Transaction error - transaction failed
 */
export class DatabaseTransactionError extends Schema.TaggedErrorClass<DatabaseTransactionError>()(
  'DatabaseTransactionError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all database error types
 */
export type DatabaseError = KyselyConnectionError | DatabaseQueryError | DatabaseTransactionError
