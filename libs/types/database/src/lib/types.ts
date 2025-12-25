/**
 * Database Types (Placeholder)
 *
 * This file will be overwritten by prisma-effect-kysely generator.
 * Run: pnpm prisma generate
 *
 * These placeholder types allow downstream libraries to compile before
 * Prisma schema is configured. Replace with actual schema types.
 */

import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"

// ============================================================================
// Placeholder Entity Types (Replace with Prisma-generated types)
// ============================================================================

/**
 * User table interface (placeholder)
 *
 * Replace this with your actual Prisma model once schema is configured.
 */
export interface UserTable {
  id: Generated<string>
  email: string
  name: string | null
  createdAt: Generated<Date>
  updatedAt: Date
}

// Kysely operation types for User
export type User = Selectable<UserTable>
export type UserSelect = User
export type UserInsert = Insertable<UserTable>
export type UserUpdate = Updateable<UserTable>

// ============================================================================
// Database Interface
// ============================================================================

/**
 * DB interface - maps table names to table types
 *
 * prisma-effect-kysely will overwrite this with actual schema.
 */
export interface DB {
  user: UserTable
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type for JSON columns
 */
export type Json = ColumnType<unknown, string, string>
