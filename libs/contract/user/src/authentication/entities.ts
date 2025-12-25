import { Schema } from "effect"

/**
 * User Authentication Entities
 *
 * Domain entities specific to the authentication sub-module.

These entities are scoped to authentication operations within the user domain.
Import shared types from the parent contract when needed.
 *
 * @module @samuelho-dev/contract-user/authentication/entities
 */

/**
 * TODO: Customize for your authentication sub-module:
 * 1. Add authentication-specific entity fields
 * 2. Import shared types from parent contract if needed
 * 3. Add validation rules with Schema.pipe()
 * 4. Add Schema.annotations() for documentation
 */

// ============================================================================
// Authentication ID Type
// ============================================================================
/**
 * Authentication ID branded type
 */
export const AuthenticationId = Schema.String.pipe(
  Schema.brand("AuthenticationId"),
  Schema.annotations({
    identifier: "AuthenticationId",
    title: "Authentication ID",
    description: "Unique identifier for a authentication entity"
  })
)

export type AuthenticationId = Schema.Schema.Type<typeof AuthenticationId>
// ============================================================================
// Authentication Entity
// ============================================================================
/**
 * Authentication domain entity
 *
 * Part of the user domain, handles authentication-specific data.
 *
 * @identifier Authentication
 * @title Authentication Entity
 * @description Authentication entity within the user domain
 */
export class Authentication extends Schema.Class<Authentication>("Authentication")({
  /** Unique identifier */
  id: AuthenticationId,
  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,
  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,
  /** Parent user ID */
  userId: Schema.optional(Schema.UUID),
  /** Authentication name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "Authentication Name",
      description: "Name of this authentication"
    })
  ),
  /** Authentication status */
  status: Schema.Literal(
    "active",
    "inactive",
    "pending"
  )
  // TODO: Add authentication-specific fields
}) {}
// ============================================================================
// Authentication Item (for collections)
// ============================================================================
/**
 * Authentication item for list/collection operations
 *
 * Lightweight representation for authentication items
 *
 * @identifier AuthenticationItem
 * @title Authentication Item
 * @description Lightweight authentication item representation
 */
export class AuthenticationItem extends Schema.Class<AuthenticationItem>("AuthenticationItem")({
  /** Item identifier */
  id: Schema.UUID,
  /** Item name or label */
  name: Schema.String.pipe(Schema.minLength(1)),
  /** Item quantity (if applicable) */
  quantity: Schema.optional(Schema.Number.pipe(Schema.positive()))
  // TODO: Add authentication-specific item fields
}) {}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Parse Authentication from unknown data
 */
export const parseAuthentication = Schema.decodeUnknown(Authentication)

/**
 * Encode Authentication to plain object
 */
export const encodeAuthentication = Schema.encode(Authentication)

/**
 * Parse AuthenticationItem from unknown data
 */
export const parseAuthenticationItem = Schema.decodeUnknown(AuthenticationItem)