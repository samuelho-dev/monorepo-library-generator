/**
 * Canonical Pagination Types
 *
 * Single source of truth for pagination across contracts, RPC inputs,
 * data-access ports, and feature handlers. Offset-based: limit + offset
 * map directly onto Kysely's native pagination clauses, and clients
 * compute page indices at the UI boundary.
 *
 * @module @samuelho-dev/contract-database/pagination
 */

import { Schema } from 'effect'

/** Pagination parameters (offset-based). Schema is source of truth; TS type is derived. */
export const PaginationParams = Schema.Struct({
  limit: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThan(0)),
    Schema.check(Schema.isLessThanOrEqualTo(100))
  ),
  offset: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThanOrEqualTo(0))
  )
})

export type PaginationParams = typeof PaginationParams.Type

/** Paginated result with generic item type. */
export interface PaginatedResult<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly hasMore: boolean
}

/** Schema factory for paginated RPC outputs. */
export const PaginatedResponse = <T extends Schema.Top>(itemSchema: T) =>
  Schema.Struct({
    items: Schema.Array(itemSchema),
    total: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isGreaterThanOrEqualTo(0))
    ),
    hasMore: Schema.Boolean
  })
