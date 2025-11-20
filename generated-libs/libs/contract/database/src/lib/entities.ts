import { Schema } from "effect";

/**
 * Database Domain Entities
 *
 * Defines domain entities using Schema.Class for runtime validation. Database types are imported from @custom-repo/types-database.
 *
 * @module @custom-repo/contract-database/entities
 */


/**
 * TODO: Customize for your domain:
 * 1. Add domain-specific fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add computed fields if needed
 * 4. Import database types (DatabaseSelect, etc.) from types-database
 */



// ============================================================================
// Type Aliases for Database Types
// ============================================================================

// Import database-generated types from types-database library

// DO NOT duplicate these definitions here


/**
 * Database ID type (UUID string)
 */
export type DatabaseId = string;

// TODO: Import actual database types when available:

// import type {

//   DatabaseSelect,

//   DatabaseInsert,

//   DatabaseUpdate,

// } from "@custom-repo/types-database";


// ============================================================================
// Domain Entities (Schema.Class)
// ============================================================================


/**
 * Database domain entity
 *
 * Uses Schema.Class for runtime validation and type safety.
 * This is separate from database types to allow domain-specific validation.
 */
export class Database extends Schema.Class<Database>("Database")({
  /** Unique identifier */
  id: Schema.UUID,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

  // TODO: Add domain-specific fields here
  // Example fields:
  //
  // /** Database name */
  // name: Schema.String.pipe(
  //   Schema.minLength(1),
  //   Schema.maxLength(255)
  // ),
  //
  // /** Database description */
  // description: Schema.optional(Schema.String),
  //
  // /** Database status */
  // status: Schema.Literal("draft", "active", "archived"),
  //
  // /** Owner user ID */
  // ownerId: Schema.UUID,
}) {}

// ============================================================================
// Helper Functions
// ============================================================================


/**
 * Parse Database from unknown data
 *
 * @example
 * ```typescript
 * const entity = yield* parseDatabase(unknownData);
 * ```
 */
export const parseDatabase = Schema.decodeUnknown(Database);

/**
 * Encode Database to plain object
 *
 * @example
 * ```typescript
 * const encoded = yield* encodeDatabase(entity);
 * ```
 */
export const encodeDatabase = Schema.encode(Database);
