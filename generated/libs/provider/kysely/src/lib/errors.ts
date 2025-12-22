import { Schema } from "effect";

/**
 * Kysely Provider Errors
 *
 * Error types for Kysely database provider using Schema.TaggedError.
 *
 * @module @myorg/provider-kysely/errors
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base Kysely error
 *
 * All Kysely-specific errors extend this type.
 */
export class KyselyError extends Schema.TaggedError<KyselyError>()("KyselyError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

/**
 * Connection error - failure to connect to database
 */
export class KyselyConnectionError extends Schema.TaggedError<KyselyConnectionError>()(
  "KyselyConnectionError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Query error - query execution failed
 */
export class KyselyQueryError extends Schema.TaggedError<KyselyQueryError>()("KyselyQueryError", {
  message: Schema.String,
  query: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown),
}) {}

/**
 * Transaction error - transaction failed
 */
export class KyselyTransactionError extends Schema.TaggedError<KyselyTransactionError>()(
  "KyselyTransactionError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

/**
 * Constraint error - database constraint violation
 */
export class KyselyConstraintError extends Schema.TaggedError<KyselyConstraintError>()(
  "KyselyConstraintError",
  {
    message: Schema.String,
    constraint: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all Kysely error types
 */
export type KyselyProviderError =
  | KyselyError
  | KyselyConnectionError
  | KyselyQueryError
  | KyselyTransactionError
  | KyselyConstraintError;
