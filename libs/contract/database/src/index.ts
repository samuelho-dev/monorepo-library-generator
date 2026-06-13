/**
 * Database Contract Library
 *
 * Shared database error types and pagination types for all data-access layers.
 *
 * @module @samuelho-dev/contract-database
 */
export { CountFromDb } from './lib/count'
export { DatabaseError } from './lib/errors'
export type { PaginatedResult } from './lib/pagination'
export { PaginatedResponse, PaginationParams } from './lib/pagination'
