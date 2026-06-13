/**
 * Database Contract Errors
 *
 * Shared error types for all data-access layers.
 * Import from @samuelho-dev/contract-database instead of
 * duplicating database error types in each domain contract.
 *
 * @module @samuelho-dev/contract-database/errors
 */
import { Schema } from 'effect'

/**
 * Shared database error for all data-access layers.
 *
 * Replaces domain-specific variants (SellerDatabaseRepositoryError,
 * AnalyticsDataAccessError, etc.) with a single shared error type.
 *
 * Uses Schema.TaggedError for serialization across process boundaries
 * (IPC, HTTP, RabbitMQ).
 *
 * @example
 * ```typescript
 * new DatabaseError({
 *   message: 'Failed to find seller by ID',
 *   operation: 'findById',
 *   entity: 'seller',
 *   identifiers: { sellerId: '123' },
 *   cause: error
 * })
 * ```
 */
export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()('DatabaseError', {
  message: Schema.String,
  operation: Schema.String,
  entity: Schema.String,
  identifiers: Schema.Record(Schema.String, Schema.String),
  cause: Schema.optional(Schema.Defect)
}) {
  isUniqueViolation(constraint: string): boolean {
    const cause = this.cause
    return (
      cause !== null &&
      typeof cause === 'object' &&
      'pgConstraint' in cause &&
      (cause as { pgConstraint?: string }).pgConstraint === constraint
    )
  }
}
