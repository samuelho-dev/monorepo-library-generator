import { Data } from "effect"

/**
 * Database Provider Errors
 *
 * Error types for Kysely database provider using Data.TaggedError.

Uses Data.TaggedError for internal provider errors (not serializable).
Schema.TaggedError is reserved for RPC boundary errors only.
 *
 * @module @samuelho-dev/provider-kysely/errors
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Connection error - failure to connect to database
 */
export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  readonly message: string
  readonly cause?: unknown
  readonly host?: string
  readonly port?: number
  readonly database?: string
}> {}

/**
 * Query error - query execution failed
 */
export class DatabaseQueryError extends Data.TaggedError(
  "DatabaseQueryError"
)<{
  readonly operation: string
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

/**
 * Transaction error - transaction failed
 */
export class DatabaseTransactionError extends Data.TaggedError(
  "DatabaseTransactionError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all database error types
 */
export type DatabaseError =
  | DatabaseConnectionError
  | DatabaseQueryError
  | DatabaseTransactionError
