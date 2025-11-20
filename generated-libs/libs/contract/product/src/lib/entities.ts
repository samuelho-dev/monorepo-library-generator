import { Schema } from "effect";

/**
 * Product Domain Entities
 *
 * Defines domain entities using Schema.Class for runtime validation. Database types are imported from @custom-repo/types-database.
 *
 * @module @custom-repo/contract-product/entities
 */


/**
 * TODO: Customize for your domain:
 * 1. Add domain-specific fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add computed fields if needed
 * 4. Import database types (ProductSelect, etc.) from types-database
 */



// ============================================================================
// Type Aliases for Database Types
// ============================================================================

// Import database-generated types from types-database library

// DO NOT duplicate these definitions here


/**
 * Product ID type (UUID string)
 */
export type ProductId = string;

// TODO: Import actual database types when available:

// import type {

//   ProductSelect,

//   ProductInsert,

//   ProductUpdate,

// } from "@custom-repo/types-database";


// ============================================================================
// Domain Entities (Schema.Class)
// ============================================================================


/**
 * Product domain entity
 *
 * Uses Schema.Class for runtime validation and type safety.
 * This is separate from database types to allow domain-specific validation.
 */
export class Product extends Schema.Class<Product>("Product")({
  /** Unique identifier */
  id: Schema.UUID,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

  // TODO: Add domain-specific fields here
  // Example fields:
  //
  // /** Product name */
  // name: Schema.String.pipe(
  //   Schema.minLength(1),
  //   Schema.maxLength(255)
  // ),
  //
  // /** Product description */
  // description: Schema.optional(Schema.String),
  //
  // /** Product status */
  // status: Schema.Literal("draft", "active", "archived"),
  //
  // /** Owner user ID */
  // ownerId: Schema.UUID,
}) {}

// ============================================================================
// Helper Functions
// ============================================================================


/**
 * Parse Product from unknown data
 *
 * @example
 * ```typescript
 * const entity = yield* parseProduct(unknownData);
 * ```
 */
export const parseProduct = Schema.decodeUnknown(Product);

/**
 * Encode Product to plain object
 *
 * @example
 * ```typescript
 * const encoded = yield* encodeProduct(entity);
 * ```
 */
export const encodeProduct = Schema.encode(Product);
