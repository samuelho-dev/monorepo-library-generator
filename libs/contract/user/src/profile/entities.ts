import { Schema } from "effect"

/**
 * User Profile Entities
 *
 * Domain entities specific to the profile sub-module.

These entities are scoped to profile operations within the user domain.
Import shared types from the parent contract when needed.
 *
 * @module @samuelho-dev/contract-user/profile/entities
 */

/**
 * TODO: Customize for your profile sub-module:
 * 1. Add profile-specific entity fields
 * 2. Import shared types from parent contract if needed
 * 3. Add validation rules with Schema.pipe()
 * 4. Add Schema.annotations() for documentation
 */

// ============================================================================
// Profile ID Type
// ============================================================================
/**
 * Profile ID branded type
 */
export const ProfileId = Schema.String.pipe(
  Schema.brand("ProfileId"),
  Schema.annotations({
    identifier: "ProfileId",
    title: "Profile ID",
    description: "Unique identifier for a profile entity"
  })
)

export type ProfileId = Schema.Schema.Type<typeof ProfileId>
// ============================================================================
// Profile Entity
// ============================================================================
/**
 * Profile domain entity
 *
 * Part of the user domain, handles profile-specific data.
 *
 * @identifier Profile
 * @title Profile Entity
 * @description Profile entity within the user domain
 */
export class Profile extends Schema.Class<Profile>("Profile")({
  /** Unique identifier */
  id: ProfileId,
  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,
  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,
  /** Parent user ID */
  userId: Schema.optional(Schema.UUID),
  /** Profile name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "Profile Name",
      description: "Name of this profile"
    })
  ),
  /** Profile status */
  status: Schema.Literal(
    "active",
    "inactive",
    "pending"
  )
  // TODO: Add profile-specific fields
}) {}
// ============================================================================
// Profile Item (for collections)
// ============================================================================
/**
 * Profile item for list/collection operations
 *
 * Lightweight representation for profile items
 *
 * @identifier ProfileItem
 * @title Profile Item
 * @description Lightweight profile item representation
 */
export class ProfileItem extends Schema.Class<ProfileItem>("ProfileItem")({
  /** Item identifier */
  id: Schema.UUID,
  /** Item name or label */
  name: Schema.String.pipe(Schema.minLength(1)),
  /** Item quantity (if applicable) */
  quantity: Schema.optional(Schema.Number.pipe(Schema.positive()))
  // TODO: Add profile-specific item fields
}) {}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Parse Profile from unknown data
 */
export const parseProfile = Schema.decodeUnknown(Profile)

/**
 * Encode Profile to plain object
 */
export const encodeProfile = Schema.encode(Profile)

/**
 * Parse ProfileItem from unknown data
 */
export const parseProfileItem = Schema.decodeUnknown(ProfileItem)
