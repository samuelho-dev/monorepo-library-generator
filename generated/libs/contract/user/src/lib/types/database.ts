/**
 * Database Entity Types
 *
 * Entity types generated from database schema.
 * These types are used throughout the contract library.
 *
 * Integration with prisma-effect-kysely:
 * - Run 'npx prisma generate' to update types from Prisma schema
 * - Types include: User, UserId, UserInsert, UserUpdate
 */

import { type Brand, Schema } from "effect";

// ============================================================================
// Branded ID Types
// ============================================================================

/**
 * Branded ID type for type-safe User identifiers
 *
 * Prevents accidental mixing of IDs from different entity types.
 */
export type UserId = string & Brand.Brand<"UserId">;

/**
 * UserId Schema for validation and parsing
 */
export const UserId = Schema.String.pipe(Schema.brand("UserId"));

// ============================================================================
// Entity Schema
// ============================================================================

/**
 * User entity schema
 *
 * Defines the structure of User records in the database.
 * Includes runtime validation via Effect Schema.
 */
export const User = Schema.Struct({
  id: UserId,
  name: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

/**
 * User entity type
 */
export type User = typeof User.Type;

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input type for creating new User entities
 *
 * Excludes auto-generated fields (id, createdAt, updatedAt)
 */
export type UserInsert = Omit<User, "id" | "createdAt" | "updatedAt">;

/**
 * Input type for updating existing User entities
 *
 * All fields are optional for partial updates
 */
export type UserUpdate = Partial<UserInsert>;
