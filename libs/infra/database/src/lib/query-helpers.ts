/**
 * Query Helpers
 *
 * Reusable helpers for filtering, sorting, and pagination.
 * Used by data-access layers to reduce cognitive complexity.
 *
 * @module @samuelho-dev/infra-database/query-helpers
 */

import type { PaginatedResult, PaginationParams } from '@samuelho-dev/contract-database'

// ============================================================================
// Types
// ============================================================================

/**
 * Standard date range filters used across entities
 */
export interface DateRangeFilters {
  readonly createdAfter?: Date
  readonly createdBefore?: Date
  readonly updatedAfter?: Date
  readonly updatedBefore?: Date
}

/**
 * Standard sort options
 */
export interface SortOptions {
  readonly field: string
  readonly direction: 'asc' | 'desc'
}

/**
 * Entity with standard timestamps
 */
export interface TimestampedEntity {
  readonly created_at: Date
  readonly updated_at: Date
}

// ============================================================================
// In-Memory Helpers (for Test layers)
// ============================================================================

/**
 * Applies date range filters to an array of entities
 */
export function applyDateRangeFilters<T extends TimestampedEntity>(
  items: readonly T[],
  filters?: DateRangeFilters
) {
  if (!filters) return items

  let result = [...items]
  const { createdAfter, createdBefore, updatedAfter, updatedBefore } = filters

  if (createdAfter) result = result.filter((item) => item.created_at >= createdAfter)
  if (createdBefore) result = result.filter((item) => item.created_at <= createdBefore)
  if (updatedAfter) result = result.filter((item) => item.updated_at >= updatedAfter)
  if (updatedBefore) result = result.filter((item) => item.updated_at <= updatedBefore)

  return result
}

/**
 * Applies timestamp-based sorting to an array
 */
export function applyTimestampSort<T extends TimestampedEntity>(
  items: readonly T[],
  sort?: SortOptions
) {
  if (!sort) return items

  const sorted = [...items]
  const multiplier = sort.direction === 'asc' ? 1 : -1

  if (sort.field === 'created_at') {
    sorted.sort((a, b) => multiplier * (a.created_at.getTime() - b.created_at.getTime()))
  } else if (sort.field === 'updated_at') {
    sorted.sort((a, b) => multiplier * (a.updated_at.getTime() - b.updated_at.getTime()))
  }

  return sorted
}

/**
 * Applies offset pagination to an array
 */
export function applyOffsetPagination<T>(items: readonly T[], pagination?: PaginationParams) {
  if (!pagination) return items
  return items.slice(pagination.offset, pagination.offset + pagination.limit)
}

/**
 * Creates a paginated result from filtered items and total count
 */
export function createPaginatedResult<T>(
  items: readonly T[],
  total: number,
  pagination?: PaginationParams
) {
  const hasMore = pagination ? pagination.offset + pagination.limit < total : false
  const result: PaginatedResult<T> = { items, total, hasMore }
  return result
}

/**
 * Convenience function to apply filters, sort, pagination and create result
 */
export function paginateInMemory<T extends TimestampedEntity>(
  items: readonly T[],
  options?: {
    dateFilters?: DateRangeFilters
    sort?: SortOptions
    pagination?: PaginationParams
  }
) {
  const filtered = applyDateRangeFilters(items, options?.dateFilters)
  const sorted = applyTimestampSort(filtered, options?.sort)
  const total = sorted.length
  const paginated = applyOffsetPagination(sorted, options?.pagination)
  return createPaginatedResult(paginated, total, options?.pagination)
}

// ============================================================================
// Kysely Query Builder Helpers (for Live/Dev layers)
// ============================================================================

/**
 * Builder for date range WHERE clauses
 *
 * Returns an array of [column, operator, value] tuples that can be applied
 * to any Kysely query builder.
 *
 * Usage:
 * ```typescript
 * const conditions = buildDateRangeConditions(filters)
 * for (const [col, op, val] of conditions) {
 *   query = query.where(col, op, val)
 * }
 * ```
 */
export function buildDateRangeConditions(filters?: DateRangeFilters) {
  const conditions: ['created_at' | 'updated_at', '>=' | '<=', Date][] = []
  if (!filters) return conditions

  if (filters.createdAfter) conditions.push(['created_at', '>=', filters.createdAfter])
  if (filters.createdBefore) conditions.push(['created_at', '<=', filters.createdBefore])
  if (filters.updatedAfter) conditions.push(['updated_at', '>=', filters.updatedAfter])
  if (filters.updatedBefore) conditions.push(['updated_at', '<=', filters.updatedBefore])

  return conditions
}

/**
 * Get the sort column for timestamp-based sorting
 *
 * Returns null if the sort field is not a valid timestamp field.
 *
 * Usage:
 * ```typescript
 * const sortCol = getTimestampSortColumn(sort)
 * if (sortCol) query = query.orderBy(sortCol, sort.direction)
 * ```
 */
export function getTimestampSortColumn(sort?: SortOptions) {
  if (sort?.field === 'created_at') return 'created_at' as const
  if (sort?.field === 'updated_at') return 'updated_at' as const
  return null
}
